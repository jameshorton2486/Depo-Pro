// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, FileText, Download, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface FileWithUser {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileType: string;
  createdAt: Date;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface FileUploadProps {
  jobId: string;
  files: FileWithUser[];
  canUpload: boolean;
  canDelete: boolean;
}

export function FileUpload({ jobId, files, canUpload, canDelete }: FileUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCancelUpload = () => {
    abortControllerRef.current?.abort();
    setUploading(false);
    toast.info('Upload cancelled');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/jobs/${jobId}/files`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      router.refresh();
      toast.success('File uploaded successfully');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // User cancelled — already handled by handleCancelUpload
        return;
      }
      console.error('[upload] Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    setDeleting(fileId);

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      router.refresh();
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Files ({files.length})
          </CardTitle>
          {canUpload && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleFileSelect}
                disabled={uploading}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
              {uploading && (
                <Button variant="ghost" size="sm" onClick={handleCancelUpload}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.mp4,.mov"
          aria-label="Upload file"
        />

        {files.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No files uploaded yet</p>
            {canUpload && (
              <Button
                onClick={handleFileSelect}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Upload your first file
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-medium truncate">{file.originalName}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.fileType}</span>
                    <span>•</span>
                    <span>Uploaded {formatDate(file.createdAt)}</span>
                    <span>•</span>
                    <span>{file.uploadedBy.name}</span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Download file
                      window.open(`/api/files/${file.id}/download`, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(file.id)}
                      disabled={deleting === file.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deleting === file.id ? (
                        <X className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
