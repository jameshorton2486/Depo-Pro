'use client';

// =============================================================================
// TRANSCRIPT STATUS BADGE
// components/transcripts/status-badge.tsx
//
// Phase 3B-1: Visual status indicator for transcripts
// =============================================================================

import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Lock, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TranscriptStatus = 'DRAFT' | 'IN_REVIEW' | 'FINALIZED' | 'DELIVERED';

interface StatusBadgeProps {
  status: TranscriptStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  TranscriptStatus,
  {
    label: string;
    icon: typeof FileText;
    className: string;
  }
> = {
  DRAFT: {
    label: 'Draft',
    icon: FileText,
    className: 'bg-gray-500 hover:bg-gray-600 text-white',
  },
  IN_REVIEW: {
    label: 'In Review',
    icon: Eye,
    className: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  FINALIZED: {
    label: 'Finalized',
    icon: Lock,
    className: 'bg-green-500 hover:bg-green-600 text-white',
  },
  DELIVERED: {
    label: 'Delivered',
    icon: Send,
    className: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
};

export function TranscriptStatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge className={cn('inline-flex items-center gap-1.5 font-medium', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </Badge>
  );
}
