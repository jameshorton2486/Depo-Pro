"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';

import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
  autoPlay?: boolean;
}

export interface AudioPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setPlaybackRate: (rate: number) => void;
  getAudioElement: () => HTMLAudioElement | null;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ 
    src, 
    currentTime, 
    onTimeUpdate, 
    onDurationChange,
    onEnded,
    onPlay,
    onPause,
    className,
    autoPlay = false,
  }, ref) => {
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
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        seekTo: (time: number) => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
            setCurrentTimeState(audioRef.current.currentTime);
          }
        },
        play: () => audioRef.current?.play(),
        pause: () => audioRef.current?.pause(),
        toggle: () => {
          if (isPlaying) {
            audioRef.current?.pause();
          } else {
            audioRef.current?.play();
          }
        },
        getCurrentTime: () => audioRef.current?.currentTime ?? 0,
        getDuration: () => audioRef.current?.duration ?? 0,
        setPlaybackRate: (rate: number) => {
          if (audioRef.current) {
            audioRef.current.playbackRate = rate;
            setPlaybackRate(rate);
            localStorage.setItem('depo-pro-playback-rate', String(rate));
          }
        },
        getAudioElement: () => audioRef.current,
      }),
      [isPlaying, duration]
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
        const dur = audio.duration || 0;
        setDuration(dur);
        setIsLoaded(true);
        onDurationChange?.(dur);
      };

      const handlePlay = () => {
        setIsPlaying(true);
        onPlay?.();
      };
      const handlePause = () => {
        setIsPlaying(false);
        onPause?.();
      };
      const handleEnded = () => {
        setIsPlaying(false);
        onEnded?.();
      };
      const handleError = () => {
        setError('Failed to load audio');
        setIsLoaded(false);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }, [onTimeUpdate, onDurationChange, onEnded, onPlay, onPause]);

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

    const togglePlay = useCallback(() => {
      if (!audioRef.current) {
        return;
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        void audioRef.current.play();
      }
    }, [isPlaying]);

    const rewind = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
      }
    }, []);

    const skipForward = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
      }
    }, [duration]);

    // Load saved playback rate on mount
    useEffect(() => {
      const savedRate = localStorage.getItem('depo-pro-playback-rate');
      if (savedRate && audioRef.current) {
        const rate = parseFloat(savedRate);
        const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
        if (speedOptions.includes(rate)) {
          audioRef.current.playbackRate = rate;
          // Use setTimeout to avoid setState in effect warning
          setTimeout(() => setPlaybackRate(rate), 0);
        }
      }
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Only handle if not in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }

        switch (e.key) {
          case ' ':
            e.preventDefault();
            togglePlay();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            rewind();
            break;
          case 'ArrowRight':
            e.preventDefault();
            skipForward();
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, rewind, skipForward]);

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
      if (!Number.isFinite(seconds) || seconds < 0) {
        return '00:00';
      }
      
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

    if (error) {
      return (
        <div className={cn('flex items-center justify-center p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg', className)}>
          {error}
        </div>
      );
    }

    return (
      <div className={cn('flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg', className)}>
        <audio 
          ref={audioRef} 
          src={src} 
          preload="metadata" 
          autoPlay={autoPlay}
        />

        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Skip Back */}
          <button
            onClick={rewind}
            disabled={!isLoaded}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50"
            title="Skip back 5 seconds"
            aria-label="Skip back 5 seconds"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!isLoaded}
            className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {!isLoaded ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={skipForward}
            disabled={!isLoaded}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50"
            title="Skip forward 5 seconds"
            aria-label="Skip forward 5 seconds"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Time Display */}
          <span className="min-w-[90px] text-sm font-mono text-slate-600 dark:text-slate-300">
            {formatTime(currentTimeState)} / {formatTime(duration)}
          </span>

          {/* Progress Bar */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer relative group"
            role="slider"
            aria-label="Audio progress"
            aria-valuenow={currentTimeState}
            aria-valuemin={0}
            aria-valuemax={duration}
          >
            <div
              className="h-full bg-blue-600 rounded-full transition-all relative"
              style={{ width: duration > 0 ? `${(currentTimeState / duration) * 100}%` : '0%' }}
            >
              {/* Thumb */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
            </div>
          </div>

          {/* Playback Speed */}
          <button
            onClick={() => {
              const currentIndex = speedOptions.indexOf(playbackRate);
              const nextIndex = (currentIndex + 1) % speedOptions.length;
              const newRate = speedOptions[nextIndex];
              if (audioRef.current) {
                audioRef.current.playbackRate = newRate;
                setPlaybackRate(newRate);
                localStorage.setItem('depo-pro-playback-rate', String(newRate));
              }
            }}
            className="px-2 py-1 text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors min-w-[50px]"
            title="Change playback speed"
            aria-label={`Playback speed: ${playbackRate}x`}
          >
            {playbackRate}x
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (audioRef.current) {
                  if (isMuted) {
                    audioRef.current.volume = volume || 1;
                    setIsMuted(false);
                  } else {
                    audioRef.current.volume = 0;
                    setIsMuted(true);
                  }
                }
              }}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(event) => {
                const val = parseFloat(event.target.value);
                setVolume(val);
                if (audioRef.current) {
                  audioRef.current.volume = val;
                }
                setIsMuted(val === 0);
              }}
              className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';
