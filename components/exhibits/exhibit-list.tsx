// components/exhibits/exhibit-list.tsx
'use client';

import { useState } from 'react';
import { 
  FileText, 
  Image, 
  File, 
  Eye, 
  Download, 
  Trash2, 
  Pencil,
  Check,
  X,
  FileBox
} from 'lucide-react';
import { toast } from 'sonner';

interface Exhibit {
  id: string;
  exhibitNumber: number;
  description: string;
  originalFileUrl: string;
  stampedFileUrl: string | null;
  fileType: 'PDF' | 'IMAGE' | 'DOCX';
  mimeType: string;
  fileSize: number;
  stamped: boolean;
  createdAt: string;
  createdBy?: {
    name: string | null;
    email: string;
  };
}

interface ExhibitListProps {
  jobId: string;
  exhibits: Exhibit[];
  onUpdate: () => void;
}

export function ExhibitList({ jobId, exhibits, onUpdate }: ExhibitListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'IMAGE':
        return <Image className="w-5 h-5 text-blue-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const startEditing = (exhibit: Exhibit) => {
    setEditingId(exhibit.id);
    setEditDescription(exhibit.description);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDescription('');
  };

  const saveDescription = async (exhibitId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/exhibits/${exhibitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to update description');
      }

      toast.success('Description updated');
      setEditingId(null);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update description');
    }
  };

  const deleteExhibit = async (exhibitId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/exhibits/${exhibitId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete exhibit');
      }

      toast.success('Exhibit deleted');
      setDeletingId(null);
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete exhibit');
    }
  };

  // Empty state
  if (exhibits.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <FileBox className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">No exhibits yet</h3>
        <p className="text-sm text-gray-500">
          Upload PDFs, images, or documents to add exhibits to this job.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exhibits.map(exhibit => (
        <div
          key={exhibit.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          {/* Left: Icon, Number, Description */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {getFileIcon(exhibit.fileType)}
            
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 font-semibold text-sm rounded-full">
                {exhibit.exhibitNumber}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {editingId === exhibit.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter description..."
                    autoFocus
                  />
                  <button
                    onClick={() => saveDescription(exhibit.id)}
                    className="p-1 text-green-600 hover:text-green-700"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-1 text-gray-400 hover:text-gray-500"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 truncate">
                    {exhibit.description || 'No description'}
                  </span>
                  <button
                    onClick={() => startEditing(exhibit)}
                    className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                    title="Edit description"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{formatFileSize(exhibit.fileSize)}</span>
                {exhibit.stamped && (
                  <span className="text-xs text-green-600 font-medium">Stamped</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 ml-4">
            {/* View */}
            <a
              href={exhibit.stampedFileUrl || exhibit.originalFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </a>

            {/* Download dropdown or buttons */}
            <div className="relative group">
              <button
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <a
                  href={exhibit.originalFileUrl}
                  download
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Original
                </a>
                {exhibit.stampedFileUrl && (
                  <a
                    href={exhibit.stampedFileUrl}
                    download
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Stamped
                  </a>
                )}
              </div>
            </div>

            {/* Edit */}
            <button
              onClick={() => startEditing(exhibit)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Edit description"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Delete */}
            {deletingId === exhibit.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteExhibit(exhibit.id)}
                  className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeletingId(exhibit.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
