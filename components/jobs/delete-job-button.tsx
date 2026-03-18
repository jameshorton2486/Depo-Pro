'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteJobButtonProps {
  jobId: string;
  jobTitle: string;
  variant?: 'icon' | 'button';
}

export function DeleteJobButton({ jobId, jobTitle, variant = 'icon' }: DeleteJobButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? 'Failed to delete job');
      }
    } catch {
      alert('Failed to delete job. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const trigger =
    variant === 'button' ? (
      <Button
        type="button"
        variant="outline"
        className="text-red-600 hover:text-red-700"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
    ) : (
      <button
        type="button"
        title="Delete job"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );

  return (
    <>
      {trigger}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete &quot;{jobTitle}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
