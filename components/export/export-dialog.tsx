'use client';

// =============================================================================
// components/export/export-dialog.tsx
// Universal Export Dialog Component
// =============================================================================

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, FileText, Terminal, Cloud, Loader2, CheckCircle2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ExportFormat = 'docx' | 'pdf' | 'txt' | 'ascii' | 'google-docs' | 'zip';

const FORMATS: Record<ExportFormat, { name: string; icon: typeof FileText; desc: string }> = {
  docx: { name: 'Microsoft Word', icon: FileText, desc: 'Editable document' },
  pdf: { name: 'PDF', icon: FileText, desc: 'Read-only delivery' },
  txt: { name: 'Plain Text', icon: FileText, desc: 'Simple text file' },
  ascii: { name: 'ASCII (Legacy)', icon: Terminal, desc: 'Court systems' },
  'google-docs': { name: 'Google Docs', icon: Cloud, desc: 'Cloud collaboration' },
  zip: { name: 'ZIP Archive', icon: Archive, desc: 'All pages as separate files' },
};

interface ExportDialogProps {
  jobId: string;
  caseName?: string;
  trigger?: React.ReactNode;
}

export function ExportDialog({ jobId, caseName, trigger }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('docx');
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState({
    includeLineNumbers: true,
    includePageNumbers: true,
    includeSpeakerLabels: true,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          ...options,
        }),
      });

      if (format === 'google-docs') {
        const data = await res.json();
        if (!res.ok) {
          if (data.code === 'GOOGLE_NOT_CONNECTED') {
            toast.error('Please connect your Google account in Settings → Integrations');
          } else {
            throw new Error(data.error || 'Failed to create Google Doc');
          }
          return;
        }

        if (data.documentUrl) {
          window.open(data.documentUrl, '_blank');
          toast.success('Google Doc created successfully!');
        }
      } else {
        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: 'Export failed' }));
          throw new Error(error.error || 'Export failed');
        }

        const blob = await res.blob();
        const contentDisposition = res.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.match(/filename="(.+)"/)?.[1] || `transcript.${format}`
          : `transcript.${format}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Downloaded ${filename}`);
      }

      setOpen(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const FormatIcon = FORMATS[format].icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Transcript</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <FormatIcon className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FORMATS).map(([key, info]) => {
                  const Icon = info.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{info.name}</div>
                          <div className="text-xs text-muted-foreground">{info.desc}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{FORMATS[format].desc}</p>
          </div>

          {/* Export Options */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-semibold">Options</Label>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="line-numbers" className="text-sm font-normal">
                  Line Numbers
                </Label>
                <p className="text-xs text-muted-foreground">Include line numbers every 5 lines</p>
              </div>
              <Switch
                id="line-numbers"
                checked={options.includeLineNumbers}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeLineNumbers: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="page-numbers" className="text-sm font-normal">
                  Page Numbers
                </Label>
                <p className="text-xs text-muted-foreground">Include page numbers in footer</p>
              </div>
              <Switch
                id="page-numbers"
                checked={options.includePageNumbers}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includePageNumbers: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="speaker-labels" className="text-sm font-normal">
                  Speaker Labels
                </Label>
                <p className="text-xs text-muted-foreground">Include speaker identification</p>
              </div>
              <Switch
                id="speaker-labels"
                checked={options.includeSpeakerLabels}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeSpeakerLabels: checked }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {format === 'google-docs' ? 'Creating...' : 'Exporting...'}
              </>
            ) : (
              <>
                {format === 'google-docs' ? (
                  <Cloud className="h-4 w-4 mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {format === 'google-docs' ? 'Create Doc' : 'Download'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// QUICK EXPORT DROPDOWN
// =============================================================================

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function ExportDropdown({ jobId, caseName }: { jobId: string; caseName?: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/export?format=${format}`, {
        method: 'GET',
      });

      if (format === 'google-docs') {
        const data = await res.json();
        if (!res.ok) {
          if (data.code === 'GOOGLE_NOT_CONNECTED') {
            toast.error('Please connect your Google account in Settings');
          } else {
            toast.error(data.error || 'Failed to create Google Doc');
          }
          return;
        }

        if (data.documentUrl) {
          window.open(data.documentUrl, '_blank');
          toast.success('Google Doc created!');
        }
      } else {
        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: 'Export failed' }));
          toast.error(error.error || 'Export failed');
          return;
        }

        const blob = await res.blob();
        const contentDisposition = res.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.match(/filename="(.+)"/)?.[1] || `transcript.${format}`
          : `transcript.${format}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Downloaded ${filename}`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleQuickExport('docx')}>
          <FileText className="h-4 w-4 mr-2" />
          Word (DOCX)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleQuickExport('pdf')}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleQuickExport('txt')}>
          <FileText className="h-4 w-4 mr-2" />
          Plain Text
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleQuickExport('google-docs')}>
          <Cloud className="h-4 w-4 mr-2" />
          Google Docs
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleQuickExport('ascii')}>
          <Terminal className="h-4 w-4 mr-2" />
          ASCII (Legacy)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleQuickExport('zip')}>
          <Archive className="h-4 w-4 mr-2" />
          ZIP Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            // Open full dialog - would need to pass ref or use state management
            toast.info('Use the Export button for more options');
          }}
          className="text-muted-foreground"
        >
          More options...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// QUICK EXPORT BUTTONS
// =============================================================================

export function QuickExportButton({
  jobId,
  format,
  children,
}: {
  jobId: string;
  format: ExportFormat;
  children: React.ReactNode;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/export?format=${format}`, {
        method: 'GET',
      });

      if (format === 'google-docs') {
        const data = await res.json();
        if (!res.ok) {
          if (data.code === 'GOOGLE_NOT_CONNECTED') {
            toast.error('Please connect your Google account in Settings');
          } else {
            toast.error(data.error || 'Failed to create Google Doc');
          }
          return;
        }

        if (data.documentUrl) {
          window.open(data.documentUrl, '_blank');
          toast.success('Google Doc created!');
        }
      } else {
        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: 'Export failed' }));
          toast.error(error.error || 'Export failed');
          return;
        }

        const blob = await res.blob();
        const contentDisposition = res.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.match(/filename="(.+)"/)?.[1] || `transcript.${format}`
          : `transcript.${format}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Downloaded ${filename}`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const Icon = FORMATS[format].icon;

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 mr-2" />
      )}
      {children}
    </Button>
  );
}
