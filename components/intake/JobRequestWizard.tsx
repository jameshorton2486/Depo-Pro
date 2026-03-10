'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DepositionExtractionResult } from '@/lib/ingestion/types';
import type { IntakeSubmissionPayload } from '@/lib/intake/workflow';
import { IntakeUploadStep } from './IntakeUploadStep';
import { IntakeFormStep } from './IntakeFormStep';
import { IntakeConfirmStep } from './IntakeConfirmStep';

interface JobRequestWizardProps {
  role: string;
}

const DEFAULT_VALUES: IntakeSubmissionPayload = {
  jobTitle: '',
  caseName: '',
  caseNumber: '',
  causeNumber: '',
  caseStyle: '',
  deponentName: '',
  depositionDate: '',
  startTime: '',
  timezone: 'America/Chicago',
  location: '',
  isRemote: false,
  remotePlatform: '',
  zoomLink: '',
  orderingAttorney: '',
  orderingFirm: '',
  orderingEmail: '',
  orderingPhone: '',
  audioProcessing: 'automated',
  notes: '',
  courtName: '',
  courtNumber: '',
  county: '',
  state: 'Texas',
  documentId: null,
  extractedData: null,
};

export function JobRequestWizard({ role }: JobRequestWizardProps) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<IntakeSubmissionPayload>(DEFAULT_VALUES);
  const [autofilled, setAutofilled] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ type: 'JOB' | 'REQUEST'; id: string } | null>(null);

  function applyExtraction(extraction: DepositionExtractionResult, sessionIndex: number) {
    const session = extraction.deposition_sessions[sessionIndex] ?? extraction.deposition_sessions[0];
    const orderingAttorney = extraction.attorneys.find((attorney) => attorney.role === 'ordering') ?? extraction.attorneys[0];

    setValues((current) => ({
      ...current,
      jobTitle: session?.deponent_name ? `Deposition of ${session.deponent_name}` : current.jobTitle,
      caseName: extraction.case_information.case_style ?? current.caseName,
      caseNumber: extraction.case_information.cause_number ?? current.caseNumber,
      causeNumber: extraction.case_information.cause_number ?? current.causeNumber,
      caseStyle: extraction.case_information.case_style ?? current.caseStyle,
      deponentName: session?.deponent_name ?? current.deponentName,
      depositionDate: session?.deposition_date ?? current.depositionDate,
      startTime: session?.start_time ?? current.startTime,
      location: session?.location ?? current.location,
      isRemote: session?.is_remote ?? current.isRemote,
      remotePlatform: session?.remote_platform ?? current.remotePlatform,
      zoomLink: session?.zoom_link ?? current.zoomLink,
      orderingAttorney: orderingAttorney?.name ?? current.orderingAttorney,
      orderingFirm: orderingAttorney?.firm ?? current.orderingFirm,
      orderingEmail: orderingAttorney?.email ?? current.orderingEmail,
      orderingPhone: orderingAttorney?.phone ?? current.orderingPhone,
      courtName: extraction.case_information.court_name ?? current.courtName,
      courtNumber: extraction.case_information.court_number ?? current.courtNumber,
      county: extraction.case_information.county ?? current.county,
      state: extraction.case_information.state ?? current.state,
      extractedData: extraction,
    }));
    setAutofilled(new Set([
      'jobTitle', 'caseName', 'caseNumber', 'causeNumber', 'caseStyle',
      'deponentName', 'depositionDate', 'startTime', 'location',
      'remotePlatform', 'zoomLink', 'orderingAttorney', 'orderingFirm',
      'orderingEmail', 'orderingPhone', 'courtName', 'courtNumber',
      'county', 'state',
    ]));
    setStep(2);
  }

  async function submit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/intake/submit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Submission failed');
      }
      setSuccess({
        type: data.submissionType,
        id: data.jobId ?? data.requestId,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    const href = success.type === 'JOB' ? `/jobs/${success.id}` : '/requests';

    return (
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {success.type === 'JOB' ? 'Job Created' : 'Request Submitted'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {success.type === 'JOB'
                ? `"${values.jobTitle}" has been created.`
                : 'Your transcript request has been submitted for review.'}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <a href={href}>{success.type === 'JOB' ? 'View Job' : 'View My Requests'}</a>
            </Button>
            <Button variant="outline" onClick={() => {
              setSuccess(null);
              setValues(DEFAULT_VALUES);
              setAutofilled(new Set());
              setStep(1);
            }}>
              Create Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {step === 1 && <IntakeUploadStep onParsed={applyExtraction} onSkip={() => setStep(2)} />}
      {step === 2 && (
        <IntakeFormStep
          values={values}
          autofilled={autofilled}
          onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <IntakeConfirmStep
          role={role}
          values={values}
          isSubmitting={isSubmitting}
          onBack={() => setStep(2)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
