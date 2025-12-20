// components/exhibits/exhibit-upload.tsx
'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Image, File, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;

interface ExhibitUploadProps {
  jobId: string;
  onUploadComplete: () => void;
}

export function ExhibitUpload({ jobId, onUploadComplete }: ExhibitUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [applyStamp, setApplyStamp] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
      ACCEPTED_TYPES.includes(file.type as typeof ACCEPTED_TYPES[number]),
    );

    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    } else {
      toast.error('Please drop PDF, image, or Word files only');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" aria-label="Image file" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('applyStamp', String(applyStamp));

      const response = await fetch(`/api/jobs/${jobId}/exhibits`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      toast.success(`Successfully uploaded ${result.exhibits.length} exhibit(s)`);
      setFiles([]);
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload exhibits');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
            browse
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </p>
        <p className="text-xs text-gray-500">
          PDF, JPG, PNG, DOCX (max 25MB each)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(file.type)}
                <div>
                  <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-red-500 text-sm"
                disabled={isUploading}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      {files.length > 0 && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={applyStamp}
              onChange={e => setApplyStamp(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isUploading}
            />
            <span className="text-gray-700">Apply exhibit stamp to PDFs</span>
          </label>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className={`
            w-full py-2.5 px-4 rounded-lg font-medium text-white transition-colors
            ${isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }
          `}
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading {files.length} file(s)...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Upload {files.length} Exhibit{files.length !== 1 ? 's' : ''}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
