// ═══════════════════════════════════════════════════════════════
// JOB STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface JobStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  CREATED: {
    label: 'Scheduled – Awaiting Deposition',
    className: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  FILES_UPLOADED: {
    label: 'Recording Needed',
    className: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  ENHANCING_AUDIO: {
    label: 'Processing Audio',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  },
  TRANSCRIBING: {
    label: 'Transcribing',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  AI_REVIEWING: {
    label: 'AI Formatting',
    className: 'bg-pink-100 text-pink-700 border-pink-300',
  },
  READY_FOR_EDIT: {
    label: 'Ready for Proofing',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  ASSIGNED: {
    label: 'Assigned to Scopist',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  IN_EDIT: {
    label: 'In Proofing',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  SUBMITTED_FOR_REVIEW: {
    label: 'Submitted for Reporter Review',
    className: 'bg-teal-100 text-teal-700 border-teal-300',
  },
  SCOPIST_COMPLETE: {
    label: 'Scopist Complete',
    className: 'bg-teal-100 text-teal-700 border-teal-300',
  },
  IN_REVIEW: {
    label: 'Reporter Review',
    className: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  },
  REVIEW_COMPLETE: {
    label: 'Pending Delivery',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  COMPLETED: {
    label: 'Delivered',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border-red-400',
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-gray-100 text-gray-600 border-gray-300',
  },
};

const FALLBACK_CONFIG = {
  label: 'Unknown',
  className: 'bg-gray-100 text-gray-600 border-gray-300',
};

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = statusConfig[status] || FALLBACK_CONFIG;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
