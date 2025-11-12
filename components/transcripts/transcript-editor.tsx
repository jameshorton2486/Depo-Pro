'use client';

// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT EDITOR COMPONENT
// ═══════════════════════════════════════════════════════════════
// Rich text editor for legal transcripts with version control

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

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
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load transcript content
  useEffect(() => {
    async function loadTranscript() {
      try {
        const res = await fetch(`/api/transcripts/${transcriptId}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.formattedText || data.rawText || '');
          setVersion(data.version);
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

    if (transcriptId) {
      loadTranscript();
    } else {
      setIsLoading(false);
    }
  }, [transcriptId]);

  // Update word count when content changes
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  }, [content]);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  // Save transcript
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        setVersion(data.version);
        setHasUnsavedChanges(false);
        toast.success('Transcript saved successfully');
        onSave?.(content);
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

  // Formatting functions
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = document.getElementById('transcript-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    const newContent = before + prefix + selectedText + suffix + after;
    setContent(newContent);
    setHasUnsavedChanges(true);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const insertLineNumbers = () => {
    const lines = content.split('\n');
    const numbered = lines.map((line, i) => {
      const num = (i + 1).toString().padStart(3, ' ');
      return `${num}  ${line.replace(/^\d+\s+/, '')}`;
    });
    setContent(numbered.join('\n'));
    setHasUnsavedChanges(true);
    toast.success('Line numbers added');
  };

  const removeLineNumbers = () => {
    const lines = content.split('\n');
    const unnumbered = lines.map(line => line.replace(/^\d+\s+/, ''));
    setContent(unnumbered.join('\n'));
    setHasUnsavedChanges(true);
    toast.success('Line numbers removed');
  };

  const findAndReplace = () => {
    const find = prompt('Find text:');
    if (!find) return;
    
    const replace = prompt('Replace with:');
    if (replace === null) return;

    const newContent = content.split(find).join(replace);
    const count = (content.match(new RegExp(find, 'g')) || []).length;
    
    setContent(newContent);
    setHasUnsavedChanges(true);
    toast.success(`Replaced ${count} occurrence(s)`);
  };

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
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transcript Editor</span>
            <div className="flex items-center gap-4 text-sm font-normal text-muted-foreground">
              <span>Version: {version}</span>
              <span>Words: {wordCount.toLocaleString()}</span>
              {hasUnsavedChanges && (
                <span className="text-amber-600 dark:text-amber-400">• Unsaved changes</span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* Formatting buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertFormatting('**')}
              title="Bold"
            >
              <strong>B</strong>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertFormatting('_')}
              title="Italic"
            >
              <em>I</em>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertFormatting('~~')}
              title="Strikethrough"
            >
              <s>S</s>
            </Button>
            
            <div className="border-l mx-2" />
            
            {/* Line number controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={insertLineNumbers}
              title="Add line numbers"
            >
              📝 Add Lines
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={removeLineNumbers}
              title="Remove line numbers"
            >
              🗑️ Remove Lines
            </Button>
            
            <div className="border-l mx-2" />
            
            {/* Utility functions */}
            <Button
              variant="outline"
              size="sm"
              onClick={findAndReplace}
              title="Find and replace"
            >
              🔍 Find & Replace
            </Button>
            
            <div className="border-l mx-2" />
            
            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="ml-auto"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="p-0">
          <textarea
            id="transcript-textarea"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full min-h-[600px] p-6 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
            placeholder="Transcript content will appear here..."
            spellCheck
          />
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
