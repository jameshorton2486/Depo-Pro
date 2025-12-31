'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProperNounsReferencePanelProps {
  jobId: string;
  className?: string;
}

export function ProperNounsReferencePanel({
  jobId,
  className,
}: ProperNounsReferencePanelProps) {
  const [properNouns, setProperNouns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadProperNouns = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/notes?type=PROPER_NOUN`);
        if (!response.ok) throw new Error('Failed to load');

        const data = await response.json();
        const notes = data.success ? data.data.notes : data.notes;

        if (notes?.length > 0) {
          // Combine all note contents and split by newline
          const allContent = notes.map((n: any) => n.content).join('\n');
          const entries = allContent
            .split('\n')
            .map((s: string) => s.trim())
            .filter(Boolean);
          setProperNouns(entries);
        }
      } catch (err) {
        console.error('Failed to load proper nouns:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProperNouns();
  }, [jobId]);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (_err) {
      toast.error('Failed to copy');
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (properNouns.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reporter Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            No proper nouns provided by reporter.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Reporter Reference
          <span className="text-xs font-normal text-muted-foreground">
            (Not Transcript Content)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 pr-4">
            {properNouns.map((noun, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50 transition-colors group"
              >
                <span className="text-sm font-mono flex-1">{noun}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopy(noun, index)}
                  title="Copy to clipboard"
                >
                  {copiedIndex === index ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground mt-3 italic">
          Reference only. These spellings were provided by the reporter for transcription accuracy.
        </p>
      </CardContent>
    </Card>
  );
}
