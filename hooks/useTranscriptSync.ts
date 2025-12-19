import { useMemo } from 'react';
import type { Word } from '@/components/transcripts/word-span';

interface UseTranscriptSyncReturn {
  currentWordIndex: number | null;
  findWordAtTime: (time: number) => number | null;
}

// Binary search to find word at current time
function findWordAtTime(words: Word[], time: number): number | null {
  if (!words.length) return null;
  
  let left = 0;
  let right = words.length - 1;
  
  // Binary search for word containing the time
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const word = words[mid];
    
    if (time >= word.start && time <= word.end) {
      return mid;
    }
    
    if (time < word.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  // If between words, return the next word (or last if past end)
  if (left >= words.length) return words.length - 1;
  if (left === 0) return 0;
  
  // Return the word we're closest to
  const prevWord = words[left - 1];
  
  // If we're past the previous word's end, return next word
  if (time > prevWord.end) {
    return left;
  }
  
  return left - 1;
}

export function useTranscriptSync(
  words: Word[],
  currentTime: number
): UseTranscriptSyncReturn {
  
  const findWordAtTimeMemo = useMemo(() => {
    return (time: number): number | null => {
      return findWordAtTime(words, time);
    };
  }, [words]);

  const currentWordIndex = useMemo(() => {
    return findWordAtTime(words, currentTime);
  }, [words, currentTime]);

  return {
    currentWordIndex,
    findWordAtTime: findWordAtTimeMemo,
  };
}

export default useTranscriptSync;

