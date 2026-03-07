'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PreflightCheck {
  label: string;
  passed: boolean;
}

interface CertificationPanelProps {
  transcriptId: string;
  onCertified: () => void;
}

export function CertificationPanel({ transcriptId, onCertified }: CertificationPanelProps) {
  const [checks, setChecks] = useState<PreflightCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isCertifying, setIsCertifying] = useState(false);
  const [certified, setCertified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPassed = checks.length > 0 && checks.every((c) => c.passed);

  const runChecks = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    try {
      // Attempt certification to get preflight results
      // Use a dry-run by hitting export with preflight only
      const res = await fetch(`/api/transcripts/${transcriptId}/export?format=txt&skipPreflight=false`, {
        method: 'GET',
      });

      if (res.status === 422) {
        const data = await res.json();
        const failedChecks: string[] = data.checks || [];
        setChecks([
          { label: 'All flagged words reviewed', passed: !failedChecks.some((c: string) => c.includes('flagged')) },
          { label: 'All speakers labeled', passed: !failedChecks.some((c: string) => c.includes('speaker')) },
          { label: 'Transcript status valid', passed: !failedChecks.some((c: string) => c.includes('status')) },
        ]);
      } else {
        // All checks passed
        setChecks([
          { label: 'All flagged words reviewed', passed: true },
          { label: 'All speakers labeled', passed: true },
          { label: 'Transcript status valid', passed: true },
        ]);
      }
    } catch {
      setError('Failed to run pre-flight checks');
    } finally {
      setIsRunning(false);
    }
  }, [transcriptId]);

  const handleCertify = useCallback(async () => {
    setIsCertifying(true);
    setError(null);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/certify`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 422 && data.checks) {
          setError(`Checks failed: ${data.checks.join(', ')}`);
        } else {
          setError(data.error || 'Certification failed');
        }
        return;
      }

      setCertified(true);
      onCertified();
    } catch {
      setError('Network error during certification');
    } finally {
      setIsCertifying(false);
    }
  }, [transcriptId, onCertified]);

  if (certified) {
    return (
      <div className="p-6 text-center">
        <div className="text-green-500 text-4xl mb-3">&#10003;</div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Transcript Certified</h3>
        <p className="text-sm text-muted-foreground">Export is now unlocked.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <h3 className="text-lg font-semibold text-foreground">Certification Gate</h3>

      {/* Pre-flight checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Pre-flight Checks</span>
          <button
            onClick={runChecks}
            disabled={isRunning}
            className="text-xs px-3 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-50"
          >
            {isRunning ? 'Running...' : checks.length > 0 ? 'Re-run' : 'Run Checks'}
          </button>
        </div>

        {checks.length > 0 && (
          <ul className="space-y-1">
            {checks.map((check) => (
              <li key={check.label} className="flex items-center gap-2 text-sm">
                <span className={check.passed ? 'text-green-500' : 'text-red-500'}>
                  {check.passed ? '\u2713' : '\u2717'}
                </span>
                <span className={cn(check.passed ? 'text-foreground' : 'text-red-400')}>
                  {check.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Certification statement */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border text-sm text-muted-foreground leading-relaxed">
        I certify that this transcript is a true and accurate record of the proceedings as
        transcribed by me.
      </div>

      {/* Confirm checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border"
          disabled={!allPassed}
        />
        <span className="text-sm text-foreground">I confirm the above certification</span>
      </label>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Certify button */}
      <button
        onClick={handleCertify}
        disabled={!allPassed || !isChecked || isCertifying}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        {isCertifying ? 'Certifying...' : 'Certify & Unlock Export'}
      </button>
    </div>
  );
}
