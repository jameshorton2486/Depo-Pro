'use client';

// =============================================================================
// WORD CONTEXT MENU
// components/transcripts/word-context-menu.tsx
//
// Phase 3B-4: Right-click menu for inline review actions
// =============================================================================

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { MessageSquare, Flag, Check } from 'lucide-react';

interface WordContextMenuProps {
  word: string;
  wordIndex: number;
  confidence?: number;
  children: React.ReactNode;
  onAddComment: (wordIndex: number) => void;
  onToggleFlag: (wordIndex: number) => void;
  onMarkResolved: (wordIndex: number) => void;
  isFlagged?: boolean;
  hasComment?: boolean;
}

export function WordContextMenu({
  word: _word,
  wordIndex,
  confidence,
  children,
  onAddComment,
  onToggleFlag,
  onMarkResolved,
  isFlagged = false,
  hasComment = false,
}: WordContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onAddComment(wordIndex)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          {hasComment ? 'Edit Comment' : 'Add Comment'}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onToggleFlag(wordIndex)}>
          <Flag className="h-4 w-4 mr-2" />
          {isFlagged ? 'Remove Flag' : 'Flag for Review'}
        </ContextMenuItem>
        {(isFlagged || hasComment) && (
          <ContextMenuItem onClick={() => onMarkResolved(wordIndex)}>
            <Check className="h-4 w-4 mr-2" />
            Mark Resolved
          </ContextMenuItem>
        )}
        {confidence !== undefined && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
            Confidence: {(confidence * 100).toFixed(0)}%
          </div>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
