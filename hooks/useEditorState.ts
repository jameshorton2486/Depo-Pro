'use client';

import { useCallback, useRef, useState } from 'react';

export interface EditorAudioHandle {
  seekTo: (timestamp: number) => void;
}

export function useEditorState(transcriptionId: string, jobId: string) {
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [selectedFlaggedWordId, setSelectedFlaggedWordId] = useState<string | null>(null);
  const audioPlayerRef = useRef<EditorAudioHandle | null>(null);

  void transcriptionId;
  void jobId;

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentAudioTime(time);
  }, []);

  const handleSeekToTime = useCallback((timestamp: number) => {
    audioPlayerRef.current?.seekTo(timestamp);
    setCurrentAudioTime(timestamp);
  }, []);

  const handleCorrectionSaved = useCallback((_wordId: string) => {
    setEditingWordId(null);
  }, []);

  return {
    currentAudioTime,
    activeWordId,
    setActiveWordId,
    editingWordId,
    setEditingWordId,
    selectedFlaggedWordId,
    setSelectedFlaggedWordId,
    audioPlayerRef,
    handleTimeUpdate,
    handleSeekToTime,
    handleCorrectionSaved,
  };
}
