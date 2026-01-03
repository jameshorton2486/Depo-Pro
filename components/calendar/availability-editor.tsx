'use client';

// =============================================================================
// AVAILABILITY EDITOR
// components/calendar/availability-editor.tsx
//
// Phase 3A-2: Main availability editor component
// =============================================================================

import { useAvailability } from '@/lib/calendar/availability-store';
import { AvailabilityGrid } from './availability-grid';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function AvailabilityEditor() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please sign in to manage availability
      </div>
    );
  }

  const {
    blocks,
    loading,
    error,
    addBlock,
    updateBlock,
    removeBlock,
    refresh,
  } = useAvailability(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-2">Error loading availability</div>
        <div className="text-sm text-muted-foreground">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Manage Availability</h2>
        <p className="text-sm text-muted-foreground">
          Click time ranges to mark when you're available
        </p>
      </div>

      <AvailabilityGrid
        blocks={blocks}
        onCreate={addBlock}
        onUpdate={updateBlock}
        onDelete={removeBlock}
        onRefresh={refresh}
      />
    </div>
  );
}
