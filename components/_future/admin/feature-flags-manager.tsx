'use client';

// =============================================================================
// FEATURE FLAGS MANAGER
// components/admin/feature-flags-manager.tsx
//
// Phase 3D-4: Admin UI for managing feature flags
// =============================================================================

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_FLAGS, type FeatureFlag } from '@/lib/feature-flags/index';
import type { UserRole } from '@/types/database';
import { toast } from 'sonner';

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  ADMIN: 'Admin',
  REPORTER: 'Reporter',
  SCOPIST: 'Scopist',
  ATTORNEY: 'Attorney',
  AGENCY: 'Agency',
  PARALEGAL: 'Paralegal',
  AGENCY_ADMIN: 'Agency Admin',
  FIRM_ADMIN: 'Firm Admin',
};

type FlagValue = Omit<FeatureFlag, 'createdAt' | 'updatedAt'>;

export function FeatureFlagsManager() {
  const [flags, setFlags] = useState<Record<string, FlagValue>>(DEFAULT_FLAGS);

  const handleToggle = (flagId: string, enabled: boolean) => {
    setFlags((prev: Record<string, FlagValue>) => {
      const flag = prev[flagId];
      if (!flag) return prev;
      return {
        ...prev,
        [flagId]: {
          ...flag,
          enabled,
        },
      };
    });
    toast.success(`Feature ${enabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="space-y-4">
      {Object.entries(flags).map(([key, flag]: [string, FlagValue]) => (
        <Card key={key}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{flag.name}</CardTitle>
                <CardDescription className="mt-1">{flag.description}</CardDescription>
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={(checked) => handleToggle(flag.id, checked)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Available Roles:</Label>
              <div className="flex flex-wrap gap-2">
                {flag.roles.length === 0 ? (
                  <Badge variant="outline">All Roles</Badge>
                ) : (
                  flag.roles.map((role: UserRole) => (
                    <Badge key={role} variant="secondary">
                      {ROLE_LABELS[role] || role}
                    </Badge>
                  ))
                )}
              </div>
              {!flag.enabled && (
                <p className="text-xs text-muted-foreground mt-2">
                  This feature is currently disabled for all roles.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
