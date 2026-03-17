'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IntakeAudioStep } from '@/components/intake/IntakeAudioStep';

interface JobAudioSectionProps {
  jobId: string;
  jobTitle: string;
  audioFileUrl: string | null;
  audioFileName?: string | null;
}

export function JobAudioSection({ jobId, jobTitle, audioFileUrl, audioFileName }: JobAudioSectionProps) {
  const router = useRouter();

  if (audioFileUrl) {
    const displayName =
      audioFileName ?? audioFileUrl.split('/').pop()?.replace(/_/g, ' ') ?? 'Audio file';

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Audio Recording{' '}
            <span className="ml-2 text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Attached
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground truncate">{displayName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>
          Audio Recording{' '}
          <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            No audio attached
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <IntakeAudioStep
          jobId={jobId}
          jobTitle={jobTitle}
          onComplete={() => router.refresh()}
          onSkip={() => {}}
        />
      </CardContent>
    </Card>
  );
}
