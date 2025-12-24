// ═══════════════════════════════════════════════════════════════
// JOB FORM COMPONENT
// ═══════════════════════════════════════════════════════════════

'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createJobSchema } from '@/lib/validations/job';
import { type CreateJobInput } from '@/lib/validations/job';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JobStatus } from '@prisma/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface JobFormProps {
  initialData?: Partial<CreateJobInput> & { id?: string };
  mode: 'create' | 'edit';
}

export function JobForm({ initialData, mode }: JobFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: initialData || {
      status: JobStatus.CREATED,
    },
  });

  const onSubmit: SubmitHandler<CreateJobInput> = async (data) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = mode === 'create'
        ? '/api/jobs'
        : `/api/jobs/${initialData?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save job');
      }

      const job = await response.json();
      router.push(`/jobs/${job.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusValue = watch('status');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div>
          <Label htmlFor="title">Job Title *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Deposition of John Doe"
          />
          {errors.title && (
            <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="caseName">Case Name *</Label>
            <Input
              id="caseName"
              {...register('caseName')}
              placeholder="Smith v. Johnson"
            />
            {errors.caseName && (
              <p className="text-sm text-red-600 mt-1">{errors.caseName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="caseNumber">Case Number</Label>
            <Input
              id="caseNumber"
              {...register('caseNumber')}
              placeholder="CV-2024-12345"
            />
            {errors.caseNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.caseNumber.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Deposition Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Deposition Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="depositionDate">Deposition Date *</Label>
            <Input
              id="depositionDate"
              type="datetime-local"
              {...register('depositionDate')}
            />
            {errors.depositionDate && (
              <p className="text-sm text-red-600 mt-1">{errors.depositionDate.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={statusValue}
              onValueChange={(value) => setValue('status', value as JobStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={JobStatus.CREATED}>Created</SelectItem>
                <SelectItem value={JobStatus.FILES_UPLOADED}>Files Uploaded</SelectItem>
                <SelectItem value={JobStatus.ENHANCING_AUDIO}>Enhancing Audio</SelectItem>
                <SelectItem value={JobStatus.TRANSCRIBING}>Transcribing</SelectItem>
                <SelectItem value={JobStatus.AI_REVIEWING}>AI Reviewing</SelectItem>
                <SelectItem value={JobStatus.READY_FOR_EDIT}>Ready for Edit</SelectItem>
                <SelectItem value={JobStatus.ASSIGNED}>Assigned</SelectItem>
                <SelectItem value={JobStatus.IN_EDIT}>In Edit</SelectItem>
                <SelectItem value={JobStatus.SUBMITTED_FOR_REVIEW}>Submitted for Review</SelectItem>
                <SelectItem value={JobStatus.IN_REVIEW}>In Review</SelectItem>
                <SelectItem value={JobStatus.SCOPIST_COMPLETE}>Scopist Complete</SelectItem>
                <SelectItem value={JobStatus.REVIEW_COMPLETE}>Review Complete</SelectItem>
                <SelectItem value={JobStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={JobStatus.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            {...register('location')}
            placeholder="123 Main St, City, State 12345"
          />
          {errors.location && (
            <p className="text-sm text-red-600 mt-1">{errors.location.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="zoomLink">Zoom Link</Label>
          <Input
            id="zoomLink"
            {...register('zoomLink')}
            placeholder="https://zoom.us/j/..."
          />
          {errors.zoomLink && (
            <p className="text-sm text-red-600 mt-1">{errors.zoomLink.message}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          {...register('notes')}
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Additional notes about this job..."
        />
        {errors.notes && (
          <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Job' : 'Update Job'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
