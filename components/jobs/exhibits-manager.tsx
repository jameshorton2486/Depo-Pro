// ═══════════════════════════════════════════════════════════════
// EXHIBITS MANAGER COMPONENT
// components/jobs/exhibits-manager.tsx
// Upload and manage deposition exhibits
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  Eye, 
  Edit, 
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Exhibit {
  id: string;
  exhibitNumber: number;
  description: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  originalFileUrl: string;
  stampedFileUrl: string | null;
  stamped: boolean;
  createdAt: Date;
}

interface ExhibitsManagerProps {
  jobId: string;
  canEdit: boolean;
}

export function ExhibitsManager({ jobId, canEdit }: ExhibitsManagerProps) {
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [autoNumber, setAutoNumber] = useState(true);
  const [applyStamp, setApplyStamp] = useState(false);

  // Fetch exhibits
  const fetchExhibits = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/exhibits`);
      if (!response.ok) throw new Error('Failed to fetch exhibits');
      const data = await response.json();
      setExhibits(data.exhibits || []);
    } catch (error) {
      console.error('Error fetching exhibits:', error);
      toast.error('Failed to load exhibits');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchExhibits();
  }, [fetchExhibits]);

  // Handle file upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!canEdit) {
      toast.error('You do not have permission to upload exhibits');
      return;
    }

    if (!acceptedFiles.length) {
      toast.error('No files selected');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      // Add files
      acceptedFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Add options
      formData.append('autoNumber', autoNumber.toString());
      formData.append('applyStamp', applyStamp.toString());

      // Add descriptions (optional - can be edited after)
      acceptedFiles.forEach((file, index) => {
        formData.append(`description_${index}`, file.name);
      });

      const response = await fetch(`/api/jobs/${jobId}/exhibits`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload exhibits');
      }

      const result = await response.json();
      
      if (result.failed > 0) {
        toast.warning(`Uploaded ${result.uploaded}, failed ${result.failed}`);
      } else {
        toast.success(`Successfully uploaded ${result.uploaded} exhibit(s)`);
      }

      // Refresh exhibits list
      await fetchExhibits();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload exhibits');
    } finally {
      setUploading(false);
    }
  }, [jobId, autoNumber, applyStamp, canEdit, fetchExhibits]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: !canEdit || uploading,
  });

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="h-5 w-5 text-red-600" />;
      case 'IMAGE':
        return <Image className="h-5 w-5 text-blue-600" />;
      default:
        return <File className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Exhibits</CardTitle>
            <CardDescription>
              Manage deposition exhibits (PDFs, images, documents)
            </CardDescription>
          </div>
          {canEdit && (
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = '.pdf,.jpg,.jpeg,.png,.docx';
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  if (files.length) onDrop(files);
                };
                input.click();
              }}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Exhibits
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {canEdit && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 mb-6 cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary/50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG, DOCX (max 50MB each)
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {canEdit && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoNumber"
                checked={autoNumber}
                onCheckedChange={(checked) => setAutoNumber(checked === true)}
              />
              <Label htmlFor="autoNumber" className="text-sm cursor-pointer">
                Auto-number exhibits
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="applyStamp"
                checked={applyStamp}
                onCheckedChange={(checked) => setApplyStamp(checked === true)}
              />
              <Label htmlFor="applyStamp" className="text-sm cursor-pointer">
                Apply exhibit stamp (PDF only)
              </Label>
            </div>
          </div>
        )}

        {exhibits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No exhibits uploaded yet</p>
            {canEdit && <p className="text-sm mt-1">Upload files to get started</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {exhibits.map((exhibit) => (
              <div
                key={exhibit.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(exhibit.fileType)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Exhibit {exhibit.exhibitNumber}</span>
                      {exhibit.stamped && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Stamped
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {exhibit.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exhibit.fileType} • {formatFileSize(exhibit.fileSize)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = exhibit.stamped && exhibit.stampedFileUrl
                        ? exhibit.stampedFileUrl
                        : exhibit.originalFileUrl;
                      window.open(url, '_blank');
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

