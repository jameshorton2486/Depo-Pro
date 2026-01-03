// =============================================================================
// TRANSCRIPTION UPLOAD PAGE
// app/transcription/upload/page.tsx
//
// Job creation and audio file upload
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';

type Step = 'details' | 'upload' | 'processing';

export default function TranscriptionUploadPage() {
  const [step, setStep] = useState<Step>('details');
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleJobSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseName: formData.get('caseName'),
          title: formData.get('title'),
          depositionDate: formData.get('depositionDate'),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create job');
      }

      const data = await res.json();
      setJobId(data.id);
      setStep('upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  }

  function handleUploadComplete() {
    setStep('processing');
    // Redirect to status page after a moment
    setTimeout(() => {
      if (jobId) {
        router.push(`/transcription/status/${jobId}`);
      }
    }, 2000);
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">New Transcription Job</h1>
      
      {/* Progress Steps */}
      <div className="flex mb-8">
        <StepIndicator
          number={1}
          label="Job Details"
          active={step === 'details'}
          completed={step !== 'details'}
        />
        <StepIndicator
          number={2}
          label="Upload Audio"
          active={step === 'upload'}
          completed={step === 'processing'}
        />
        <StepIndicator
          number={3}
          label="Processing"
          active={step === 'processing'}
          completed={false}
        />
      </div>

      {step === 'details' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Job Details</h2>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleJobSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Case Name *</label>
              <input
                name="caseName"
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Smith v. Jones"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                name="title"
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Deposition of John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Deposition Date</label>
              <input
                name="depositionDate"
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Continue to Upload'}
            </button>
          </form>
        </div>
      )}

      {step === 'upload' && jobId && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Upload Audio File</h2>
          <p className="text-gray-600 mb-4">
            Upload your audio file to begin transcription. Supported formats: MP3, WAV, M4A
          </p>
          <FileUploadComponent
            jobId={jobId}
            onComplete={handleUploadComplete}
          />
        </div>
      )}

      {step === 'processing' && jobId && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Loader2 className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-lg font-semibold mb-2">Processing Your File</h2>
          <p className="text-gray-600 mb-4">
            Your file is being processed. This may take a few minutes.
          </p>
          <Link
            href={`/transcription/status/${jobId}`}
            className="text-indigo-600 hover:underline font-semibold"
          >
            View Status →
          </Link>
        </div>
      )}
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex-1 flex items-center">
      <div className="flex items-center flex-1">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
            active
              ? 'bg-indigo-600 text-white'
              : completed
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {completed ? <CheckCircle className="w-5 h-5" /> : number}
        </div>
        <span className={`ml-2 text-sm ${active ? 'font-semibold' : 'text-gray-500'}`}>
          {label}
        </span>
      </div>
      {number < 3 && (
        <div className={`flex-1 h-0.5 mx-2 ${completed ? 'bg-green-500' : 'bg-gray-200'}`} />
      )}
    </div>
  );
}

function FileUploadComponent({
  jobId,
  onComplete,
}: {
  jobId: string;
  onComplete: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobId', jobId);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          setUploading(false);
          onComplete();
        } else {
          alert('Upload failed');
          setUploading(false);
        }
      });

      xhr.open('POST', `/api/jobs/${jobId}/upload`);
      xhr.send(formData);
    } catch (_err) {
      alert('Upload failed');
      setUploading(false);
    }
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600 mb-4">
        {uploading ? `Uploading... ${progress}%` : 'Select an audio file to upload'}
      </p>
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        id="audio-upload"
      />
      <label
        htmlFor="audio-upload"
        className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold cursor-pointer disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Choose File'}
      </label>
      {uploading && (
        <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
