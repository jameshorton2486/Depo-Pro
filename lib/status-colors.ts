// ═══════════════════════════════════════════════════════════════════════════════
// STATUS COLOR UTILITIES
// lib/status-colors.ts
//
// Centralized status color management for consistent UI
// Use these utilities instead of hardcoded hex colors
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type JobStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'CONVERTED';

export type TranscriptStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY_FOR_EDIT'
  | 'IN_EDIT'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'COMPLETED'
  | 'FAILED';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'critical';

export type SemanticColor = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOB STATUS COLORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Tailwind classes for job/deposition status
 * Uses CSS variables for dark mode support
 */
export function getStatusClasses(status: JobStatus): StatusStyle {
  const statusMap: Record<JobStatus, StatusStyle> = {
    REQUESTED: {
      bg: 'bg-amber-50 dark:bg-amber-950',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
    },
    SCHEDULED: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      dot: 'bg-blue-500',
    },
    CONFIRMED: {
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      dot: 'bg-green-500',
    },
    IN_PROGRESS: {
      bg: 'bg-cyan-50 dark:bg-cyan-950',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800',
      dot: 'bg-cyan-500',
    },
    COMPLETED: {
      bg: 'bg-gray-50 dark:bg-gray-900',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-700',
      dot: 'bg-gray-500',
    },
    CANCELLED: {
      bg: 'bg-red-50 dark:bg-red-950',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      dot: 'bg-red-500',
    },
    RESCHEDULED: {
      bg: 'bg-purple-50 dark:bg-purple-950',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      dot: 'bg-purple-500',
    },
    CONVERTED: {
      bg: 'bg-indigo-50 dark:bg-indigo-950',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
      dot: 'bg-indigo-500',
    },
  };

  return statusMap[status] || statusMap.SCHEDULED;
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    REQUESTED: 'Requested',
    SCHEDULED: 'Scheduled',
    CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    RESCHEDULED: 'Rescheduled',
    CONVERTED: 'Converted',
  };

  return labels[status] || status;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSCRIPT STATUS COLORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Tailwind classes for transcript status
 */
export function getTranscriptStatusClasses(status: TranscriptStatus): StatusStyle {
  const statusMap: Record<TranscriptStatus, StatusStyle> = {
    PENDING: {
      bg: 'bg-gray-50 dark:bg-gray-900',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-700',
      dot: 'bg-gray-400',
    },
    PROCESSING: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      dot: 'bg-blue-500 animate-pulse',
    },
    READY_FOR_EDIT: {
      bg: 'bg-amber-50 dark:bg-amber-950',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
    },
    IN_EDIT: {
      bg: 'bg-cyan-50 dark:bg-cyan-950',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800',
      dot: 'bg-cyan-500',
    },
    UNDER_REVIEW: {
      bg: 'bg-purple-50 dark:bg-purple-950',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      dot: 'bg-purple-500',
    },
    APPROVED: {
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      dot: 'bg-green-500',
    },
    COMPLETED: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-300 dark:border-gray-600',
      dot: 'bg-gray-500',
    },
    FAILED: {
      bg: 'bg-red-50 dark:bg-red-950',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      dot: 'bg-red-500',
    },
  };

  return statusMap[status] || statusMap.PENDING;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE COLORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Tailwind text class for confidence level
 */
export function getConfidenceClasses(level: ConfidenceLevel | number): string {
  let resolvedLevel: ConfidenceLevel;

  if (typeof level === 'number') {
    if (level >= 90) resolvedLevel = 'high';
    else if (level >= 75) resolvedLevel = 'medium';
    else if (level >= 60) resolvedLevel = 'low';
    else resolvedLevel = 'critical';
  } else {
    resolvedLevel = level;
  }

  const classes: Record<ConfidenceLevel, string> = {
    high: 'text-green-600 dark:text-green-400',
    medium: 'text-lime-600 dark:text-lime-400',
    low: 'text-amber-600 dark:text-amber-400',
    critical: 'text-red-600 dark:text-red-400',
  };

  return classes[resolvedLevel];
}

/**
 * Get confidence background for progress bars
 */
export function getConfidenceBgClasses(level: ConfidenceLevel | number): string {
  let resolvedLevel: ConfidenceLevel;

  if (typeof level === 'number') {
    if (level >= 90) resolvedLevel = 'high';
    else if (level >= 75) resolvedLevel = 'medium';
    else if (level >= 60) resolvedLevel = 'low';
    else resolvedLevel = 'critical';
  } else {
    resolvedLevel = level;
  }

  const classes: Record<ConfidenceLevel, string> = {
    high: 'bg-green-500',
    medium: 'bg-lime-500',
    low: 'bg-amber-500',
    critical: 'bg-red-500',
  };

  return classes[resolvedLevel];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC COLORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Tailwind classes for semantic color purposes
 */
export function getSemanticClasses(color: SemanticColor): StatusStyle {
  const colorMap: Record<SemanticColor, StatusStyle> = {
    success: {
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      dot: 'bg-green-500',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      dot: 'bg-red-500',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      dot: 'bg-blue-500',
    },
    neutral: {
      bg: 'bg-gray-50 dark:bg-gray-900',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-700',
      dot: 'bg-gray-500',
    },
  };

  return colorMap[color];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHART COLORS (For libraries that need raw color values)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get HSL color string for charts/graphs
 * Use only when Tailwind classes aren't available (e.g., chart libraries)
 */
export function getChartColor(status: JobStatus): string {
  const colors: Record<JobStatus, string> = {
    REQUESTED: 'hsl(38, 92%, 50%)', // amber
    SCHEDULED: 'hsl(217, 91%, 60%)', // blue
    CONFIRMED: 'hsl(142, 76%, 36%)', // green
    IN_PROGRESS: 'hsl(199, 89%, 48%)', // cyan
    COMPLETED: 'hsl(220, 9%, 46%)', // gray
    CANCELLED: 'hsl(0, 84%, 60%)', // red
    RESCHEDULED: 'hsl(271, 81%, 56%)', // purple
    CONVERTED: 'hsl(239, 84%, 67%)', // indigo
  };

  return colors[status] || colors.SCHEDULED;
}

/**
 * Get confidence color for charts
 */
export function getConfidenceChartColor(value: number): string {
  if (value >= 90) return 'hsl(142, 76%, 36%)'; // green
  if (value >= 75) return 'hsl(84, 81%, 44%)'; // lime
  if (value >= 60) return 'hsl(45, 93%, 47%)'; // yellow
  if (value >= 40) return 'hsl(24, 95%, 53%)'; // orange
  return 'hsl(0, 84%, 60%)'; // red
}

/**
 * Chart color palette for multi-series charts
 */
export const CHART_PALETTE = {
  primary: 'hsl(217, 91%, 60%)',
  secondary: 'hsl(271, 81%, 56%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  error: 'hsl(0, 84%, 60%)',
  info: 'hsl(199, 89%, 48%)',
  muted: 'hsl(220, 9%, 46%)',
  accent: 'hsl(239, 84%, 67%)',
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get complete class string for a status badge
 */
export function getStatusBadgeClasses(status: JobStatus): string {
  const style = getStatusClasses(status);
  return `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} ${style.border} border`;
}

/**
 * Get complete class string for a status dot
 */
export function getStatusDotClasses(status: JobStatus): string {
  const style = getStatusClasses(status);
  return `w-2 h-2 rounded-full ${style.dot}`;
}
