'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileAudio, FileVideo, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface IntakeAudioStepProps {
  jobId: string;
  jobTitle: string;
  onComplete: () => void;
  onSkip: () => void;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'done' | 'error';
  progress: number; // 0-100
  error?: string;
}

const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/x-m4a', 'audio/m4a', 'audio/mp4'];
const ACCEPTED_VIDEO = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ACCEPTED_ALL = [...ACCEPTED_AUDIO, ...ACCEPTED_VIDEO];
const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function xhrUpload(
  url: string,
  token: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.send(file);
  });
}

export function IntakeAudioStep({ jobId, jobTitle, onComplete, onSkip }: IntakeAudioStepProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateFile = useCallback((name: string, patch: Partial<UploadedFile>) => {
    setFiles(prev => prev.map(f => (f.name === name && f.status === 'uploading') ? { ...f, ...patch } : f));
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const entry: UploadedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
    };
    setFiles(prev => [...prev, entry]);

    try {
      // Step 1: Get signed upload URL
      const urlRes = await fetch(`/api/jobs/${jobId}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || 'Failed to get upload URL');

      const { signedUrl, token, storagePath } = urlData;

      // Step 2: Upload directly to Supabase via XHR (for progress)
      await xhrUpload(signedUrl, token, file, (pct) => {
        updateFile(file.name, { progress: pct });
      });

      // Step 3: Notify server that upload is complete
      const completeRes = await fetch(`/api/jobs/${jobId}/upload-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath,
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || 'Failed to register upload');

      setFiles(prev =>
        prev.map(f =>
          f.name === file.name && f.status === 'uploading'
            ? { ...f, status: 'done', progress: 100 }
            : f
        ),
      );
    } catch (err: any) {
      setFiles(prev =>
        prev.map(f =>
          f.name === file.name && f.status === 'uploading'
            ? { ...f, status: 'error', error: err.message }
            : f
        ),
      );
    }
  }, [jobId, updateFile]);

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;

    Array.from(incoming).forEach(file => {
      if (!ACCEPTED_ALL.includes(file.type)) {
        setFiles(prev => [
          ...prev,
          { name: file.name, size: file.size, type: file.type, status: 'error' as const, progress: 0, error: 'Unsupported format. Use MP3, WAV, M4A, MP4, or MOV.' },
        ]);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setFiles(prev => [
          ...prev,
          { name: file.name, size: file.size, type: file.type, status: 'error' as const, progress: 0, error: `File too large (${formatBytes(file.size)}). Max 2GB.` },
        ]);
        return;
      }
      uploadFile(file);
    });
  }, [uploadFile]);

  const hasSuccessful = files.some(f => f.status === 'done');
  const hasUploading = files.some(f => f.status === 'uploading');

  return (
    <Card data-testid="intake-audio-step">
      <CardHeader>
        <CardTitle>Upload Audio or Video Recording</CardTitle>
        <CardDescription>
          Upload the deposition recording for <strong>{jobTitle}</strong>.
          You can skip this and upload later from the job page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Drop zone */}
        <div
          className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
            <Upload className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Drop your file here or browse</p>
          <p className="mt-1 text-xs text-slate-500">
            Audio: MP3, WAV, M4A &nbsp;&middot;&nbsp; Video: MP4, MOV &nbsp;&middot;&nbsp; Max 2GB
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => inputRef.current?.click()}
          >
            Choose File
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".mp3,.wav,.m4a,.mp4,.mov"
            multiple
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((f, i) => {
              const Icon = ACCEPTED_VIDEO.includes(f.type) ? FileVideo : FileAudio;
              return (
                <li key={`${f.name}-${i}`} className="rounded-lg border bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{f.name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(f.size)}</p>
                      {f.error && <p className="text-xs text-red-600">{f.error}</p>}
                    </div>
                    {f.status === 'uploading' && (
                      <span className="text-xs font-medium text-blue-600">{f.progress}%</span>
                    )}
                    {f.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {f.status === 'done' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    {f.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {f.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {/* Progress bar */}
                  {f.status === 'uploading' && (
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onSkip} disabled={hasUploading}>
            Skip — upload later
          </Button>
          <Button
            type="button"
            onClick={onComplete}
            disabled={hasUploading || !hasSuccessful}
          >
            {hasUploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
            ) : hasSuccessful ? (
              'Continue'
            ) : (
              'Upload a file to continue'
            )}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
