// ═══════════════════════════════════════════════════════════════
// JOB FORM COMPONENT
// ═══════════════════════════════════════════════════════════════

'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { createJobSchema } from '@/lib/validations/job';
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
  } = useForm({
    // resolver: zodResolver(createJobSchema), // TODO: Fix Zod/RHF type mismatch
    defaultValues: initialData || {},
  }) as ReturnType<typeof useForm<CreateJobInput>>;

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
    <form onSubmit={handleSubmit(onSubmit as SubmitHandler<typeof initialData>)} className="space-y-6">
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

        <div>
          <Label htmlFor="court">Court</Label>
          <Input
            id="court"
            {...register('court')}
            placeholder="Superior Court of California"
          />
          {errors.court && (
            <p className="text-sm text-red-600 mt-1">{errors.court.message}</p>
          )}
        </div>
      </div>

      {/* Deposition Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Deposition Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="depoDate">Deposition Date *</Label>
            <Input
              id="depoDate"
              type="datetime-local"
              {...register('depoDate')}
            />
            {errors.depoDate && (
              <p className="text-sm text-red-600 mt-1">{errors.depoDate.message}</p>
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
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="BILLED">Billed</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="totalPages">Total Pages</Label>
            <Input
              id="totalPages"
              type="number"
              {...register('totalPages', { valueAsNumber: true })}
              placeholder="150"
            />
            {errors.totalPages && (
              <p className="text-sm text-red-600 mt-1">{errors.totalPages.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="difficulty">Difficulty (1-5)</Label>
            <Input
              id="difficulty"
              type="number"
              min="1"
              max="5"
              {...register('difficulty', { valueAsNumber: true })}
            />
            {errors.difficulty && (
              <p className="text-sm text-red-600 mt-1">{errors.difficulty.message}</p>
            )}
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('rushOrder')}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Rush Order</span>
            </label>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Client Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              {...register('clientName')}
              placeholder="Smith Law Firm"
            />
            {errors.clientName && (
              <p className="text-sm text-red-600 mt-1">{errors.clientName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="clientContact">Client Contact</Label>
            <Input
              id="clientContact"
              type="email"
              {...register('clientContact')}
              placeholder="contact@smithlaw.com"
            />
            {errors.clientContact && (
              <p className="text-sm text-red-600 mt-1">{errors.clientContact.message}</p>
            )}
          </div>
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
