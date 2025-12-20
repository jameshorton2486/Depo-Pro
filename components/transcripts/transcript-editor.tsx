'use client';

// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT EDITOR COMPONENT
// ═══════════════════════════════════════════════════════════════
// Rich text editor for legal transcripts with version control

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { EditorToolbar } from './editor-toolbar';
import { AudioPlayer } from './audio-player';

interface TranscriptEditorProps {
  transcriptId: string;
  jobId: string;
  initialContent?: string;
  onSave?: (content: string) => void;
}

export function TranscriptEditor({
  transcriptId,
  jobId,
  initialContent = '',
  onSave,
}: TranscriptEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Typography,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-6',
      },
    },
    onUpdate: () => {
      setHasUnsavedChanges(true);
    },
  });

  // Load transcript content
  useEffect(() => {
    async function loadTranscript() {
      try {
        const res = await fetch(`/api/transcripts/${transcriptId}`);
        if (res.ok) {
          const data = await res.json();

          // Prefer contentJson if available, otherwise fallback to content (HTML/Text)
          const contentToLoad = data.contentJson || data.content || '';

          if (editor) {
            editor.commands.setContent(contentToLoad);
            // Reset history after loading
            (editor.commands as any).clearHistory();
          }

          setVersion(data.version);
          if (data.audioUrl) {
            setAudioUrl(data.audioUrl);
          }
        } else {
          toast.error('Failed to load transcript');
        }
      } catch (error) {
        console.error('Error loading transcript:', error);
        toast.error('Failed to load transcript');
      } finally {
        setIsLoading(false);
      }
    }

    if (transcriptId && editor) {
      loadTranscript();
    } else if (!transcriptId) {
      setIsLoading(false);
    }
  }, [transcriptId, editor]);

  // Save transcript
  const handleSave = async () => {
    if (!editor) return;

    setIsSaving(true);
    try {
      const contentJson = editor.getJSON();
      const contentText = editor.getText();

      const res = await fetch(`/api/transcripts/${transcriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentText, // Store plain text for search/indexing
          contentJson, // Store rich text structure
          // We could also store HTML if needed: contentHtml
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setVersion(data.transcript?.version || version);
        setHasUnsavedChanges(false);
        toast.success('Transcript saved successfully');
        onSave?.(contentText);
      } else {
        toast.error('Failed to save transcript');
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      toast.error('Failed to save transcript');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save warning on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading transcript...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Audio Player */}
      {audioUrl && (
        <AudioPlayer src={audioUrl} />
      )}

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Transcript Editor</span>
            <div className="flex items-center gap-4 text-sm font-normal text-muted-foreground">
              <span>Version: {version}</span>
              <span>Words: {editor?.storage.characterCount?.words() || 0}</span>
              {hasUnsavedChanges && (
                <span className="text-amber-600 dark:text-amber-400">• Unsaved changes</span>
              )}
            </div>
          </CardTitle>
        </CardHeader>

        <div className="px-6 pb-2">
           <EditorToolbar editor={editor} />
        </div>

        <CardContent className="pt-2">
          <div className="flex justify-end mb-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          <div className="border rounded-md min-h-[600px] bg-background">
            <EditorContent editor={editor} />
          </div>
        </CardContent>
      </Card>

      {/* Status bar */}
      <Card>
        <CardContent className="py-2 px-4 text-sm text-muted-foreground flex justify-between">
          <span>Job ID: {jobId}</span>
          <span>Transcript ID: {transcriptId}</span>
          <span>
            {hasUnsavedChanges
              ? 'Press Save to commit changes'
              : 'All changes saved'}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
