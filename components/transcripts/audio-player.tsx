"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  className?: string;
}

export interface AudioPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ src, currentTime, onTimeUpdate, className }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const isSyncingRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTimeState, setCurrentTimeState] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLoaded, setIsLoaded] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        seekTo: (time: number) => {
          if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTimeState(time);
          }
        },
        play: () => audioRef.current?.play(),
        pause: () => audioRef.current?.pause(),
      }),
      []
    );

    useEffect(() => {
      if (currentTime !== undefined && audioRef.current) {
        // Only update audio element if externally controlled and difference is significant
        if (Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
          isSyncingRef.current = true;
          audioRef.current.currentTime = currentTime;
          // Reset flag after a short delay
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 100);
        }
      }
      // State will be updated by handleTimeUpdate callback
    }, [currentTime]);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      const handleTimeUpdate = () => {
        if (!isSyncingRef.current) {
          setCurrentTimeState(audio.currentTime);
          onTimeUpdate?.(audio.currentTime);
        }
      };

      const handleLoadedMetadata = () => {
        setDuration(audio.duration || 0);
        setIsLoaded(true);
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }, [onTimeUpdate]);

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
      }
    }, [playbackRate]);

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
      }
    }, [volume, isMuted]);

    const togglePlay = () => {
      if (!audioRef.current) {
        return;
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        void audioRef.current.play();
      }
    };

    const rewind = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
      }
    };

    const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !audioRef.current || !duration) {
        return;
      }
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (event.clientX - rect.left) / rect.width;
      const newTime = Math.max(0, Math.min(percent * duration, duration));
      audioRef.current.currentTime = newTime;
      setCurrentTimeState(newTime);
    };

    const formatTime = (seconds: number): string => {
      if (!Number.isFinite(seconds)) {
        return '0:00';
      }
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, '0');
      return `${mins}:${secs}`;
    };

    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

    return (
      <div className={cn('rounded-lg bg-slate-900 p-4 text-white', className)}>
        <audio ref={audioRef} src={src} preload="metadata" />

        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={rewind}
            disabled={!isLoaded}
            className="text-slate-400 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlay}
            disabled={!isLoaded}
            className="text-white hover:bg-slate-800"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <span className="min-w-[90px] text-sm text-slate-400">
            {formatTime(currentTimeState)} / {formatTime(duration)}
          </span>

          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="group relative h-2 flex-1 cursor-pointer rounded-full bg-slate-700"
          >
            <div
              className="h-full rounded-full bg-blue-500 transition-colors group-hover:bg-blue-400"
              style={{ width: duration ? `${(currentTimeState / duration) * 100}%` : '0%' }}
            >
              <div className="absolute -right-1 top-1/2 hidden h-3 w-3 -translate-y-1/2 rounded-full bg-white group-hover:block" />
            </div>
          </div>

          <select
            value={playbackRate}
            onChange={(event) => setPlaybackRate(parseFloat(event.target.value))}
            className="rounded border-none bg-slate-800 px-2 py-1 text-sm text-slate-300"
          >
            {speedOptions.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted((prev) => !prev)}
            className="text-slate-400 hover:text-white"
          >
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(event) => {
              const val = parseFloat(event.target.value);
              setVolume(val);
              if (val > 0) {
                setIsMuted(false);
              }
            }}
            className="w-20 accent-blue-500"
          />
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';
