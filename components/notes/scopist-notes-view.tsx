'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, StickyNote, Lock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface DepositionNote {
  id: string;
  content: string;
  audioTimestamp: number | null;
  noteCategory: string | null;
  isLocked: boolean;
  createdAt: string;
  reporter: {
    firstName: string;
    lastName: string;
  };
}

interface ScopistNotesViewProps {
  jobId: string;
  onSeekAudio?: (timestamp: number) => void;
  className?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  spelling: 'Spelling',
  exhibit: 'Exhibit',
  'off-record': 'Off Record',
  'on-record': 'On Record',
  speaker: 'Speaker ID',
  clarification: 'Clarification',
  technical: 'Technical Issue',
  break: 'Break',
  stipulation: 'Stipulation',
  objection: 'Objection',
  other: 'Other',
};

export function ScopistNotesView({
  jobId,
  onSeekAudio,
  className,
}: ScopistNotesViewProps) {
  const [notes, setNotes] = useState<DepositionNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/notes`);
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 403) {
            setError(errorData.error || 'You do not have access to view notes for this job');
            return;
          }
          throw new Error(errorData.error || 'Failed to fetch notes');
        }
        
        const data = await response.json();
        const fetchedNotes = data.success ? data.data.notes : data.notes;
        setNotes(fetchedNotes || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load notes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [jobId]);

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Reporter Notes
          <Badge variant="secondary" className="ml-2">
            {notes.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px]">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notes from reporter</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="border rounded-lg p-3 bg-muted/30"
                >
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {note.noteCategory && (
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[note.noteCategory] || note.noteCategory}
                      </Badge>
                    )}
                    
                    {note.audioTimestamp !== null && onSeekAudio && (
                      <button
                        onClick={() => onSeekAudio(note.audioTimestamp!)}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(note.audioTimestamp)}
                      </button>
                    )}
                    
                    <span className="ml-auto">
                      {note.reporter.firstName} {note.reporter.lastName} • {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
