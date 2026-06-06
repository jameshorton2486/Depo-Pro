import type React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useAudio } from "../../context/AudioContext";
import { useDocument } from "../../context/DocumentContext";
import { shouldRefreshMediaUrl } from "./mediaRefreshThrottle";

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const USE_REAL_EDITOR_API = import.meta.env.VITE_USE_REAL_API === "1";

type WaveSurferWithMediaElement = WaveSurfer & {
  getMediaElement?: () => HTMLMediaElement | null;
};

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function AudioPlayer({ mediaUrl, duration: docDuration }: {
  mediaUrl: string;
  duration: number;
}) {
  const waveRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const audio = useAudio();
  const { refreshMediaUrl } = useDocument();

  const [speedIdx, setSpeedIdx] = useState(2); // default 1.0×
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [wsDuration, setWsDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const refreshAttemptAtRef = useRef<number | null>(null);
  const recoveringRef = useRef(false);
  const lastMediaUrlRef = useRef(mediaUrl);
  const playingRef = useRef(audio.playing);

  useEffect(() => {
    lastMediaUrlRef.current = mediaUrl;
  }, [mediaUrl]);

  useEffect(() => {
    playingRef.current = audio.playing;
  }, [audio.playing]);

  // RAF tick: keeps displayTime + currentTimeRef in sync during playback.
  // Lives here (in the player) so it can read wsRef.current.getCurrentTime().
  const rafRef = useRef<number>(0);
  const tickRef = useRef<() => void>();
  tickRef.current = () => {
    if (wsRef.current) {
      const t = wsRef.current.getCurrentTime();
      audio.updateCurrentTime(t);
      setDisplayTime(t);
    }
    rafRef.current = requestAnimationFrame(() => tickRef.current!());
  };

  useEffect(() => {
    if (!waveRef.current) return;

    const ws = WaveSurfer.create({
      container: waveRef.current,
      waveColor: "#94a3b8",
      progressColor: "#1d4ed8",
      cursorColor: "#1d4ed8",
      height: 52,
      barWidth: 2,
      barGap: 1,
      normalize: true,
      interact: true,
    });

    wsRef.current = ws;

    const handleRecoverableError = async () => {
      if (!USE_REAL_EDITOR_API) {
        return;
      }

      if (recoveringRef.current) {
        setAudioError("Audio unavailable.");
        return;
      }

      const now = Date.now();
      if (!shouldRefreshMediaUrl(refreshAttemptAtRef.current, now)) {
        setAudioError("Audio unavailable.");
        return;
      }

      recoveringRef.current = true;
      refreshAttemptAtRef.current = now;
      setAudioError(null);

      const currentTime = ws.getCurrentTime();
      const wasPlaying = playingRef.current;

      try {
        const nextMediaUrl = await refreshMediaUrl();
        if (!nextMediaUrl || nextMediaUrl === lastMediaUrlRef.current) {
          setAudioError("Audio unavailable.");
          return;
        }

        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const cleanup = () => {
            ws.un("ready", onReady);
            ws.un("error", onError);
          };
          const onReady = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve();
          };
          const onError = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error("refreshed media url failed"));
          };

          ws.on("ready", onReady);
          ws.on("error", onError);
          ws.load(nextMediaUrl);
        });

        const refreshedDuration = ws.getDuration();
        setWsDuration(refreshedDuration);
        audio.setDuration(refreshedDuration);
        const boundedTime = Math.max(0, Math.min(currentTime, refreshedDuration || currentTime));
        if (refreshedDuration > 0) {
          ws.seekTo(boundedTime / refreshedDuration);
        }
        audio.updateCurrentTime(boundedTime);
        setDisplayTime(boundedTime);
        if (wasPlaying) {
          await ws.play();
        }
      } catch {
        setAudioError("Audio unavailable.");
      } finally {
        recoveringRef.current = false;
      }
    };

    ws.on("ready", () => {
      const dur = ws.getDuration();
      setWsDuration(dur);
      audio.setDuration(dur);
      setReady(true);
      setAudioError(null);

      // Register absolute-seconds seek + play/pause so the rest of the app
      // can control WaveSurfer without knowing about it.
      audio.registerControls({
        seek: (t: number) => {
          const d = ws.getDuration();
          if (d > 0) ws.seekTo(Math.max(0, Math.min(t / d, 1)));
        },
        play: () => ws.play(),
        pause: () => ws.pause(),
      });
    });

    ws.on("play", () => {
      audio.setPlaying(true);
      rafRef.current = requestAnimationFrame(() => tickRef.current!());
    });

    ws.on("pause", () => {
      audio.setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    });

    ws.on("finish", () => {
      audio.setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    });

    ws.on("error", () => {
      void handleRecoverableError();
    });

    // Also update time on waveform seek (user drags the waveform)
    ws.on("seeking", (t) => {
      audio.updateCurrentTime(t);
      setDisplayTime(t);
    });

    const mediaElement = (ws as WaveSurferWithMediaElement).getMediaElement?.() ?? null;
    const handleMediaElementError = () => {
      void handleRecoverableError();
    };
    mediaElement?.addEventListener("error", handleMediaElementError);

    ws.load(mediaUrl);

    return () => {
      cancelAnimationFrame(rafRef.current);
      mediaElement?.removeEventListener("error", handleMediaElementError);
      ws.destroy();
      wsRef.current = null;
    };
  }, [mediaUrl, refreshMediaUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(() => {
    wsRef.current?.playPause();
  }, []);

  const skip = useCallback((secs: number) => {
    const ws = wsRef.current;
    if (!ws || !ready) return;
    const d = ws.getDuration();
    const next = Math.max(0, Math.min(ws.getCurrentTime() + secs, d));
    if (d > 0) ws.seekTo(next / d);
  }, [ready]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    wsRef.current?.setPlaybackRate(SPEEDS[next]);
  }, [speedIdx]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    wsRef.current?.setVolume(v);
    if (v > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      wsRef.current?.setVolume(next ? 0 : volume);
      return next;
    });
  }, [volume]);

  const shownDuration = wsDuration || docDuration;

  return (
    <div className="audio-player-bar">
      {/* Waveform */}
      <div ref={waveRef} className="audio-waveform" />

      {/* Controls */}
      <div className="audio-controls">
        {/* Timestamp */}
        <span className="audio-time">
          {formatTime(displayTime)}{" "}
          <span className="text-slate-400">/</span>{" "}
          {formatTime(shownDuration)}
        </span>

        {/* Transport */}
        <button
          onClick={() => skip(-5)}
          disabled={!ready}
          className="audio-btn"
          title="Back 5 s (←)"
        >
          <SkipBack size={15} />
        </button>

        <button
          onClick={togglePlay}
          disabled={!ready}
          className="audio-play-btn"
          title={audio.playing ? "Pause (Space)" : "Play (Space)"}
        >
          {audio.playing ? <Pause size={13} /> : <Play size={13} />}
        </button>

        <button
          onClick={() => skip(5)}
          disabled={!ready}
          className="audio-btn"
          title="Forward 5 s (→)"
        >
          <SkipForward size={15} />
        </button>

        {/* Speed */}
        <button onClick={cycleSpeed} className="audio-speed-btn" title="Cycle playback speed">
          {SPEEDS[speedIdx]}×
        </button>

        {/* Volume */}
        <div className="audio-volume">
          <button onClick={toggleMute} className="audio-btn">
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="audio-volume-slider"
          />
        </div>

        {!ready && (
          <span className="text-xs text-slate-400 ml-2">Loading audio…</span>
        )}
        {audioError && (
          <span className="text-xs text-rose-600 ml-2">{audioError}</span>
        )}
      </div>
    </div>
  );
}
