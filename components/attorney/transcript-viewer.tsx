'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AttorneyTranscript } from '@/types/attorney-transcript';
import { TranscriptAnnotation } from '@/types/issue-code';
import {
  ChevronLeft,
  Search,
  Play,
  Pause,
  Volume2,
  MessageSquare,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  transcript: AttorneyTranscript;
  annotations?: TranscriptAnnotation[];
  onLineClick?: (page: number, line: number) => void;
  accessLevel?: 'VIEW' | 'COMMENT' | 'EDIT';
  audioUrl?: string | null;
}

export function TranscriptViewer({
  transcript,
  annotations,
  onLineClick,
  accessLevel = 'VIEW',
  audioUrl
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTextSelect = () => {
    // Placeholder for text selection logic
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b px-4 py-3 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/attorney/transcripts">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold leading-none">{transcript.caseName || transcript.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {transcript.deponent && `Witness: ${transcript.deponent}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transcript..."
              className="pl-9 pr-4 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Badge variant="secondary" className="font-mono">
            {accessLevel}
          </Badge>

          <div className="h-8 w-px bg-border mx-1" />
        </div>
      </header>

      {/* Audio Controls Bar */}
      {audioUrl && (
        <div className="border-b px-4 py-2 flex items-center gap-4 bg-muted/30 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
            onClick={togglePlayback}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />

          <div className="flex-1 max-w-md h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary w-0" />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Volume2 className="h-3 w-3" />
            <span>Audio Playback Enabled</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript Area */}
        <div
          className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50 p-8 md:p-12"
          onMouseUp={handleTextSelect}
          ref={transcriptRef}
        >
          <div className="max-w-3xl mx-auto bg-card shadow-sm border rounded-sm p-12 min-h-full font-serif text-lg leading-relaxed relative">
            {/* Content Rendering */}
            <div className="space-y-8">
              {transcript.pages.map((page) => (
                <div key={page.pageNumber} className="relative">
                  <div className="absolute -left-8 top-0 text-[10px] text-muted-foreground font-mono select-none">
                    PAGE {page.pageNumber}
                  </div>
                  <div className="space-y-1">
                    {page.lines.map((line) => (
                      <div
                        key={`${page.pageNumber}-${line.line}`}
                        className="flex gap-4 hover:bg-primary/5 cursor-pointer group"
                        onClick={() => onLineClick?.(page.pageNumber, line.line)}
                      >
                        <div className="w-6 text-right text-[10px] text-muted-foreground font-mono pt-1 select-none group-hover:text-primary">
                          {line.line}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold mr-2">{line.speaker}:</span>
                          <span>{line.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {transcript.pages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground italic">
                  No transcript content available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Annotations & Bookmarks */}
        <aside className="w-80 border-l bg-card hidden lg:flex flex-col shrink-0">
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Review Panel</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7"><Tag className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-6">
            {/* Annotations Section */}
            <section>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="h-3 w-3" />
                Annotations ({annotations?.length || 0})
              </h3>
              <div className="space-y-3">
                {annotations?.map(a => (
                  <div key={a.id} className="p-3 rounded-md border bg-muted/20 text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-primary">
                        Page {a.pageStart}, Line {a.lineStart}
                        {a.pageEnd !== a.pageStart || a.lineEnd !== a.lineStart ? ` - Page ${a.pageEnd}, Line ${a.lineEnd}` : ''}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1 h-4">{a.issueCode.code}</Badge>
                    </div>
                    {a.note && <p>{a.note}</p>}
                  </div>
                ))}
                {(!annotations || annotations.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">No annotations yet.</p>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
