// hooks/use-review-session.ts
// Feature 5: Review Session Duration Tracking
// Workflow Intelligence Plan - Phase A

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ReviewSessionMetrics {
  sessionId: string | null;
  activeDuration: number; // seconds (excludes idle)
  totalDuration: number;  // seconds (includes idle)
  wordsReviewed: number;
  wordsCorrected: number;
  audioReplays: number;
  filtersUsed: string[];
}

interface UseReviewSessionOptions {
  transcriptionId: string;
  jobId: string;
  userId: string;
  riskScore?: number;
  flaggedCount?: number;
  idleThreshold?: number; // seconds, default 60
  saveInterval?: number;  // ms, default 30000 (30 seconds)
}

/**
 * Hook to track review session duration and activity
 *
 * Features:
 * - Tracks active time (excludes idle periods > 60 seconds)
 * - Detects idle state based on user interaction
 * - Tracks review actions: corrections, audio replays, filter usage
 * - Auto-saves session data every 30 seconds
 * - Saves final data on unmount
 *
 * Phase A: Captures data for analytics
 * Phase B: Data used for adaptive effort estimation
 */
export function useReviewSession(options: UseReviewSessionOptions) {
  const {
    transcriptionId,
    jobId,
    userId,
    riskScore,
    flaggedCount,
    idleThreshold = 60,
    saveInterval = 30000, // 30 seconds
  } = options;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ReviewSessionMetrics>({
    sessionId: null,
    activeDuration: 0,
    totalDuration: 0,
    wordsReviewed: 0,
    wordsCorrected: 0,
    audioReplays: 0,
    filtersUsed: [],
  });

  // Refs for tracking time
  const sessionStartTime = useRef<number>(Date.now());
  const lastActivityTime = useRef<number>(Date.now());
  const isIdle = useRef<boolean>(false);
  const activeTimeAccumulator = useRef<number>(0); // Accumulated active seconds
  const lastTickTime = useRef<number>(Date.now());

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const response = await fetch('/api/review-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcriptionId,
            jobId,
            userId,
            riskScore,
            flaggedCount,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSessionId(data.sessionId);
          setMetrics(prev => ({ ...prev, sessionId: data.sessionId }));
        }
      } catch (error) {
        console.error('Failed to create review session:', error);
      }
    };

    createSession();
  }, [transcriptionId, jobId, userId, riskScore, flaggedCount]);

  // Timer to track active/idle time
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = (now - lastActivityTime.current) / 1000;

      // Check if user is idle
      if (timeSinceLastActivity > idleThreshold) {
        if (!isIdle.current) {
          // Just became idle - accumulate the active time up to idle threshold
          const activeSeconds = Math.floor((now - lastTickTime.current - (timeSinceLastActivity - idleThreshold) * 1000) / 1000);
          activeTimeAccumulator.current += Math.max(0, activeSeconds);
          isIdle.current = true;
        }
        // Don't accumulate time while idle
      } else {
        // User is active
        if (isIdle.current) {
          // Just became active again - reset tick time
          lastTickTime.current = now;
          isIdle.current = false;
        } else {
          // Continue accumulating active time
          const activeSeconds = Math.floor((now - lastTickTime.current) / 1000);
          activeTimeAccumulator.current += activeSeconds;
          lastTickTime.current = now;
        }
      }

      // Update metrics (total duration always increases)
      const totalSeconds = Math.floor((now - sessionStartTime.current) / 1000);
      setMetrics(prev => ({
        ...prev,
        activeDuration: activeTimeAccumulator.current,
        totalDuration: totalSeconds,
      }));
    }, 1000); // Update every second

    return () => clearInterval(timerInterval);
  }, [idleThreshold]);

  // Activity detector - reset idle timer on user interaction
  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      const wasIdle = isIdle.current;

      lastActivityTime.current = now;

      if (wasIdle) {
        // Coming back from idle - reset tick time
        lastTickTime.current = now;
        isIdle.current = false;
      }
    };

    // Listen for user interactions
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  // Save session data periodically
  useEffect(() => {
    if (!sessionId) return;

    const saveSession = async () => {
      try {
        await fetch(`/api/review-sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activeDuration: metrics.activeDuration,
            totalDuration: metrics.totalDuration,
            wordsReviewed: metrics.wordsReviewed,
            wordsCorrected: metrics.wordsCorrected,
            audioReplays: metrics.audioReplays,
            filtersUsed: metrics.filtersUsed,
          }),
        });
      } catch (error) {
        console.error('Failed to save review session:', error);
      }
    };

    const interval = setInterval(saveSession, saveInterval);

    // Save on unmount
    return () => {
      clearInterval(interval);
      saveSession(); // Final save
    };
  }, [sessionId, metrics, saveInterval]);

  // Save on page unload
  useEffect(() => {
    if (!sessionId) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable data transmission during unload
      const data = JSON.stringify({
        activeDuration: metrics.activeDuration,
        totalDuration: metrics.totalDuration,
        wordsReviewed: metrics.wordsReviewed,
        wordsCorrected: metrics.wordsCorrected,
        audioReplays: metrics.audioReplays,
        filtersUsed: metrics.filtersUsed,
        ended: true,
      });

      navigator.sendBeacon(
        `/api/review-sessions/${sessionId}`,
        new Blob([data], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, metrics]);

  // Increment word reviewed counter
  const trackWordReviewed = useCallback((wasCorrected: boolean = false) => {
    setMetrics(prev => ({
      ...prev,
      wordsReviewed: prev.wordsReviewed + 1,
      wordsCorrected: wasCorrected ? prev.wordsCorrected + 1 : prev.wordsCorrected,
    }));
  }, []);

  // Increment audio replay counter
  const trackAudioReplay = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      audioReplays: prev.audioReplays + 1,
    }));
  }, []);

  // Track filter usage
  const trackFilterUsed = useCallback((filterType: string) => {
    setMetrics(prev => {
      if (!prev.filtersUsed.includes(filterType)) {
        return {
          ...prev,
          filtersUsed: [...prev.filtersUsed, filterType],
        };
      }
      return prev;
    });
  }, []);

  return {
    metrics,
    trackWordReviewed,
    trackAudioReplay,
    trackFilterUsed,
  };
}
