'use client';

// =============================================================================
// EXPORT PROFILE SELECTOR
// components/export/profile-selector.tsx
//
// Phase 3C-1: Card-based profile selection
// =============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, File, Archive, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllExportProfiles, type ExportProfile } from '@/lib/export/profiles';
import { canUseProfile } from '@/lib/export/permissions';
import { UserRole } from '@prisma/client';

interface ProfileSelectorProps {
  selectedProfileId?: string;
  onSelect: (profile: ExportProfile) => void;
  userRole: UserRole;
  className?: string;
}

const FORMAT_ICONS: Record<string, typeof FileText> = {
  docx: FileText,
  pdf: File,
  zip: Archive,
  txt: FileCode,
};

export function ProfileSelector({
  selectedProfileId,
  onSelect,
  userRole,
  className,
}: ProfileSelectorProps) {
  const profiles = getAllExportProfiles().filter((profile) =>
    canUseProfile(userRole, profile.id)
  );

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {profiles.map((profile) => {
        const Icon = FORMAT_ICONS[profile.format] || FileText;
        const isSelected = selectedProfileId === profile.id;

        return (
          <Card
            key={profile.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary',
              isSelected && 'border-primary ring-2 ring-primary'
            )}
            onClick={() => onSelect(profile)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{profile.name}</CardTitle>
                </div>
                <Badge variant="outline">{profile.format.toUpperCase()}</Badge>
              </div>
              <CardDescription className="mt-2">{profile.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-1">
                {profile.options.lineNumbers && (
                  <div>✓ Line numbers included</div>
                )}
                {profile.options.includeCertificate && (
                  <div>✓ Certificate included</div>
                )}
                {profile.options.watermark && (
                  <div>✓ Watermark: {profile.options.watermark}</div>
                )}
                {profile.options.includeAnnotations && (
                  <div>✓ Annotations visible</div>
                )}
                {profile.options.includeComments && (
                  <div>✓ Comments included</div>
                )}
                {profile.format === 'zip' && (
                  <div>✓ Multiple formats + audio + metadata</div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
