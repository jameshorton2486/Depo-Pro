// components/jobs/effort-badge.tsx
// Feature 4: Estimated Review Effort Badge
// Workflow Intelligence Plan - Phase A

import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface EffortBadgeProps {
  minutes: number;
  label: string;
  confidence: string;
  className?: string;
}

export function EffortBadge({ minutes, label, confidence, className }: EffortBadgeProps) {
  // Color based on effort level
  const color =
    minutes <= 10
      ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800'
      : minutes <= 30
        ? 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800'
        : minutes <= 45
          ? 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800'
          : 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800';

  const Icon = minutes > 45 ? AlertCircle : Clock;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
              color,
              className
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div>{confidence}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
