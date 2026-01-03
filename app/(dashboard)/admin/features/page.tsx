// =============================================================================
// FEATURE FLAGS MANAGEMENT
// app/(dashboard)/admin/features/page.tsx
//
// Phase 3D-4: Admin UI for feature flag management
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { FeatureFlagsManager } from '@/components/_future/admin/feature-flags-manager';

export const metadata = {
  title: 'Feature Flags | Depo-Pro',
  description: 'Manage feature flags and feature access',
};

export default async function FeaturesPage() {
  const session = await getCurrentUser();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enable or disable features by role
        </p>
      </div>

      <FeatureFlagsManager />
    </div>
  );
}
