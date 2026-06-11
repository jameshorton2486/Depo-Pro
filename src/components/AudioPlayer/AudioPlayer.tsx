import type React from "react";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

import type { WorkspaceAudioSegment } from "../../api/workspaceService";
import { useAudio } from "../../context/AudioContext";
import { useDocument } from "../../context/DocumentContext";
import { isRealApiMode } from "../../lib/runtime/mode";
import { shouldRefreshMediaUrl } from "./mediaRefreshThrottle";

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

type WaveSurferWithMediaElement = WaveSurfer & {
  getMediaElement?: () => HTMLMediaElement | null;
};

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function buildSegments(
  mediaUrl: string,
  duration: number,
  audioSegments: WorkspaceAudioSegment[],
): WorkspaceAudioSegment[] {
  if (audioSegments.length > 0) {
    return audioSegments;
  }

  return [{
    sourceIndex: 0,
    sourceFilename: "Source 1",
    startOffsetSeconds: 0,
    durationSeconds: duration,
    mediaUrl,
  }];
}

function resolveSegmentTarget(segments: WorkspaceAudioSegment[], absoluteSeconds: number) {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (absoluteSeconds >= segment.startOffsetSeconds) {
      return {
        segmentIndex: index,
        localSeconds: Math.max(0, absoluteSeconds - segment.startOffsetSeconds),
      };
    }
  }

  return {
    segmentIndex: 0,
    localSeconds: Math.max(0, absoluteSeconds),
  };
}

export function AudioPlayer({
  mediaUrl,
  duration: docDuration,
  audioSegments,
}: {
  mediaUrl: string;
  duration: number;
  audioSegments: WorkspaceAudioSegment[];
}) {
  const waveRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const audio = useAudio();
  const { refreshMediaUrl } = useDocument();

  const [speedIdx, setSpeedIdx] = useState(2);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [wsDuration, setWsDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const refreshAttemptAtRef = useRef<number | null>(null);
  const recoveringRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);
  const lastMediaUrlRef = useRef(mediaUrl);
  const playingRef = useRef(audio.playing);
  const audioRef = useRef(audio);

  const segments = useMemo(
    () => buildSegments(mediaUrl, docDuration, audioSegments),
    [mediaUrl, docDuration, audioSegments]
  );
  const safeSegmentIndex = Math.min(activeSegmentIndex, Math.max(segments.length - 1, 0));
  const activeSegment = segments[safeSegmentIndex];
  const resolvedMediaUrl = activeSegment?.mediaUrl || mediaUrl;
  const activeSegmentRef = useRef(activeSegment);
  const segmentsRef = useRef(segments);
  const safeSegmentIndexRef = useRef(safeSegmentIndex);
  const refreshMediaUrlRef = useRef(refreshMediaUrl);

  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  useEffect(() => {
    lastMediaUrlRef.current = resolvedMediaUrl;
  }, [resolvedMediaUrl]);

  useEffect(() => {
    playingRef.current = audio.playing;
  }, [audio.playing]);

  useEffect(() => {
    activeSegmentRef.current = activeSegment;
  }, [activeSegment]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    safeSegmentIndexRef.current = safeSegmentIndex;
  }, [safeSegmentIndex]);

  useEffect(() => {
    refreshMediaUrlRef.current = refreshMediaUrl;
  }, [refreshMediaUrl]);

  useEffect(() => {
    if (safeSegmentIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(safeSegmentIndex);
    }
  }, [activeSegmentIndex, safeSegmentIndex]);

  const rafRef = useRef<number>(0);
  const tickRef = useRef<() => void>();
  tickRef.current = () => {
    if (wsRef.current) {
      const localTime = wsRef.current.getCurrentTime();
      const absoluteTime = (activeSegment?.startOffsetSeconds ?? 0) + localTime;
      audioRef.current.updateCurrentTime(absoluteTime);
      setDisplayTime(absoluteTime);
    }
    rafRef.current = requestAnimationFrame(() => tickRef.current!());
  };

  const seekAbsolute = useCallback((absoluteSeconds: number, autoplay: boolean) => {
    const target = resolveSegmentTarget(segments, absoluteSeconds);
    if (target.segmentIndex !== safeSegmentIndex) {
      pendingSeekRef.current = target.localSeconds;
      pendingPlayRef.current = autoplay;
      setActiveSegmentIndex(target.segmentIndex);
      audioRef.current.updateCurrentTime(absoluteSeconds);
      setDisplayTime(absoluteSeconds);
      return;
    }

    const ws = wsRef.current;
    const duration = ws?.getDuration() ?? 0;
    if (ws && duration > 0) {
      ws.seekTo(Math.max(0, Math.min(target.localSeconds / duration, 1)));
    }
    audioRef.current.updateCurrentTime(absoluteSeconds);
    setDisplayTime(absoluteSeconds);
    if (autoplay) {
      void ws?.play();
    }
  }, [safeSegmentIndex, segments]);
  const seekAbsoluteRef = useRef(seekAbsolute);

  useEffect(() => {
    seekAbsoluteRef.current = seekAbsolute;
  }, [seekAbsolute]);

  useEffect(() => {
    if (!waveRef.current) {
      return;
    }

    setReady(false);
    setAudioError(null);

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
      if (!isRealApiMode()) {
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
        const nextMediaUrl = await refreshMediaUrlRef.current(safeSegmentIndexRef.current);
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
            if (settled) {
              return;
            }
            settled = true;
            cleanup();
            resolve();
          };
          const onError = () => {
            if (settled) {
              return;
            }
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
        audioRef.current.setDuration(refreshedDuration);
        const boundedTime = Math.max(0, Math.min(currentTime, refreshedDuration || currentTime));
        if (refreshedDuration > 0) {
          ws.seekTo(boundedTime / refreshedDuration);
        }
        const absoluteTime = (activeSegmentRef.current?.startOffsetSeconds ?? 0) + boundedTime;
        audioRef.current.updateCurrentTime(absoluteTime);
        setDisplayTime(absoluteTime);
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
      const duration = ws.getDuration();
      setWsDuration(duration);
      audioRef.current.setDuration(duration);
      setReady(true);
      setAudioError(null);

      const pendingSeek = pendingSeekRef.current;
      if (pendingSeek != null && duration > 0) {
        ws.seekTo(Math.max(0, Math.min(pendingSeek / duration, 1)));
      }
      const localTime = pendingSeek ?? ws.getCurrentTime();
      const absoluteTime = (activeSegmentRef.current?.startOffsetSeconds ?? 0) + localTime;
      audioRef.current.updateCurrentTime(absoluteTime);
      setDisplayTime(absoluteTime);
      pendingSeekRef.current = null;

      audioRef.current.registerControls({
        seek: (absoluteSeconds: number) => {
          seekAbsoluteRef.current(absoluteSeconds, false);
        },
        play: () => {
          pendingPlayRef.current = false;
          void ws.play();
        },
        pause: () => ws.pause(),
      });

      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        void ws.play();
      }
    });

    ws.on("play", () => {
      audioRef.current.setPlaying(true);
      rafRef.current = requestAnimationFrame(() => tickRef.current!());
    });

    ws.on("pause", () => {
      audioRef.current.setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    });

    ws.on("finish", () => {
      if (safeSegmentIndexRef.current < segmentsRef.current.length - 1) {
        pendingSeekRef.current = 0;
        pendingPlayRef.current = true;
        setActiveSegmentIndex(safeSegmentIndexRef.current + 1);
        return;
      }

      audioRef.current.setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    });

    ws.on("error", () => {
      void handleRecoverableError();
    });

    ws.on("seeking", (localTime) => {
      const absoluteTime = (activeSegmentRef.current?.startOffsetSeconds ?? 0) + localTime;
      audioRef.current.updateCurrentTime(absoluteTime);
      setDisplayTime(absoluteTime);
    });

    const mediaElement = (ws as WaveSurferWithMediaElement).getMediaElement?.() ?? null;
    const handleMediaElementError = () => {
      void handleRecoverableError();
    };
    mediaElement?.addEventListener("error", handleMediaElementError);

    ws.load(resolvedMediaUrl);

    return () => {
      cancelAnimationFrame(rafRef.current);
      mediaElement?.removeEventListener("error", handleMediaElementError);
      ws.destroy();
      wsRef.current = null;
    };
  }, [resolvedMediaUrl]);

  const togglePlay = useCallback(() => {
    wsRef.current?.playPause();
  }, []);

  const skip = useCallback((seconds: number) => {
    seekAbsolute(Math.max(0, displayTime + seconds), false);
  }, [displayTime, seekAbsolute]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    wsRef.current?.setPlaybackRate(SPEEDS[next]);
  }, [speedIdx]);

  const handleVolume = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number.parseFloat(event.target.value);
    setVolume(nextVolume);
    wsRef.current?.setVolume(nextVolume);
    if (nextVolume > 0) {
      setMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const nextMuted = !current;
      wsRef.current?.setVolume(nextMuted ? 0 : volume);
      return nextMuted;
    });
  }, [volume]);

  const shownDuration = segments.length > 0
    ? segments[segments.length - 1].startOffsetSeconds + segments[segments.length - 1].durationSeconds
    : (wsDuration || docDuration);

  return (
    <div className="audio-player-bar">
      <div ref={waveRef} className="audio-waveform" />

      <div className="audio-controls">
        <span className="audio-time">
          {formatTime(displayTime)} <span className="text-slate-400">/</span> {formatTime(shownDuration)}
        </span>
        {segments.length > 1 && activeSegment && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {activeSegment.sourceFilename}
          </span>
        )}

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

        <button onClick={cycleSpeed} className="audio-speed-btn" title="Cycle playback speed">
          {SPEEDS[speedIdx]}×
        </button>

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
          <span className="ml-2 text-xs text-slate-400">Loading audio…</span>
        )}
        {audioError && (
          <span className="ml-2 text-xs text-rose-600">{audioError}</span>
        )}
      </div>
    </div>
  );
}
