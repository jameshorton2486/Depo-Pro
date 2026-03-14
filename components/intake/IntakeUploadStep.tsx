'use client';

import { useMemo, useRef, useState } from 'react';
import { CheckCircle, Link as LinkIcon, Loader2, Upload, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { DepositionExtractionResult } from '@/lib/ingestion/types';
import { cn } from '@/lib/utils';

export interface IntakeUploadStepProps {
  onParsed: (data: DepositionExtractionResult, selectedSessionIndex: number) => void;
  onSkip?: () => void;
}

export function IntakeUploadStep({ onParsed, onSkip }: IntakeUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [extraction, setExtraction] = useState<DepositionExtractionResult | null>(null);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

  const orderingAttorney = extraction?.attorneys.find((attorney) => attorney.role === 'ordering') ?? extraction?.attorneys[0];
  const sessions = extraction?.deposition_sessions ?? [];

  const summaryLines = useMemo(() => {
    if (!extraction) {
      return [];
    }
    return [
      extraction.case_information.cause_number ? `Cause No. ${extraction.case_information.cause_number}` : null,
      extraction.case_information.case_style,
      orderingAttorney ? `${orderingAttorney.name}${orderingAttorney.firm ? ` (${orderingAttorney.firm})` : ''}` : null,
    ].filter(Boolean) as string[];
  }, [extraction, orderingAttorney]);

  async function parseBody(body: FormData | { source_url: string }) {
    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/intake/parse-document', {
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body),
        headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.extraction) {
        throw new Error(data.error || 'Document parsing failed');
      }
      setExtraction(data.extraction);
      setSelectedSessionIndex(0);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFile(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    await parseBody(formData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Deposition Document</CardTitle>
        <CardDescription>
          Upload a notice, order, subpoena, or Google Docs link to pre-fill the intake form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!extraction && (
          <>
            <div
              data-testid="intake-upload-dropzone"
              className={cn(
                'rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50/60',
                error && 'border-red-400 bg-red-50',
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async (event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files.item(0);
                if (file) {
                  await handleFile(file);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".doc,.docx,.pdf,.txt,.rtf"
                onChange={async (event) => {
                  const file = event.target.files?.item(0);
                  if (file) {
                    await handleFile(file);
                  }
                }}
              />
              <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
                <div className="rounded-full bg-blue-100 p-4 text-blue-700">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Drop your file here or browse</p>
                  <p className="text-sm text-slate-500">Supported: DOCX, PDF, TXT, RTF. Max file size: 10MB.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                <span>or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <Label htmlFor="document-url">Document URL</Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="document-url"
                    className="pl-9"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="https://example.com/notice.pdf"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => parseBody({ source_url: sourceUrl })}
                  disabled={!sourceUrl.trim() || isUploading}
                >
                  Import
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Supports Google Docs, Dropbox, SharePoint, and direct links to PDF, DOCX, DOC, TXT, or RTF files.
              </p>
            </div>
          </>
        )}

        {isUploading && (
          <div className="space-y-3 rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Extracting case data...</span>
            </div>
            <Progress value={65} />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <XCircle className="mt-0.5 h-4 w-4" />
            <div className="space-y-2">
              <p>{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setError(null)}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {extraction && (
          <div data-testid="intake-upload-summary" className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">Data Extracted</h3>
                    <Badge variant="secondary">{Math.round(extraction.confidence * 100)}% confidence</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    {summaryLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setExtraction(null)}>
                Use Different Document
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Depositions</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {sessions.map((session, index) => (
                    <p key={`${session.deponent_name}-${index}`}>
                      {session.deponent_name} — {session.deposition_date ?? 'Unknown date'} @ {session.start_time ?? 'Unknown time'}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Attorneys</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {extraction.attorneys.slice(0, 3).map((attorney) => (
                    <p key={attorney.name}>{attorney.name}{attorney.firm ? ` (${attorney.firm})` : ''}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Keywords</div>
                <div className="mt-2 text-sm text-slate-700">
                  {extraction.transcription_keywords.all_keywords.length} terms ready for transcription boosting
                </div>
              </div>
            </div>

            {sessions.length > 1 && (
              <div className="space-y-3 rounded-lg border bg-white p-4">
                <p className="text-sm font-medium text-slate-900">Which deposition session is this job for?</p>
                <RadioGroup value={String(selectedSessionIndex)} onValueChange={(value) => setSelectedSessionIndex(Number(value))}>
                  {sessions.map((session, index) => (
                    <label key={`${session.deponent_name}-${index}`} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                      <RadioGroupItem value={String(index)} />
                      <span>
                        {session.deponent_name} — {session.deposition_date ?? 'Unknown date'} @ {session.start_time ?? 'Unknown time'}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => onParsed(extraction, selectedSessionIndex)}>
                Apply to Form
              </Button>
              {onSkip && (
                <Button type="button" variant="outline" onClick={onSkip}>
                  Skip and enter manually
                </Button>
              )}
            </div>
          </div>
        )}

        {!extraction && onSkip && (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip and enter manually
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
