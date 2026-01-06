// ═══════════════════════════════════════════════════════════════
// JOB FORM COMPONENT
// ═══════════════════════════════════════════════════════════════

'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createJobSchema, AudioProcessingMode } from '@/lib/validations/job';
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
import { JobStatus } from '@/types/database';
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
      audioProcessingMode: AudioProcessingMode.AUTOMATED,
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
  const audioProcessingModeValue = watch('audioProcessingMode');

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

      {/* Audio Processing Mode - Phase 6B */}
      {mode === 'create' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Audio Processing</h3>
          <p className="text-sm text-gray-500">
            Select how audio files should be processed. This choice cannot be changed once processing begins.
          </p>
          
          <div className="space-y-3">
            <label 
              className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                audioProcessingModeValue === AudioProcessingMode.AUTOMATED 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value={AudioProcessingMode.AUTOMATED}
                {...register('audioProcessingMode')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Automated Enhancement</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Recommended</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Industry-standard audio processing included by default. Fast turnaround with AI-powered enhancement.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Best for: Most depositions, Zoom/Teams recordings, courtroom audio
                </p>
              </div>
            </label>

            <label 
              className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                audioProcessingModeValue === AudioProcessingMode.MANUAL_RX 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value={AudioProcessingMode.MANUAL_RX}
                {...register('audioProcessingMode')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Manual Forensic Enhancement</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">Premium</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Human-assisted forensic audio cleanup using professional tools. Flat fee: <strong>$150 per file</strong>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Best for: Poor audio quality, heavy crosstalk, whispered testimony, severe background noise
                </p>
              </div>
            </label>
          </div>
          
          {errors.audioProcessingMode && (
            <p className="text-sm text-red-600 mt-1">{errors.audioProcessingMode.message}</p>
          )}
        </div>
      )}

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

