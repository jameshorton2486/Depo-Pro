// =============================================================================
// MAINTENANCE PAGE
// app/maintenance/page.tsx
//
// System maintenance page
// =============================================================================

import { Wrench } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Wrench className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mt-4 mb-2">Under Maintenance</h2>
        <p className="text-gray-600 mt-2">
          We're currently performing maintenance. Please check back soon.
        </p>
      </div>
    </div>
  );
}
