'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export interface UndoAction {
  label: string;
  action: () => Promise<void> | void;
}

/**
 * Generic undo toast hook
 */
export function useUndoToast() {
  const router = useRouter();

  const showUndoToast = useCallback(
    (message: string, undoAction: UndoAction, duration = 8000) => {
      toast.success(message, {
        duration,
        action: {
          label: undoAction.label,
          onClick: async () => {
            try {
              await undoAction.action();
              toast.success('Action undone');
              router.refresh();
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : 'Failed to undo action'
              );
            }
          },
        },
      });
    },
    [router]
  );

  return { showUndoToast };
}

/**
 * Specialized hook for reschedule undo operations
 */
export function useRescheduleUndo() {
  const { showUndoToast } = useUndoToast();
  const router = useRouter();

  const showRescheduleUndo = useCallback(
    (
      eventId: string,
      undoToken: string,
      message = 'Event rescheduled successfully'
    ) => {
      showUndoToast(
        message,
        {
          label: 'Undo',
          action: async () => {
            const response = await fetch(
              `/api/calendar/events/${eventId}/undo-reschedule`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ undoToken }),
              }
            );

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || 'Failed to undo reschedule');
            }

            router.refresh();
          },
        },
        8000 // 8 second window
      );
    },
    [showUndoToast, router]
  );

  return { showRescheduleUndo };
}

