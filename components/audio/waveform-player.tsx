'use client';

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import WaveSurfer from 'wavesurfer.js';

export interface WaveformPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
}

interface WaveformPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  onReady?: (duration: number) => void;
  initialTime?: number;
}

export const WaveformPlayer = forwardRef<WaveformPlayerRef, WaveformPlayerProps>(({
  audioUrl,
  onTimeUpdate,
  onReady,
  initialTime = 0,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    let mounted = true;
    setIsLoading(true);
    setIsReady(false);

    // WaveSurfer requires hex colors, so we use HSL converted to hex
    // These match our design system: slate-500, blue-500, red-500
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#64748b',      // slate-500 (muted)
      progressColor: '#3b82f6',  // blue-500 (primary)
      cursorColor: '#ef4444',    // red-500 (destructive)
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      backend: 'WebAudio',
    });

    ws.load(audioUrl);

    ws.on('ready', () => {
      if (!mounted) return;
      setDuration(ws.getDuration());
      setIsReady(true);
      setIsLoading(false);
      onReady?.(ws.getDuration());
      if (initialTime > 0) {
        ws.seekTo(initialTime / ws.getDuration());
      }
    });

    ws.on('audioprocess', () => {
      const time = ws.getCurrentTime();
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    ws.on('seeking', () => {
      const time = ws.getCurrentTime();
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    ws.on('error', (err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!mounted) return;
      console.error('WaveSurfer error:', err);
      setIsLoading(false);
    });

    wavesurferRef.current = ws;

    return () => {
      mounted = false;
      try {
        ws.destroy();
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') console.error('WaveSurfer destroy:', e);
      }
    };
  }, [audioUrl, initialTime, onReady, onTimeUpdate]);

  // Seek to specific time (called from transcript clicks)
  const seekTo = useCallback((time: number) => {
    if (wavesurferRef.current && isReady) {
      const dur = wavesurferRef.current.getDuration();
      if (dur > 0) {
        wavesurferRef.current.seekTo(Math.min(time / dur, 1));
      }
    }
  }, [isReady]);

  // Playback controls
  const togglePlay = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const skip = useCallback((seconds: number) => {
    if (wavesurferRef.current) {
      const current = wavesurferRef.current.getCurrentTime();
      const dur = wavesurferRef.current.getDuration();
      const newTime = Math.max(0, Math.min(current + seconds, dur));
      wavesurferRef.current.seekTo(newTime / dur);
    }
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(rate);
      setPlaybackRate(rate);
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    seekTo,
    play: () => wavesurferRef.current?.play(),
    pause: () => wavesurferRef.current?.pause(),
    togglePlay,
  }), [seekTo, togglePlay]);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(e.shiftKey ? -10 : -5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(e.shiftKey ? 10 : 5);
          break;
        case '[':
          e.preventDefault();
          changePlaybackRate(Math.max(0.5, playbackRate - 0.25));
          break;
        case ']':
          e.preventDefault();
          changePlaybackRate(Math.min(2, playbackRate + 0.25));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, changePlaybackRate, playbackRate]);

  // Expose seekTo for parent components via global function
  useEffect(() => {
    (window as any).depoProSeekTo = seekTo;
    return () => {
      delete (window as any).depoProSeekTo;
    };
  }, [seekTo]);

  return (
    <div className="bg-slate-900 rounded-lg p-4 space-y-3">
      {/* Waveform Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 rounded">
            <div className="text-slate-400 text-sm">Loading audio...</div>
          </div>
        )}
        <div 
          ref={containerRef} 
          className="w-full rounded cursor-pointer"
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Time Display */}
        <div className="text-sm font-mono text-slate-300 min-w-[100px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-5)}
            disabled={!isReady}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-50"
            title="Back 5s (←)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            disabled={!isReady}
            className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            title="Play/Pause (Space)"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => skip(5)}
            disabled={!isReady}
            className="p-2 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-50"
            title="Forward 5s (→)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2 min-w-[120px] justify-end">
          <span className="text-xs text-slate-400">Speed:</span>
          <select
            value={playbackRate}
            onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
            disabled={!isReady}
            className="bg-slate-800 text-slate-300 text-sm rounded px-2 py-1 border border-slate-700 disabled:opacity-50"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="text-xs text-slate-500 text-center">
        Space: Play/Pause | ←/→: Skip 5s | Shift+←/→: Skip 10s | [/]: Speed
      </div>
    </div>
  );
});

WaveformPlayer.displayName = 'WaveformPlayer';
