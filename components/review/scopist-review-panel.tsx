'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, FileText, AlertTriangle, CheckCircle2, Copy, Check, Play, ChevronRight, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FlaggedWord {
  id: string;
  word: string;
  confidence: number;
  start: number;
  end: number;
  speaker?: number;
  context: string;
  isReviewed: boolean;
  correctedTo?: string;
}

interface Props {
  jobId: string;
  className?: string;
  onSeekAudio?: (timestamp: number) => void;
  onWordSelect?: (word: FlaggedWord) => void;
}

export function ScopistReviewPanel({ jobId, className, onSeekAudio, onWordSelect }: Props) {
  const [properNouns, setProperNouns] = useState<string[]>([]);
  const [nounsLoading, setNounsLoading] = useState(true);
  const [flaggedWords, setFlaggedWords] = useState<FlaggedWord[]>([]);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; pending: number; reviewed: number; averageConfidence: number | null } | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [sortBy, setSortBy] = useState<'time' | 'confidence' | 'speaker'>('confidence');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('flagged');

  // Load proper nouns
  useEffect(() => {
    fetch(`/api/jobs/${jobId}/proper-nouns`)
      .then(res => res.ok ? res.json() : { properNouns: [] })
      .then(data => {
        const nouns = data.success ? data.data?.properNouns : data.properNouns;
        setProperNouns(nouns || []);
      })
      .catch(() => setProperNouns([]))
      .finally(() => setNounsLoading(false));
  }, [jobId]);

  // Load flagged words
  const loadFlaggedWords = useCallback(async () => {
    setWordsLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/flagged-words?filter=${filter}&sort=${sortBy}`);
      if (res.ok) {
        const data = await res.json();
        setFlaggedWords(data.flaggedWords || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Error loading flagged words:', err);
    } finally {
      setWordsLoading(false);
    }
  }, [jobId, filter, sortBy]);

  useEffect(() => { 
    loadFlaggedWords(); 
  }, [loadFlaggedWords]);

  const handleWordClick = (word: FlaggedWord) => {
    if (onSeekAudio) onSeekAudio(Math.max(0, word.start - 2));
    if (onWordSelect) onWordSelect(word);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const getConfColor = (c: number) => c >= 0.9 ? 'text-green-600' : c >= 0.8 ? 'text-yellow-600' : c >= 0.7 ? 'text-orange-500' : 'text-red-500';
  const getConfBg = (c: number) => c >= 0.9 ? 'bg-green-50' : c >= 0.8 ? 'bg-yellow-50' : c >= 0.7 ? 'bg-orange-50' : 'bg-red-50';
  
  const progress = stats ? Math.round((stats.reviewed / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <Card className={cn('w-full h-full flex flex-col', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Scopist Review</CardTitle>
        {stats && stats.total > 0 && (
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.reviewed}/{stats.total} reviewed</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mb-2">
          <TabsTrigger value="flagged" className="flex-1">
            <AlertTriangle className="h-3 w-3 mr-1" />Flagged
            {stats?.pending ? <Badge variant="destructive" className="ml-1 h-4 text-[10px]">{stats.pending}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="reference" className="flex-1">
            <FileText className="h-3 w-3 mr-1" />Reference
            {properNouns.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{properNouns.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flagged" className="flex-1 flex flex-col mt-0 px-4">
          <div className="flex gap-2 mb-3">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confidence">By Confidence</SelectItem>
                <SelectItem value="time">By Time</SelectItem>
                <SelectItem value="speaker">By Speaker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1">
            {wordsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : flaggedWords.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {filter === 'pending' ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    All reviewed!
                  </>
                ) : (
                  'No flagged words'
                )}
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {flaggedWords.map(word => (
                  <button
                    key={word.id}
                    onClick={() => handleWordClick(word)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border hover:shadow-sm transition-all',
                      word.isReviewed ? 'bg-muted/30 opacity-70' : getConfBg(word.confidence)
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('font-semibold', word.isReviewed && 'line-through text-muted-foreground')}>
                            {word.word}
                          </span>
                          {word.correctedTo && (
                            <>
                              <ChevronRight className="h-3 w-3" />
                              <span className="font-semibold text-green-600">{word.correctedTo}</span>
                            </>
                          )}
                          <Badge variant="outline" className={cn('text-[10px] h-4', getConfColor(word.confidence))}>
                            {Math.round(word.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">"{word.context}"</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Play className="h-3 w-3" />
                          {formatTime(word.start)}
                        </div>
                        {word.speaker !== undefined && (
                          <Badge variant="secondary" className="text-[10px] h-4">
                            S{word.speaker + 1}
                          </Badge>
                        )}
                        {word.isReviewed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="reference" className="flex-1 flex flex-col mt-0 px-4">
          <ScrollArea className="flex-1">
            {nounsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : properNouns.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No proper nouns entered</div>
            ) : (
              <div className="space-y-1 pb-4">
                {properNouns.map((noun, i) => (
                  <div key={i} className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
                    <span className="text-sm font-medium">{noun}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(noun);
                          setCopiedIndex(i);
                          setTimeout(() => setCopiedIndex(null), 1500);
                          toast.success('Copied to clipboard');
                        } catch (_err) {
                          toast.error('Failed to copy');
                        }
                      }}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    >
                      {copiedIndex === i ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <p className="text-xs text-muted-foreground py-2 border-t">Reporter-entered (read-only)</p>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
