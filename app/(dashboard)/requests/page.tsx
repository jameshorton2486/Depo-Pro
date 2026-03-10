'use client';

import { MyRequestsPanel } from '@/components/dashboard/MyRequestsPanel';

export default function RequestsPage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-3xl font-bold">My Requests</h1>
      <MyRequestsPanel />
    </div>
  );
}
