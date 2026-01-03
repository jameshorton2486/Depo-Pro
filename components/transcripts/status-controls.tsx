'use client';

// =============================================================================
// TRANSCRIPT STATUS CONTROLS
// components/transcripts/status-controls.tsx
//
// Phase 3B-1: Status transition buttons
// =============================================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TranscriptStatusBadge, type TranscriptStatus } from './status-badge';
import { Play, Lock, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface StatusControlsProps {
  transcriptId: string;
  currentStatus: TranscriptStatus;
  permissions: {
    canFinalize: boolean;
    canUnlock: boolean;
  };
  onStatusChange: (newStatus: TranscriptStatus) => void;
}

export function StatusControls({
  transcriptId,
  currentStatus,
  permissions,
  onStatusChange,
}: StatusControlsProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  const handleTransition = async (newStatus: TranscriptStatus, reason?: string) => {
    setIsTransitioning(true);
    try {
      const response = await fetch(`/api/transcripts/${transcriptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      toast.success(`Status updated to ${newStatus}`);
      onStatusChange(newStatus);
      setUnlockDialogOpen(false);
      setUnlockReason('');
    } catch (error) {
      console.error('Error transitioning status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleStartReview = () => {
    handleTransition('IN_REVIEW');
  };

  const handleFinalize = () => {
    if (confirm('Are you sure you want to finalize this transcript? It will be locked from further edits.')) {
      handleTransition('FINALIZED');
    }
  };

  const handleUnlock = () => {
    if (!unlockReason.trim()) {
      toast.error('Please provide a reason for unlocking');
      return;
    }
    handleTransition('IN_REVIEW', unlockReason);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Status:</span>
        <TranscriptStatusBadge status={currentStatus} />
      </div>

      <div className="flex gap-2">
        {currentStatus === 'DRAFT' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartReview}
            disabled={isTransitioning}
          >
            <Eye className="h-4 w-4 mr-2" />
            Start Review
          </Button>
        )}

        {currentStatus === 'IN_REVIEW' && permissions.canFinalize && (
          <Button
            variant="default"
            size="sm"
            onClick={handleFinalize}
            disabled={isTransitioning}
          >
            <Lock className="h-4 w-4 mr-2" />
            Finalize
          </Button>
        )}

        {(currentStatus === 'FINALIZED' || currentStatus === 'DELIVERED') && permissions.canUnlock && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnlockDialogOpen(true)}
              disabled={isTransitioning}
            >
              <Play className="h-4 w-4 mr-2" />
              Unlock for Edit
            </Button>

            <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Unlock Transcript</DialogTitle>
                  <DialogDescription>
                    This will unlock the transcript for editing. Please provide a reason.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">Reason for Unlock</Label>
                    <Textarea
                      id="reason"
                      value={unlockReason}
                      onChange={(e) => setUnlockReason(e.target.value)}
                      placeholder="e.g., Client requested correction to line 45..."
                      className="mt-2"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUnlockDialogOpen(false);
                      setUnlockReason('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUnlock} disabled={!unlockReason.trim() || isTransitioning}>
                    Unlock
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {currentStatus === 'FINALIZED' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTransition('DELIVERED')}
            disabled={isTransitioning}
          >
            <Send className="h-4 w-4 mr-2" />
            Mark Delivered
          </Button>
        )}
      </div>
    </div>
  );
}
