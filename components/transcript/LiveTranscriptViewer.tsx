'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface LiveWord {
  word: string;
  punctuated_word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number;
  is_final: boolean;
}

interface SpeakerGroup {
  speaker: number;
  words: LiveWord[];
}

interface LiveTranscriptViewerProps {
  sessionId: string | null;
  pollIntervalMs?: number;
}

function displayWord(word: LiveWord): string {
  return word.punctuated_word || word.word;
}

export function LiveTranscriptViewer({
  sessionId,
  pollIntervalMs: _pollIntervalMs = 500,
}: LiveTranscriptViewerProps) {
  const [groups, setGroups] = useState<SpeakerGroup[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addWord = useCallback((word: LiveWord) => {
    setGroups((prev) => {
      const copy = [...prev];
      const lastGroup = copy[copy.length - 1];

      if (lastGroup && lastGroup.speaker === word.speaker) {
        return [
          ...copy.slice(0, -1),
          { ...lastGroup, words: [...lastGroup.words, word] },
        ];
      }

      return [...copy, { speaker: word.speaker, words: [word] }];
    });
  }, []);

  // Expose addWord for parent components to call
  useEffect(() => {
    if (!sessionId) return;

    // Register a global handler so parent can push words
    const handler = (e: CustomEvent<LiveWord>) => addWord(e.detail);
    window.addEventListener(`live-word-${sessionId}` as any, handler as any);
    return () => window.removeEventListener(`live-word-${sessionId}` as any, handler as any);
  }, [sessionId, addWord]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [groups]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Start a live session to see real-time transcription
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm animate-pulse">
        Waiting for audio...
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
      {groups.map((group, gi) => (
        <div key={gi} className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            Speaker {group.speaker + 1}
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {group.words.map((word, wi) => (
              <span
                key={wi}
                className={cn(
                  'inline',
                  word.confidence < 0.85 && 'text-yellow-500 underline decoration-dotted',
                  !word.is_final && 'text-muted-foreground italic',
                )}
              >
                {displayWord(word)}{' '}
              </span>
            ))}
          </p>
        </div>
      ))}
    </div>
  );
}
