import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";

interface AudioControls {
  seek: (absoluteSeconds: number) => void;
  play: () => void;
  pause: () => void;
}

export interface AudioContextValue {
  // React state — causes toolbar/player re-renders only when status changes
  playing: boolean;
  duration: number;
  // Ref — read by RAF loops without triggering re-renders
  currentTimeRef: React.MutableRefObject<number>;
  // Commands — call through to the registered WaveSurfer controls
  seekTo: (absoluteSeconds: number) => void;
  play: () => void;
  pause: () => void;
  // Called once by AudioPlayer after WaveSurfer is ready
  registerControls: (controls: AudioControls) => void;
  // Called by AudioPlayer to sync state into context
  setDuration: (d: number) => void;
  setPlaying: (p: boolean) => void;
  updateCurrentTime: (t: number) => void;
}

const Ctx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const currentTimeRef = useRef<number>(0);
  const controlsRef = useRef<AudioControls | null>(null);
  const [playing, setPlayingState] = useState(false);
  const [duration, setDurationState] = useState(0);

  const registerControls = useCallback((controls: AudioControls) => {
    controlsRef.current = controls;
  }, []);

  const seekTo = useCallback((absoluteSeconds: number) => {
    controlsRef.current?.seek(absoluteSeconds);
  }, []);

  const play = useCallback(() => {
    controlsRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    controlsRef.current?.pause();
  }, []);

  const setDuration = useCallback((d: number) => setDurationState(d), []);

  const setPlaying = useCallback((p: boolean) => setPlayingState(p), []);

  const updateCurrentTime = useCallback((t: number) => {
    currentTimeRef.current = t;
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      playing,
      duration,
      currentTimeRef,
      seekTo,
      play,
      pause,
      registerControls,
      setDuration,
      setPlaying,
      updateCurrentTime,
    }),
    [
      playing,
      duration,
      seekTo,
      play,
      pause,
      registerControls,
      setDuration,
      setPlaying,
      updateCurrentTime,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudio must be inside AudioProvider");
  return ctx;
}
