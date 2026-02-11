'use client';

/**
 * MedicalRecordsPanel
 * Phase 10 — Depo-Pro
 *
 * Upload medical PDFs, view uploaded records, trigger AI extraction.
 * Self-loading component that fetches records from API.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MedicalRecordWithStats } from '@/types/medical';

interface MedicalRecordsPanelProps {
  jobId: string;
  canUpload?: boolean;
  onExtractionComplete?: () => void;
}

export default function MedicalRecordsPanel({
  jobId,
  canUpload = true,
  onExtractionComplete,
}: MedicalRecordsPanelProps) {
  const [records, setRecords] = useState<MedicalRecordWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch records ────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/medical-records`);
      const json = await res.json();
      if (res.ok) {
        setRecords(json.data || []);
      } else {
        setError(json.error || 'Failed to load records');
      }
    } catch {
      setError('Network error loading records');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ── Upload handler ───────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/jobs/${jobId}/medical-records`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok) {
        await fetchRecords();
      } else {
        setError(json.error || 'Upload failed');
      }
    } catch {
      setError('Network error during upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ── Extract handler ──────────────────────────────────────
  const handleExtract = async (recordId: string, reprocess = false) => {
    setExtractingId(recordId);
    setError(null);

    try {
      const res = await fetch(
        `/api/jobs/${jobId}/medical-records/${recordId}/extract`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reprocess }),
        },
      );

      const json = await res.json();
      if (res.ok) {
        await fetchRecords();
        onExtractionComplete?.();
      } else {
        setError(json.error || 'Extraction failed');
      }
    } catch {
      setError('Network error during extraction');
    } finally {
      setExtractingId(null);
    }
  };

  // ── Delete handler ───────────────────────────────────────
  const handleDelete = async (recordId: string) => {
    if (!confirm('Delete this medical record and all extracted entries?')) return;

    try {
      const res = await fetch(
        `/api/jobs/${jobId}/medical-records/${recordId}`,
        { method: 'DELETE' },
      );

      if (res.ok) {
        await fetchRecords();
        onExtractionComplete?.();
      } else {
        const json = await res.json();
        setError(json.error || 'Delete failed');
      }
    } catch {
      setError('Network error during deletion');
    }
  };

  // ── Status badge ─────────────────────────────────────────
  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      UPLOADED: 'bg-gray-100 text-gray-700',
      PROCESSING: 'bg-blue-100 text-blue-700',
      EXTRACTED: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      ARCHIVED: 'bg-gray-200 text-gray-500',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.UPLOADED}`}>
        {status === 'PROCESSING' && (
          <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {status}
      </span>
    );
  };

  // ── Format bytes ─────────────────────────────────────────
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Medical Records</h3>
        {canUpload && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleUpload}
              className="hidden"
              id="medical-upload"
            />
            <label
              htmlFor="medical-upload"
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer
                ${uploading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'}
              `}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload PDF
                </>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-500 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          <svg className="animate-spin mx-auto h-6 w-6 mb-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading records...
        </div>
      )}

      {/* Empty state */}
      {!loading && records.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-500">No medical records uploaded yet.</p>
          <p className="text-xs text-gray-400 mt-1">Upload PDF medical documents to generate a chronology.</p>
        </div>
      )}

      {/* Records list */}
      {!loading && records.length > 0 && (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                {/* File info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {record.file_name}
                    </span>
                    {statusBadge(record.status)}
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatBytes(record.file_size_bytes)}</span>
                    {record.document_type && (
                      <span className="text-gray-600 font-medium">{record.document_type}</span>
                    )}
                    {record.provider_name && <span>{record.provider_name}</span>}
                    {record.entry_count !== undefined && record.entry_count > 0 && (
                      <span className="text-green-600">
                        {record.entry_count} entries
                        {record.verified_count ? ` (${record.verified_count} verified)` : ''}
                      </span>
                    )}
                  </div>

                  {record.extraction_summary && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                      {record.extraction_summary}
                    </p>
                  )}

                  {record.error_message && (
                    <p className="mt-1 text-xs text-red-500">{record.error_message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(record.status === 'UPLOADED' || record.status === 'FAILED') && (
                    <button
                      onClick={() => handleExtract(record.id)}
                      disabled={extractingId === record.id}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {extractingId === record.id ? (
                        <>
                          <svg className="animate-spin mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Extracting...
                        </>
                      ) : (
                        'Extract'
                      )}
                    </button>
                  )}

                  {record.status === 'EXTRACTED' && (
                    <button
                      onClick={() => handleExtract(record.id, true)}
                      disabled={extractingId === record.id}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      title="Re-extract chronology from this document"
                    >
                      {extractingId === record.id ? 'Processing...' : 'Re-extract'}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(record.id)}
                    className="inline-flex items-center p-1.5 text-xs rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete record"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
