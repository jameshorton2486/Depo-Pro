'use client';

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED AUDIO PLAYER
// Professional audio player with precise timestamp sync for legal review
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface EnhancedAudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onSeekRequest?: (time: number) => void;
  seekToTime?: number;
  className?: string;
  showWaveform?: boolean;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SKIP_SECONDS = 5;

export function EnhancedAudioPlayer({
  src,
  onTimeUpdate,
  seekToTime,
  className,
}: EnhancedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle external seek requests
  useEffect(() => {
    if (seekToTime !== undefined && audioRef.current) {
      const targetTime = Math.max(0, seekToTime - 2); // 2 second lead-in for context
      audioRef.current.currentTime = targetTime;
      if (!isPlaying) {
        audioRef.current.play().catch(() => {
          // Ignore play errors (user interaction required)
        });
        setIsPlaying(true);
      }
    }
  }, [seekToTime, isPlaying]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [onTimeUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'BracketLeft':
          e.preventDefault();
          decreaseSpeed();
          break;
        case 'BracketRight':
          e.preventDefault();
          increaseSpeed();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, playbackRate]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        // Ignore play errors
      });
    }
    setIsPlaying(!isPlaying);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, currentTime - SKIP_SECONDS);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, currentTime + SKIP_SECONDS);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSpeedChange = (value: string) => {
    const speed = parseFloat(value);
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const decreaseSpeed = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate);
    if (currentIndex > 0) {
      handleSpeedChange(PLAYBACK_SPEEDS[currentIndex - 1].toString());
    }
  };

  const increaseSpeed = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate);
    if (currentIndex < PLAYBACK_SPEEDS.length - 1) {
      handleSpeedChange(PLAYBACK_SPEEDS[currentIndex + 1].toString());
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={cn('bg-destructive/10 rounded-lg p-4 text-center', className)}>
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('bg-slate-900 rounded-lg p-4', className)}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Progress Bar */}
      <div
        ref={progressRef}
        className="relative h-2 bg-slate-700 rounded-full cursor-pointer mb-4 group"
        onClick={handleProgressClick}
      >
        <div
          className="absolute h-full bg-primary rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute w-4 h-4 bg-white rounded-full -top-1 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Time Display */}
      <div className="flex justify-between text-sm text-slate-400 mb-4">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipBackward}
            className="text-white hover:bg-slate-800"
            title="Skip back 5s (←)"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="h-12 w-12 rounded-full"
            title="Play/Pause (Space)"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={skipForward}
            className="text-white hover:bg-slate-800"
            title="Skip forward 5s (→)"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-slate-400" />
          <Select value={playbackRate.toString()} onValueChange={handleSpeedChange}>
            <SelectTrigger className="w-20 h-8 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBACK_SPEEDS.map((speed) => (
                <SelectItem key={speed} value={speed.toString()}>
                  {speed}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2 w-32">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="text-white hover:bg-slate-800"
            title="Mute (M)"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500 flex flex-wrap gap-4">
        <span>Space: Play/Pause</span>
        <span>←/→: Skip 5s</span>
        <span>[/]: Speed</span>
        <span>M: Mute</span>
      </div>
    </div>
  );
}

export default EnhancedAudioPlayer;
