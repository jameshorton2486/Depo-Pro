'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReporterProperNounsPanelProps {
  jobId: string;
  className?: string;
  disabled?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function ReporterProperNounsPanel({
  jobId,
  className,
  disabled = false,
}: ReporterProperNounsPanelProps) {
  const [content, setContent] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  // Load existing note
  useEffect(() => {
    const loadNote = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/notes?type=PROPER_NOUN`);
        if (!response.ok) throw new Error('Failed to load');
        
        const data = await response.json();
        const notes = data.success ? data.data.notes : data.notes;
        
        if (notes && notes.length > 0) {
          const combined = notes.map((n: any) => n.content).join('\n');
          setContent(combined);
          lastSavedContentRef.current = combined;
          setNoteId(notes[0].id);
        }
      } catch (_err) {
        setError('Failed to load saved notes');
      } finally {
        setIsLoading(false);
      }
    };
    loadNote();
  }, [jobId]);

  // Autosave
  const saveNote = useCallback(async (textContent: string) => {
    if (disabled || textContent === lastSavedContentRef.current) return;

    setSaveStatus('saving');
    setError(null);

    try {
      const endpoint = noteId ? `/api/jobs/${jobId}/notes/${noteId}` : `/api/jobs/${jobId}/notes`;
      const method = noteId ? 'PATCH' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textContent, type: 'PROPER_NOUN' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      const data = await response.json();
      const savedNote = data.success ? data.data.note : data.note;
      
      if (!noteId && savedNote?.id) setNoteId(savedNote.id);
      
      lastSavedContentRef.current = textContent;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setSaveStatus('error');
      setError(err.message || 'Failed to save');
    }
  }, [jobId, noteId, disabled]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(newContent), 2000);
  };

  useEffect(() => () => { 
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current); 
  }, []);

  const handleBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveNote(content);
  };

  const entryCount = content.split('\n').map(s => s.trim()).filter(Boolean).length;

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Proper Nouns & Spellings
          </CardTitle>
          <div className="flex items-center gap-2">
            {entryCount > 0 && <Badge variant="secondary">{entryCount} entries</Badge>}
            {saveStatus === 'saving' && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Error
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Type names, companies, streets, cities, or anything that may be hard to spell.

Example:
Aaron Walker
Penske Logistics
IH-35 near Temple, Texas
Dr. Martinez"
          className={cn('min-h-[250px] resize-y font-mono text-sm', disabled && 'opacity-60 cursor-not-allowed')}
          disabled={disabled}
        />
        {error && (
          <p className="text-sm text-destructive mt-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Enter one name, place, or term per line. These improve transcription accuracy.
        </p>
        {disabled && (
          <p className="text-xs text-amber-600 mt-2">Notes locked - transcript finalized.</p>
        )}
      </CardContent>
    </Card>
  );
}
