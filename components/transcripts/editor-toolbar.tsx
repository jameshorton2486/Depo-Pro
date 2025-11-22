'use client';

import { type Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  Undo,
  Redo,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b p-2 flex flex-wrap gap-1 items-center bg-muted/30">
      <Button
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => (editor.chain().focus() as any).toggleBold().run()}
        title="Bold"
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => (editor.chain().focus() as any).toggleItalic().run()}
        title="Italic"
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => (editor.chain().focus() as any).toggleStrike().run()}
        title="Strikethrough"
        className="h-8 w-8 p-0"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 1 }).run()}
        title="Heading 1"
        className="h-8 w-8 p-0"
      >
        <Heading1 className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 2 }).run()}
        title="Heading 2"
        className="h-8 w-8 p-0"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => (editor.chain().focus() as any).toggleBulletList().run()}
        title="Bullet list"
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => (editor.chain().focus() as any).toggleOrderedList().run()}
        title="Ordered list"
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => (editor.chain().focus() as any).toggleBlockquote().run()}
        title="Blockquote"
        className="h-8 w-8 p-0"
      >
        <Quote className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        variant={editor.isActive('highlight') ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => (editor.chain().focus() as any).toggleHighlight().run()}
        title="Highlight"
        className={`h-8 w-8 p-0 ${editor.isActive('highlight') ? 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200' : ''}`}
      >
        <Highlighter className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => (editor.chain().focus() as any).undo().run()}
        disabled={!(editor.can() as any).undo()}
        title="Undo"
        className="h-8 w-8 p-0"
      >
        <Undo className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => (editor.chain().focus() as any).redo().run()}
        disabled={!(editor.can() as any).redo()}
        title="Redo"
        className="h-8 w-8 p-0"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}
