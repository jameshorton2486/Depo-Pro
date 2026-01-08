'use client';

// ═══════════════════════════════════════════════════════════════════════════
// FLAGGED WORD REVIEW PANEL
// Core scopist review interface for low-confidence word corrections
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Check, 
  X, 
  Play, 
  ChevronDown, 
  ChevronUp,
  Filter,
  SortAsc,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface FlaggedWord {
  id: string;
  word: string;
  confidence: number;
  start: number;
  end: number;
  speaker?: number;
  context: string;
  isReviewed: boolean;
  correctedTo?: string;
  alternatives?: string[];
}

interface FlaggedWordPanelProps {
  words: FlaggedWord[];
  onSeekAudio: (timestamp: number) => void;
  onWordUpdate: (wordId: string, correctedText: string) => Promise<void>;
  onWordApprove: (wordId: string) => Promise<void>;
  onWordReject?: (wordId: string) => Promise<void>; // Optional - for future use
  currentAudioTime?: number;
  isLoading?: boolean;
}

type FilterType = 'all' | 'pending' | 'reviewed';
type SortType = 'confidence' | 'time' | 'speaker';

export function FlaggedWordPanel({
  words,
  onSeekAudio,
  onWordUpdate,
  onWordApprove,
  onWordReject: _onWordReject, // Reserved for future reject functionality
  currentAudioTime = 0,
  isLoading = false,
}: FlaggedWordPanelProps) {
  const [filter, setFilter] = useState<FilterType>('pending');
  const [sortBy, setSortBy] = useState<SortType>('confidence');
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingWordId, setSavingWordId] = useState<string | null>(null);

  // Filter and sort words
  const processedWords = useMemo(() => {
    let result = [...words];

    // Apply filter
    if (filter === 'pending') {
      result = result.filter(w => !w.isReviewed);
    } else if (filter === 'reviewed') {
      result = result.filter(w => w.isReviewed);
    }

    // Apply sort
    switch (sortBy) {
      case 'confidence':
        result.sort((a, b) => a.confidence - b.confidence);
        break;
      case 'time':
        result.sort((a, b) => a.start - b.start);
        break;
      case 'speaker':
        result.sort((a, b) => (a.speaker || 0) - (b.speaker || 0));
        break;
    }

    return result;
  }, [words, filter, sortBy]);

  // Statistics
  const stats = useMemo(() => ({
    total: words.length,
    pending: words.filter(w => !w.isReviewed).length,
    reviewed: words.filter(w => w.isReviewed).length,
    avgConfidence: words.length > 0 
      ? (words.reduce((sum, w) => sum + w.confidence, 0) / words.length * 100).toFixed(1)
      : '0',
  }), [words]);

  // Format timestamp
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-yellow-500';
    if (confidence >= 0.6) return 'text-orange-500';
    return 'text-red-500';
  };

  // Handle word click - seek audio
  const handleWordClick = useCallback((word: FlaggedWord) => {
    onSeekAudio(word.start);
    setExpandedWordId(expandedWordId === word.id ? null : word.id);
  }, [onSeekAudio, expandedWordId]);

  // Start editing
  const handleStartEdit = (word: FlaggedWord) => {
    setEditingWordId(word.id);
    setEditText(word.correctedTo || word.word);
  };

  // Save edit
  const handleSaveEdit = async (wordId: string) => {
    if (!editText.trim()) return;
    
    setSavingWordId(wordId);
    try {
      await onWordUpdate(wordId, editText.trim());
      setEditingWordId(null);
      setEditText('');
    } finally {
      setSavingWordId(null);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingWordId(null);
    setEditText('');
  };

  // Approve word (mark as correct)
  const handleApprove = async (word: FlaggedWord) => {
    setSavingWordId(word.id);
    try {
      await onWordApprove(word.id);
    } finally {
      setSavingWordId(null);
    }
  };

  // Check if word is currently playing
  const isWordPlaying = (word: FlaggedWord): boolean => {
    return currentAudioTime >= word.start && currentAudioTime <= word.end;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-lg border">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-2">Flagged Words Review</h3>
        
        {/* Statistics */}
        <div className="flex gap-4 text-sm mb-4">
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span>{stats.pending} pending</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{stats.reviewed} reviewed</span>
          </div>
          <div className="text-muted-foreground">
            Avg: {stats.avgConfidence}%
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({stats.total})</SelectItem>
              <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
              <SelectItem value="reviewed">Reviewed ({stats.reviewed})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortType)}>
            <SelectTrigger className="w-32">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="speaker">Speaker</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Word List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : processedWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2" />
            <p>No words to review</p>
          </div>
        ) : (
          <div className="divide-y">
            {processedWords.map((word) => (
              <div
                key={word.id}
                className={cn(
                  'p-3 transition-colors',
                  isWordPlaying(word) && 'bg-primary/10',
                  word.isReviewed && 'bg-green-50 dark:bg-green-950/20'
                )}
              >
                {/* Word Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => handleWordClick(word)}
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeekAudio(word.start);
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    
                    <div>
                      <span className={cn(
                        'font-medium',
                        word.isReviewed && 'line-through text-muted-foreground'
                      )}>
                        {word.word}
                      </span>
                      {word.correctedTo && (
                        <span className="ml-2 text-green-600 font-medium">
                          → {word.correctedTo}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getConfidenceColor(word.confidence)}>
                      {(word.confidence * 100).toFixed(0)}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(word.start)}
                    </span>
                    {word.speaker !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        S{word.speaker}
                      </Badge>
                    )}
                    {expandedWordId === word.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedWordId === word.id && (
                  <div className="mt-3 ml-10 space-y-3">
                    {/* Context */}
                    <p className="text-sm text-muted-foreground italic">
                      "...{word.context}..."
                    </p>

                    {/* Alternatives */}
                    {word.alternatives && word.alternatives.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">Alternatives:</span>
                        {word.alternatives.map((alt, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => {
                              setEditingWordId(word.id);
                              setEditText(alt);
                            }}
                          >
                            {alt}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Edit Mode */}
                    {editingWordId === word.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1"
                          placeholder="Enter correction..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(word.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(word.id)}
                          disabled={savingWordId === word.id}
                        >
                          {savingWordId === word.id ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(word)}
                        >
                          Edit
                        </Button>
                        {!word.isReviewed && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(word)}
                            disabled={savingWordId === word.id}
                          >
                            {savingWordId === word.id ? (
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer Progress */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>Review Progress</span>
          <span className="font-medium">
            {stats.reviewed} / {stats.total} ({Math.round((stats.reviewed / stats.total) * 100) || 0}%)
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(stats.reviewed / stats.total) * 100 || 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default FlaggedWordPanel;
