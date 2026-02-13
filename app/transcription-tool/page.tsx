// =============================================================================
// HIGH-ACCURACY TRANSCRIPTION TOOL
// app/transcription-tool/page.tsx
//
// Dedicated page for uploading audio/video files with automatic
// extraction, normalization (16kHz mono WAV), and Deepgram transcription.
//
// Accessible by: Court Reporter, Scopist (assigned jobs only), Admin
// =============================================================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  Upload,
  FileAudio,
  FileVideo,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  X,
  ChevronDown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToolStep = 'upload' | 'processing' | 'complete' | 'error';

interface JobOption {
  id: string;
  title: string;
  caseName: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

const ACCEPTED_EXTENSIONS = [
  '.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.webm',
  '.mp4', '.mov', '.mkv', '.avi',
];

const ACCEPTED_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/flac',
  'audio/ogg', 'audio/webm',
  'video/mp4', 'video/quicktime', 'video/x-matroska',
  'video/avi', 'video/x-msvideo', 'video/webm',
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function TranscriptionToolPage() {
  const _router = useRouter();

  // Step state
  const [step, setStep] = useState<ToolStep>('upload');

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Job state
  const [jobMode, setJobMode] = useState<'new' | 'existing'>('new');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [caseName, setCaseName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [existingJobs, setExistingJobs] = useState<JobOption[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Processing state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resultJobId, setResultJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // ---------------------------------------------------------------------------
  // Load existing jobs for dropdown
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadJobs() {
      setLoadingJobs(true);
      try {
        const res = await fetch('/api/jobs?limit=50');
        if (res.ok) {
          const data = await res.json();
          const jobs: JobOption[] = (data.jobs || []).map((j: any) => ({
            id: j.id,
            title: j.title || j.caseName || 'Untitled',
            caseName: j.caseName || '',
            status: j.status,
          }));
          setExistingJobs(jobs);
        }
      } catch {
        // Non-critical — user can still create new
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  // ---------------------------------------------------------------------------
  // Drag & Drop Handlers
  // ---------------------------------------------------------------------------
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      validateAndSetFile(dropped);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndSetFile(selected);
    }
  }, []);

  function validateAndSetFile(f: File) {
    setErrorMessage('');

    if (f.size > MAX_FILE_SIZE) {
      setErrorMessage('File exceeds the 2GB limit.');
      return;
    }

    if (f.size === 0) {
      setErrorMessage('File is empty.');
      return;
    }

    const ext = '.' + (f.name.split('.').pop()?.toLowerCase() || '');
    const mimeOk = ACCEPTED_MIME_TYPES.includes(f.type);
    const extOk = ACCEPTED_EXTENSIONS.includes(ext);

    if (!mimeOk && !extOk) {
      setErrorMessage(
        `Unsupported format (${ext || f.type}). Accepted: MP3, WAV, M4A, AAC, FLAC, MP4, MOV, MKV, AVI`,
      );
      return;
    }

    setFile(f);
  }

  // ---------------------------------------------------------------------------
  // Submit Handler
  // ---------------------------------------------------------------------------
  async function handleSubmit() {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    if (jobMode === 'existing' && selectedJobId) {
      formData.append('jobId', selectedJobId);
    } else {
      formData.append('createNewJob', 'true');
      if (caseName.trim()) formData.append('caseName', caseName.trim());
      if (jobTitle.trim()) formData.append('title', jobTitle.trim());
    }

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setResultJobId(data.jobId);
            setStep('complete');
          } catch {
            setErrorMessage('Invalid server response');
            setStep('error');
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            setErrorMessage(data.error || `Upload failed (${xhr.status})`);
          } catch {
            setErrorMessage(`Upload failed with status ${xhr.status}`);
          }
          setStep('error');
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        setErrorMessage('Network error. Please check your connection.');
        setStep('error');
        setUploading(false);
      });

      xhr.open('POST', '/api/transcription-tool/start');
      setStep('processing');
      xhr.send(formData);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
      setStep('error');
      setUploading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const isVideo = file?.type.startsWith('video/');

  function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  const canSubmit =
    file &&
    !uploading &&
    (jobMode === 'new' || (jobMode === 'existing' && selectedJobId));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700
            dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
            <Mic className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            High-Accuracy Transcription
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-8 ml-14">
          Upload audio or video files. Audio is automatically extracted, normalized
          to 16kHz mono, and processed through Deepgram Nova-3 for litigation-grade accuracy.
        </p>

        {/* ================================================================= */}
        {/* STEP: UPLOAD                                                      */}
        {/* ================================================================= */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Enhancement Badge */}
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20
              border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Audio normalization improves word confidence by 3–8% on average,
                with better speaker separation and medical term recognition.
              </p>
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20
                border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
                </div>
                <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* File Upload Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200
              dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Upload File
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Audio or video — we handle extraction and normalization automatically.
                </p>
              </div>

              <div className="p-6">
                {!file ? (
                  /* Drop Zone */
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10
                      text-center transition-all duration-200
                      ${dragActive
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                      }`}
                  >
                    <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors
                      ${dragActive ? 'text-indigo-500' : 'text-slate-400'}`}
                    />
                    <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">
                      {dragActive ? 'Drop your file here' : 'Drag and drop or click to browse'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      MP3, WAV, M4A, AAC, FLAC, MP4, MOV, MKV, AVI — up to 2GB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_EXTENSIONS.join(',')}
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>
                ) : (
                  /* File Selected */
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex-shrink-0">
                      {isVideo
                        ? <FileVideo className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        : <FileAudio className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatFileSize(file.size)}
                        {isVideo && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30
                            text-amber-700 dark:text-amber-300 rounded">
                            Video — audio will be extracted
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => { setFile(null); setErrorMessage(''); }}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg
                        hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Job Selection Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200
              dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Job Assignment
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Toggle */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setJobMode('new')}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all
                      ${jobMode === 'new'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                  >
                    Create New Job
                  </button>
                  <button
                    onClick={() => setJobMode('existing')}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all
                      ${jobMode === 'existing'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                  >
                    Attach to Existing Job
                  </button>
                </div>

                {/* New Job Fields */}
                {jobMode === 'new' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Case Name
                      </label>
                      <input
                        type="text"
                        value={caseName}
                        onChange={(e) => setCaseName(e.target.value)}
                        placeholder="Smith v. Jones"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600
                          bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                          focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                          placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Deposition of John Smith"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600
                          bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                          focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                          placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {/* Existing Job Selector */}
                {jobMode === 'existing' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Job
                    </label>
                    <div className="relative">
                      <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 pr-10 rounded-lg border
                          border-slate-300 dark:border-slate-600
                          bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                          focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">
                          {loadingJobs ? 'Loading jobs...' : '— Select a job —'}
                        </option>
                        {existingJobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.title} {job.caseName ? `(${job.caseName})` : ''} — {job.status}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
                        text-slate-400 pointer-events-none" />
                    </div>
                    {existingJobs.length === 0 && !loadingJobs && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        No existing jobs found. Create a new job instead.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl
                bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700
                text-white font-semibold text-lg transition-all
                disabled:cursor-not-allowed disabled:text-slate-500"
            >
              <Sparkles className="w-5 h-5" />
              Extract &amp; Transcribe
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: PROCESSING                                                  */}
        {/* ================================================================= */}
        {step === 'processing' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200
            dark:border-slate-700 p-8 text-center">
            <Loader2 className="w-14 h-14 text-indigo-600 mx-auto mb-5 animate-spin" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {uploadProgress < 100 ? 'Uploading File...' : 'Processing Started'}
            </h2>

            {uploadProgress < 100 ? (
              <>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Uploading {file?.name} — {uploadProgress}%
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 max-w-md mx-auto">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-500 dark:text-slate-400">
                  Your file is being extracted, normalized, and transcribed.
                  This can take several minutes for long recordings.
                </p>
                <div className="flex flex-col gap-2 text-left max-w-sm mx-auto text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>File uploaded to secure storage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                    <span>Extracting &amp; normalizing audio (16kHz mono WAV)</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-50">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    <span>Transcribing via Deepgram Nova-3</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-50">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    <span>Flagging low-confidence words</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: COMPLETE                                                    */}
        {/* ================================================================= */}
        {step === 'complete' && resultJobId && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200
            dark:border-slate-700 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full
              flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-9 h-9 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Transcription Started
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Your file has been uploaded and high-accuracy transcription is in progress.
              You&apos;ll be able to review flagged words once processing completes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/transcription/status`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                  bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
              >
                View Status
              </Link>
              <Link
                href={`/jobs/${resultJobId}/review`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                  border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300
                  hover:bg-slate-50 dark:hover:bg-slate-700/50 font-semibold transition-colors"
              >
                Go to Review
              </Link>
            </div>
            <button
              onClick={() => {
                setStep('upload');
                setFile(null);
                setResultJobId(null);
                setUploadProgress(0);
                setCaseName('');
                setJobTitle('');
                setSelectedJobId('');
              }}
              className="mt-4 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Transcribe another file
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: ERROR                                                       */}
        {/* ================================================================= */}
        {step === 'error' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200
            dark:border-red-800 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full
              flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-9 h-9 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Something Went Wrong
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {errorMessage || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => {
                setStep('upload');
                setErrorMessage('');
                setUploadProgress(0);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
