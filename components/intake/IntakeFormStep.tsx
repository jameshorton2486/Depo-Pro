'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { IntakeSubmissionPayload } from '@/lib/intake/workflow';

interface IntakeFormStepProps {
  values: IntakeSubmissionPayload;
  autofilled: Set<string>;
  onChange: (field: keyof IntakeSubmissionPayload, value: string | boolean | null) => void;
  onBack: () => void;
  onNext: () => void;
}

function FieldShell({
  field,
  autofilled,
  children,
}: {
  field: keyof IntakeSubmissionPayload;
  autofilled: Set<string>;
  children: React.ReactNode;
}) {
  const isAutofilled = autofilled.has(field);

  return (
    <div className={`space-y-2 rounded-lg border p-3 ${isAutofilled ? 'border-l-4 border-l-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-white'}`}>
      {children}
      {isAutofilled && <p className="text-xs text-indigo-500">✓ From document</p>}
    </div>
  );
}

export function IntakeFormStep({ values, autofilled, onChange, onBack, onNext }: IntakeFormStepProps) {
  const locationType = values.isRemote ? 'remote' : 'in-person';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Complete Form</CardTitle>
        <CardDescription>All extracted fields remain editable. Required fields are marked with an asterisk.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell field="jobTitle" autofilled={autofilled}>
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input id="jobTitle" value={values.jobTitle} onChange={(event) => onChange('jobTitle', event.target.value)} />
            </FieldShell>
            <FieldShell field="causeNumber" autofilled={autofilled}>
              <Label htmlFor="causeNumber">Cause Number</Label>
              <Input id="causeNumber" value={values.causeNumber ?? ''} onChange={(event) => onChange('causeNumber', event.target.value)} />
            </FieldShell>
            <FieldShell field="caseName" autofilled={autofilled}>
              <Label htmlFor="caseName">Case Name *</Label>
              <Input id="caseName" value={values.caseName ?? ''} onChange={(event) => onChange('caseName', event.target.value)} />
            </FieldShell>
            <FieldShell field="caseNumber" autofilled={autofilled}>
              <Label htmlFor="caseNumber">Case Number</Label>
              <Input id="caseNumber" value={values.caseNumber ?? ''} onChange={(event) => onChange('caseNumber', event.target.value)} />
            </FieldShell>
          </div>
          <FieldShell field="caseStyle" autofilled={autofilled}>
            <Label htmlFor="caseStyle">Case Style</Label>
            <Input id="caseStyle" value={values.caseStyle ?? ''} onChange={(event) => onChange('caseStyle', event.target.value)} />
          </FieldShell>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Court Information</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FieldShell field="courtName" autofilled={autofilled}>
              <Label htmlFor="courtName">Court Name</Label>
              <Input id="courtName" value={values.courtName ?? ''} onChange={(event) => onChange('courtName', event.target.value)} />
            </FieldShell>
            <FieldShell field="county" autofilled={autofilled}>
              <Label htmlFor="county">County</Label>
              <Input id="county" value={values.county ?? ''} onChange={(event) => onChange('county', event.target.value)} />
            </FieldShell>
            <FieldShell field="state" autofilled={autofilled}>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={values.state ?? 'Texas'} onChange={(event) => onChange('state', event.target.value)} />
            </FieldShell>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Deposition Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell field="deponentName" autofilled={autofilled}>
              <Label htmlFor="deponentName">Deponent Name *</Label>
              <Input id="deponentName" value={values.deponentName ?? ''} onChange={(event) => onChange('deponentName', event.target.value)} />
            </FieldShell>
            <FieldShell field="depositionDate" autofilled={autofilled}>
              <Label htmlFor="depositionDate">Deposition Date *</Label>
              <Input id="depositionDate" type="date" value={values.depositionDate} onChange={(event) => onChange('depositionDate', event.target.value)} />
            </FieldShell>
            <FieldShell field="startTime" autofilled={autofilled}>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input id="startTime" type="time" value={values.startTime} onChange={(event) => onChange('startTime', event.target.value)} />
            </FieldShell>
            <FieldShell field="timezone" autofilled={autofilled}>
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value={values.timezone ?? 'America/Chicago'} onChange={(event) => onChange('timezone', event.target.value)} />
            </FieldShell>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Location</h3>
          <div className="rounded-lg border p-4">
            <Label className="mb-3 block">Location Type</Label>
            <RadioGroup value={locationType} onValueChange={(value) => onChange('isRemote', value === 'remote')} className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-md border p-3">
                <RadioGroupItem value="remote" />
                <span>Remote (Zoom/Teams)</span>
              </label>
              <label className="flex items-center gap-3 rounded-md border p-3">
                <RadioGroupItem value="in-person" />
                <span>In-Person</span>
              </label>
            </RadioGroup>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell field="remotePlatform" autofilled={autofilled}>
              <Label htmlFor="remotePlatform">Remote Platform</Label>
              <Input id="remotePlatform" value={values.remotePlatform ?? ''} onChange={(event) => onChange('remotePlatform', event.target.value)} />
            </FieldShell>
            <FieldShell field="zoomLink" autofilled={autofilled}>
              <Label htmlFor="zoomLink">Zoom / Meeting Link</Label>
              <Input id="zoomLink" value={values.zoomLink ?? ''} onChange={(event) => onChange('zoomLink', event.target.value)} />
            </FieldShell>
          </div>

          <FieldShell field="location" autofilled={autofilled}>
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={values.location ?? ''} onChange={(event) => onChange('location', event.target.value)} />
          </FieldShell>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Ordering Attorney</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell field="orderingAttorney" autofilled={autofilled}>
              <Label htmlFor="orderingAttorney">Attorney Name</Label>
              <Input id="orderingAttorney" value={values.orderingAttorney ?? ''} onChange={(event) => onChange('orderingAttorney', event.target.value)} />
            </FieldShell>
            <FieldShell field="orderingFirm" autofilled={autofilled}>
              <Label htmlFor="orderingFirm">Firm</Label>
              <Input id="orderingFirm" value={values.orderingFirm ?? ''} onChange={(event) => onChange('orderingFirm', event.target.value)} />
            </FieldShell>
            <FieldShell field="orderingPhone" autofilled={autofilled}>
              <Label htmlFor="orderingPhone">Phone</Label>
              <Input id="orderingPhone" value={values.orderingPhone ?? ''} onChange={(event) => onChange('orderingPhone', event.target.value)} />
            </FieldShell>
            <FieldShell field="orderingEmail" autofilled={autofilled}>
              <Label htmlFor="orderingEmail">Email</Label>
              <Input id="orderingEmail" value={values.orderingEmail ?? ''} onChange={(event) => onChange('orderingEmail', event.target.value)} />
            </FieldShell>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Audio Processing</h3>
          <RadioGroup value={values.audioProcessing ?? 'automated'} onValueChange={(value) => onChange('audioProcessing', value)} className="space-y-3">
            <label className="flex gap-3 rounded-lg border p-4">
              <RadioGroupItem value="automated" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Automated Enhancement</span>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
                <p className="text-sm text-slate-500">Fast turnaround with AI-powered enhancement.</p>
              </div>
            </label>
            <label className="flex gap-3 rounded-lg border p-4">
              <RadioGroupItem value="forensic" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Manual Forensic Enhancement</span>
                  <Badge variant="outline">Premium</Badge>
                </div>
                <p className="text-sm text-slate-500">Human-assisted cleanup for difficult audio.</p>
              </div>
            </label>
          </RadioGroup>
        </div>

        <FieldShell field="notes" autofilled={autofilled}>
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea id="notes" value={values.notes ?? ''} onChange={(event) => onChange('notes', event.target.value)} />
        </FieldShell>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>Back</Button>
          <Button type="button" onClick={onNext} disabled={!values.jobTitle.trim() || !values.depositionDate || !values.startTime}>
            Next: Confirm
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
