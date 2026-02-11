'use client';

/**
 * Medical Chronology Page
 * Phase 10 — Depo-Pro
 *
 * Full-page view combining medical record uploads with chronology viewer.
 * Accessible from job detail page.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MedicalRecordsPanel from '@/components/medical/MedicalRecordsPanel';
import ChronologyViewer from '@/components/medical/ChronologyViewer';

interface JobInfo {
  id: string;
  caseName?: string;
  case_name?: string;
  caseNumber?: string;
  case_number?: string;
  deponentName?: string;
  deponent_name?: string;
}

export default function MedicalChronologyPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch job info for breadcrumb
  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const json = await res.json();
        setJob(json.data || json);
      }
    } catch {
      // Non-critical - page still works
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const caseName = job?.caseName || job?.case_name || 'Job';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() => router.push('/dashboard')}
          className="hover:text-gray-700"
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          onClick={() => router.push(`/jobs/${jobId}`)}
          className="hover:text-gray-700"
        >
          {loading ? 'Loading...' : caseName}
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium">Medical Chronology</span>
      </nav>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Chronology</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload medical records and generate an AI-powered chronology for {caseName}.
          </p>
        </div>
        <button
          onClick={() => router.push(`/jobs/${jobId}`)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Back to Job
        </button>
      </div>

      {/* Two-column layout on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Medical Records Upload (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <MedicalRecordsPanel
              jobId={jobId}
              canUpload={true}
              onExtractionComplete={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        </div>

        {/* Right: Chronology Viewer (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <ChronologyViewer
              jobId={jobId}
              canEdit={true}
              refreshKey={refreshKey}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
