'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioUploadProps {
  jobId: string;
  onUploaded?: () => void;
}

export function AudioUpload({ jobId, onUploaded }: AudioUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/jobs/${jobId}/files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Audio upload failed');
      }

      onUploaded?.();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Audio upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
        className="hidden"
        onChange={handleUpload}
        aria-label="Upload audio file"
      />
      <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? 'Uploading audio...' : 'Upload Audio'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
