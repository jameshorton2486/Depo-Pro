'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { IntakeSubmissionPayload } from '@/lib/intake/workflow';

interface IntakeConfirmStepProps {
  role: string;
  values: IntakeSubmissionPayload;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function IntakeConfirmStep({ role, values, isSubmitting, onBack, onSubmit }: IntakeConfirmStepProps) {
  const isDirectCreate = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'COURT_REPORTER' || role === 'REPORTER';

  return (
    <Card data-testid="intake-confirm-step">
      <CardHeader>
        <CardTitle>Confirm & Submit</CardTitle>
        <CardDescription>Review the intake summary before submitting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Summary label="Job Title" value={values.jobTitle} />
          <Summary label="Case Style" value={values.caseName} />
          <Summary label="Cause Number" value={values.causeNumber} />
          <Summary label="Deponent" value={values.deponentName} />
          <Summary label="Date" value={values.depositionDate} />
          <Summary label="Start Time" value={values.startTime} />
          <Summary label="Location" value={values.location} />
          <Summary label="Ordering Attorney" value={values.orderingAttorney} />
        </div>

        <div className={`rounded-xl border p-5 ${isDirectCreate ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <h3 className="font-semibold text-slate-900">
            {isDirectCreate ? 'Ready to Create Job' : 'Transcript Request'}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {isDirectCreate
              ? 'This job will be created immediately and enter the transcription pipeline.'
              : 'Your request will be submitted for admin review. You will be notified once it has been approved.'}
          </p>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>Back</Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : isDirectCreate ? 'Create Job' : 'Submit Request'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value || '—'}</div>
    </div>
  );
}
