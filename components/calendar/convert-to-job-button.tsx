'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { canConvertEventToJob } from '@/lib/rbac-client';

interface ConvertToJobButtonProps {
  eventId: string;
  eventTitle: string;
  isConverted: boolean;
  existingJobId?: string | null;
  userRole?: string;
  onConversionComplete?: (jobId: string) => void;
}

export function ConvertToJobButton({
  eventId,
  eventTitle,
  isConverted,
  existingJobId,
  userRole,
  onConversionComplete,
}: ConvertToJobButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Check if user has permission
  const hasPermission = canConvertEventToJob(userRole);

  // Don't render if no permission or already converted
  if (!hasPermission) return null;

  if (isConverted || existingJobId) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Briefcase className="mr-2 h-4 w-4" />
        Converted to Job
      </Button>
    );
  }

  const handleConvert = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/events/${eventId}/convert-to-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to convert event');
      }

      toast.success('Event converted to job successfully');
      setIsOpen(false);
      
      const jobId = data.job?.id;
      if (jobId) {
        onConversionComplete?.(jobId);
        router.push(`/jobs/${jobId}`);
      } else {
        router.refresh();
      }

    } catch (error) {
      console.error('Conversion error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to convert event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="default" size="sm">
          <Briefcase className="mr-2 h-4 w-4" />
          Convert to Job
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert to Job</AlertDialogTitle>
          <AlertDialogDescription>
            This will convert the calendar event &quot;{eventTitle}&quot; into a job. 
            This action cannot be undone. The calendar event will be locked and 
            marked as converted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConvert} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              'Convert to Job'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

