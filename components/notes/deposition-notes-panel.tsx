'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Lock, 
  Clock,
  StickyNote,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface DepositionNote {
  id: string;
  content: string;
  audioTimestamp: number | null;
  noteCategory: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface DepositionNotesPanelProps {
  jobId: string;
  userRole: 'REPORTER' | 'SCOPIST' | 'ADMIN';
  userId: string;
  currentAudioTime?: number; // Current playback position in seconds
  onSeekAudio?: (timestamp: number) => void; // Callback to seek audio
  className?: string;
}

const NOTE_CATEGORIES = [
  { value: 'spelling', label: 'Spelling' },
  { value: 'exhibit', label: 'Exhibit' },
  { value: 'off-record', label: 'Off Record' },
  { value: 'on-record', label: 'On Record' },
  { value: 'speaker', label: 'Speaker ID' },
  { value: 'clarification', label: 'Clarification' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'break', label: 'Break' },
  { value: 'stipulation', label: 'Stipulation' },
  { value: 'objection', label: 'Objection' },
  { value: 'other', label: 'Other' },
];

export function DepositionNotesPanel({
  jobId,
  userRole,
  userId,
  currentAudioTime,
  onSeekAudio,
  className,
}: DepositionNotesPanelProps) {
  const [notes, setNotes] = useState<DepositionNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJobFinalized, setIsJobFinalized] = useState(false);
  
  // New note form
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [captureTimestamp, setCaptureTimestamp] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<string>('');

  const canCreate = userRole === 'REPORTER' || userRole === 'ADMIN';
  const canEdit = (note: DepositionNote) => {
    if (note.isLocked || isJobFinalized) return false;
    if (userRole === 'ADMIN') return true;
    if (userRole === 'REPORTER' && note.reporter.id === userId) return true;
    return false;
  };

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/notes`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch notes');
      }
      const data = await response.json();
      
      if (data.success && data.data) {
        setNotes(data.data.notes || []);
        setIsJobFinalized(data.data.meta?.isJobFinalized || false);
      } else {
        // Fallback for direct data format
        setNotes(data.notes || []);
        setIsJobFinalized(data.meta?.isJobFinalized || false);
      }
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      toast.error(error.message || 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Create note
  const handleCreate = async () => {
    if (!newContent.trim()) {
      toast.error('Note content is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent.trim(),
          audioTimestamp: captureTimestamp ? currentAudioTime : null,
          noteCategory: newCategory || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create note');
      }

      const data = await response.json();
      const note = data.success ? data.data.note : data.note;
      
      setNotes(prev => [...prev, note]);
      setNewContent('');
      setNewCategory('');
      setIsCreating(false);
      toast.success('Note created');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create note');
    } finally {
      setIsSaving(false);
    }
  };

  // Update note
  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) {
      toast.error('Note content is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
          noteCategory: editCategory || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update note');
      }

      const data = await response.json();
      const updatedNote = data.success ? data.data.note : data.note;
      
      setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n));
      setEditingId(null);
      toast.success('Note updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update note');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete note
  const handleDelete = async (noteId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete note');
      }

      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete note');
    }
  };

  // Format timestamp for display
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start editing
  const startEdit = (note: DepositionNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditCategory(note.noteCategory || '');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setEditCategory('');
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

  return (
    <Card className={cn('w-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Deposition Notes
            {isJobFinalized && (
              <Badge variant="secondary" className="ml-2">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </CardTitle>
          {canCreate && !isJobFinalized && !isCreating && (
            <Button
              size="sm"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 pt-0">
        {/* New Note Form */}
        {isCreating && (
          <div className="border rounded-lg p-3 bg-muted/50 space-y-3">
            <Textarea
              id="new-note"
              aria-label="New note"
              placeholder="Enter your note..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[80px] resize-none"
              autoFocus
            />
            <div className="flex gap-2 items-center">
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {currentAudioTime !== undefined && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={captureTimestamp}
                    onChange={(e) => setCaptureTimestamp(e.target.checked)}
                    className="rounded"
                  />
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(currentAudioTime)}
                </label>
              )}
              
              <div className="flex-1" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setNewContent('');
                  setNewCategory('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isSaving || !newContent.trim()}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <ScrollArea className="flex-1 -mx-4 px-4">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notes yet</p>
              {canCreate && !isJobFinalized && (
                <p className="text-sm">Click "Add Note" to create one</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    'border rounded-lg p-3 transition-colors',
                    note.isLocked && 'bg-muted/30',
                    editingId === note.id && 'ring-2 ring-primary'
                  )}
                >
                  {editingId === note.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <Textarea
                        id={`edit-note-${note.id}`}
                        aria-label="Edit note"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2 items-center">
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex-1" />
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(note.id)}
                          disabled={isSaving || !editContent.trim()}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        </div>
                        {canEdit(note) && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEdit(note)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Note</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this note? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(note.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                      
                      {/* Metadata row */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {note.noteCategory && (
                          <Badge variant="outline" className="text-xs">
                            {NOTE_CATEGORIES.find(c => c.value === note.noteCategory)?.label || note.noteCategory}
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
                        
                        {note.isLocked && (
                          <Lock className="h-3 w-3" />
                        )}
                        
                        <span className="ml-auto">
                          {note.reporter.firstName} {note.reporter.lastName} • {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
