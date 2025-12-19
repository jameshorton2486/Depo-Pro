# CURSOR PROMPT: Audio Player Component (ENHANCED)

**Document 3 of 5** | **Copy this entire file into Cursor**  
**Updated with react-h5-audio-player option and exact keyboard shortcuts from Scope v2**

---

## OPTION A: Use react-h5-audio-player (Quick MVP)

Your Open Source Strategy recommends this for MVP:
```bash
npm install react-h5-audio-player
```

Then wrap it with external control:
```tsx
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

// Expose ref methods for transcript sync
const audioRef = useRef<{ audio: { current: HTMLAudioElement } }>(null);

<AudioPlayer
  ref={audioRef}
  src={audioUrl}
  onListen={(e) => onTimeUpdate(e.target.currentTime)}
  customAdditionalControls={[/* speed selector */]}
/>
```

## OPTION B: Build Custom (Full Control)

If you need more control, use the prompt below.

---

## PROMPT FOR CURSOR AI

```
@workspace Create a professional audio player component for this Next.js project. This will be used for legal transcription review where users need to listen to depositions while reviewing transcripts.

## CONTEXT

This is Depo-Pro, a legal transcription SaaS. The audio player needs to:
1. Play deposition audio files (30 min to 4 hours long)
2. Sync with transcript text (clicking words seeks audio)
3. Support external control via React ref
4. Be styled with Tailwind CSS (dark theme friendly)

## KEYBOARD SHORTCUTS (From Depo-Pro Scope v2 - EXACT)

| Key | Action |
|-----|--------|
| **Space** | Play/Pause audio |
| **↑** | Navigate to previous flagged word (handled by parent) |
| **↓** | Navigate to next flagged word (handled by parent) |
| **←** | Skip back 5 seconds |
| **→** | Skip forward 5 seconds |
| **R** | Replay current word (seek to timestamp - 2 seconds) |
| **Enter** | Confirm edit (handled by parent) |

## FILES TO CREATE

### 1. components/transcripts/audio-player.tsx

Create a new audio player component with these features:

**Controls:**
- Play/Pause button (large, prominent)
- Progress bar (clickable to seek)
- Current time / Duration display (format: mm:ss or hh:mm:ss)
- Playback speed selector (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- Volume control (slider)
- Skip back 5 seconds button
- Skip forward 5 seconds button

**External Control Interface:**
```typescript
interface AudioPlayerProps {
  src: string;                              // Audio file URL
  onTimeUpdate?: (currentTime: number) => void;  // Called during playback
  onDurationChange?: (duration: number) => void; // Called when audio loads
  onEnded?: () => void;                     // Called when audio ends
  className?: string;
}

// Expose these methods via ref:
interface AudioPlayerRef {
  seekTo: (timeInSeconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setPlaybackRate: (rate: number) => void;
}
```

**Usage Example:**
```tsx
const audioRef = useRef<AudioPlayerRef>(null);

// From transcript component:
function handleWordClick(word: { start: number }) {
  audioRef.current?.seekTo(word.start - 1.5); // 1.5s before for context
  audioRef.current?.play();
}

return (
  <AudioPlayer
    ref={audioRef}
    src={audioUrl}
    onTimeUpdate={(time) => setCurrentTime(time)}
  />
);
```

### 2. hooks/useAudioPlayer.ts (Optional)

If useful, create a custom hook that encapsulates audio state:

```typescript
interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
}
```

## DESIGN REQUIREMENTS

**Visual Style:**
- Compact, professional appearance
- Dark theme compatible (use Tailwind dark: classes)
- Rounded corners, subtle shadows
- Clear visual feedback for interactions
- Loading state while audio loads
- Error state if audio fails to load

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  ⏪5s  ▶  ⏩5s  │  00:23 / 45:12  │ ━━━━●━━━━━━━━━ │ [1x ▼] 🔊 │
└──────────────────────────────────────────────────────────────┘
```

Alternative compact layout:
```
┌─────────────────────────────────────────────────────────────────┐
│  ▶ ━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━  02:34 / 45:12    1.0x  🔊━ │
└─────────────────────────────────────────────────────────────────┘
```

**Accessibility:**
- Keyboard controls: Space = play/pause, Left/Right = seek
- ARIA labels for all buttons
- Focus indicators
- Screen reader announcements for time updates (throttled)

## IMPLEMENTATION NOTES

1. Use HTML5 `<audio>` element under the hood
2. Use `useImperativeHandle` to expose ref methods
3. Format time with `formatTime(seconds)` utility
4. Throttle `onTimeUpdate` to avoid excessive re-renders (every 100-200ms)
5. Store playback rate in localStorage to persist user preference
6. Handle audio loading errors gracefully

## STYLING

Use these Tailwind classes as a starting point:
```tsx
// Container
"flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"

// Play button
"w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full"

// Progress bar container
"flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer"

// Progress bar fill
"h-full bg-blue-600 rounded-full transition-all"

// Time display
"text-sm font-mono text-slate-600 dark:text-slate-300"

// Speed selector
"px-2 py-1 text-sm bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
```

## ICONS

Use Lucide React icons (already installed):
```tsx
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
```

Please implement this component with full TypeScript types.
```

---

## EXPECTED OUTPUT

### components/transcripts/audio-player.tsx

```tsx
'use client';

import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
  autoPlay?: boolean;
}

export interface AudioPlayerRef {
  seekTo: (timeInSeconds: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setPlaybackRate: (rate: number) => void;
  getAudioElement: () => HTMLAudioElement | null;
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  function AudioPlayer(
    {
      src,
      onTimeUpdate,
      onDurationChange,
      onEnded,
      onPlay,
      onPause,
      className = '',
      autoPlay = false,
    },
    ref
  ) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ═══════════════════════════════════════════════════════════
    // IMPERATIVE HANDLE (External Control)
    // ═══════════════════════════════════════════════════════════

    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
        }
      },
      play: () => {
        audioRef.current?.play();
      },
      pause: () => {
        audioRef.current?.pause();
      },
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
        }
      },
      getAudioElement: () => audioRef.current,
    }));

    // ═══════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════

    const handleTimeUpdate = useCallback(() => {
      if (audioRef.current) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        onTimeUpdate?.(time);
      }
    }, [onTimeUpdate]);

    const handleLoadedMetadata = useCallback(() => {
      if (audioRef.current) {
        const dur = audioRef.current.duration;
        setDuration(dur);
        setIsLoading(false);
        onDurationChange?.(dur);
      }
    }, [onDurationChange]);

    const handlePlay = useCallback(() => {
      setIsPlaying(true);
      onPlay?.();
    }, [onPlay]);

    const handlePause = useCallback(() => {
      setIsPlaying(false);
      onPause?.();
    }, [onPause]);

    const handleEnded = useCallback(() => {
      setIsPlaying(false);
      onEnded?.();
    }, [onEnded]);

    const handleError = useCallback(() => {
      setError('Failed to load audio');
      setIsLoading(false);
    }, []);

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !audioRef.current) return;
      
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      audioRef.current.currentTime = newTime;
    }, [duration]);

    const handlePlaybackRateChange = useCallback(() => {
      const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
      const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
      const newRate = PLAYBACK_RATES[nextIndex];
      
      if (audioRef.current) {
        audioRef.current.playbackRate = newRate;
        setPlaybackRate(newRate);
        localStorage.setItem('depo-pro-playback-rate', String(newRate));
      }
    }, [playbackRate]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
      setIsMuted(newVolume === 0);
    }, []);

    const toggleMute = useCallback(() => {
      if (audioRef.current) {
        if (isMuted) {
          audioRef.current.volume = volume || 1;
          setIsMuted(false);
        } else {
          audioRef.current.volume = 0;
          setIsMuted(true);
        }
      }
    }, [isMuted, volume]);

    const skipBackward = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
      }
    }, []);

    const skipForward = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
      }
    }, [duration]);

    const togglePlay = useCallback(() => {
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
    }, [isPlaying]);

    // ═══════════════════════════════════════════════════════════
    // EFFECTS
    // ═══════════════════════════════════════════════════════════

    // Load saved playback rate
    useEffect(() => {
      const savedRate = localStorage.getItem('depo-pro-playback-rate');
      if (savedRate && audioRef.current) {
        const rate = parseFloat(savedRate);
        if (PLAYBACK_RATES.includes(rate)) {
          audioRef.current.playbackRate = rate;
          setPlaybackRate(rate);
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
            skipBackward();
            break;
          case 'ArrowRight':
            e.preventDefault();
            skipForward();
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, skipBackward, skipForward]);

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (error) {
      return (
        <div className={`flex items-center justify-center p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg ${className}`}>
          {error}
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}>
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          autoPlay={autoPlay}
        />

        {/* Skip Back */}
        <button
          onClick={skipBackward}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
          title="Skip back 5 seconds"
          aria-label="Skip back 5 seconds"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
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
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
          title="Skip forward 5 seconds"
          aria-label="Skip forward 5 seconds"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Time Display */}
        <span className="text-sm font-mono text-slate-600 dark:text-slate-300 min-w-[90px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Progress Bar */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer relative group"
          role="slider"
          aria-label="Audio progress"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
        >
          <div
            className="h-full bg-blue-600 rounded-full transition-all relative"
            style={{ width: `${progress}%` }}
          >
            {/* Thumb */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
          </div>
        </div>

        {/* Playback Speed */}
        <button
          onClick={handlePlaybackRateChange}
          className="px-2 py-1 text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors min-w-[50px]"
          title="Change playback speed"
          aria-label={`Playback speed: ${playbackRate}x`}
        >
          {playbackRate}x
        </button>

        {/* Volume */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMute}
            className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
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
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer"
            aria-label="Volume"
          />
        </div>
      </div>
    );
  }
);

export default AudioPlayer;
```

---

## USAGE EXAMPLE

```tsx
// In your review page:
import { useRef } from 'react';
import { AudioPlayer, AudioPlayerRef } from '@/components/transcripts/audio-player';

export default function ReviewPage() {
  const audioRef = useRef<AudioPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Called when user clicks a word in the transcript
  const handleWordClick = (word: { start: number }) => {
    audioRef.current?.seekTo(word.start - 1.5); // 1.5s before for context
    audioRef.current?.play();
  };

  return (
    <div>
      <AudioPlayer
        ref={audioRef}
        src="/audio/deposition.mp3"
        onTimeUpdate={setCurrentTime}
      />
      
      <Transcript
        words={words}
        currentTime={currentTime}
        onWordClick={handleWordClick}
      />
    </div>
  );
}
```

---

## VERIFICATION CHECKLIST

After implementation, verify:

- [ ] Component renders without errors
- [ ] Play/Pause button works
- [ ] Progress bar shows correct position
- [ ] Clicking progress bar seeks to that position
- [ ] Time display updates during playback
- [ ] Skip forward/backward buttons work (5 seconds)
- [ ] Playback speed changes (cycles through 0.5x to 2x)
- [ ] Volume control works
- [ ] Mute button works
- [ ] `ref.seekTo()` works (test from parent component)
- [ ] `onTimeUpdate` callback fires during playback
- [ ] Keyboard shortcuts work (Space, Left, Right arrows)
- [ ] Dark mode looks good
- [ ] Loading state shows while audio loads
- [ ] Error state shows if audio fails
