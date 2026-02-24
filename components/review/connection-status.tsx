'use client';

import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

interface ConnectionStatusProps {
  /** Interval between health pings in ms (default: 30000) */
  pingIntervalMs?: number;
}

export function ConnectionStatus({ pingIntervalMs = 30000 }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  const checkConnection = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      setIsOnline(response.ok);
    } catch {
      setIsOnline(false);
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void checkConnection(); // Verify with actual server round-trip
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => { void checkConnection(); }, pingIntervalMs);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection, pingIntervalMs]);

  // Show/hide banner with slight delay to avoid flicker on brief blips
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    } else {
      const timeout = setTimeout(() => setShowBanner(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline]);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
        isOnline
          ? 'bg-green-600/90 text-white'
          : 'bg-red-600/90 text-white animate-pulse'
      }`}
      role="alert"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          Connection restored — your work is safe
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          Connection lost — corrections will retry when reconnected
        </>
      )}
    </div>
  );
}
