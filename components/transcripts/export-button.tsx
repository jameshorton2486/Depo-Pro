"use client";

import { useState } from 'react';
import { ChevronDown, Download, File, FileText, FileType } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  transcriptId: string;
  className?: string;
}

type ExportFormat = 'docx' | 'pdf' | 'txt';

const formatOptions = [
  { value: 'docx' as ExportFormat, label: 'Word Document', icon: FileText, desc: 'Microsoft Word format' },
  { value: 'pdf' as ExportFormat, label: 'PDF Document', icon: File, desc: 'Portable document format' },
  { value: 'txt' as ExportFormat, label: 'Plain Text', icon: FileType, desc: 'ASCII for legacy systems' },
];

export function ExportButton({ transcriptId, className }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      const response = await fetch(`/api/transcripts/${transcriptId}/export?format=${format}&lineNumbers=true`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `transcript.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=\"(.+)\"/);
        if (match) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export transcript. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <Button onClick={() => setIsOpen(!isOpen)} disabled={isExporting} variant="outline" className="gap-2">
        <Download className="h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export'}
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="p-2">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleExport(option.value)}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <option.icon className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
