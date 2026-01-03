// ============================================
// Calendar Constants
// ============================================

import type { EventType, EventStatus, CalendarAction } from './types';

// Event Type Colors
export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  DEPOSITION: 'bg-blue-100 border-blue-500 text-blue-800',
  HEARING: 'bg-purple-100 border-purple-500 text-purple-800',
  ARBITRATION: 'bg-indigo-100 border-indigo-500 text-indigo-800',
  MEDIATION: 'bg-pink-100 border-pink-500 text-pink-800',
  EUO: 'bg-teal-100 border-teal-500 text-teal-800',
  STATEMENT: 'bg-cyan-100 border-cyan-500 text-cyan-800',
  OTHER: 'bg-gray-100 border-gray-500 text-gray-800',
};

// Event Status Indicators (dot colors)
export const EVENT_STATUS_INDICATORS: Record<EventStatus, string> = {
  REQUESTED: 'bg-gray-400',
  SCHEDULED: 'bg-yellow-400',
  CONFIRMED: 'bg-green-400',
  IN_PROGRESS: 'bg-blue-400',
  COMPLETED: 'bg-gray-400',
  CANCELLED: 'bg-red-400',
  RESCHEDULED: 'bg-orange-400',
  CONVERTED: 'bg-purple-400',
};

// Event Status Colors (full card backgrounds)
export const EVENT_STATUS_COLORS: Record<EventStatus, { bg: string; border: string; text: string }> = {
  REQUESTED: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' },
  SCHEDULED: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  CONFIRMED: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  IN_PROGRESS: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  COMPLETED: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' },
  CANCELLED: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  RESCHEDULED: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  CONVERTED: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
};

// Event Type Labels
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  DEPOSITION: 'Deposition',
  HEARING: 'Hearing',
  ARBITRATION: 'Arbitration',
  MEDIATION: 'Mediation',
  EUO: 'EUO',
  STATEMENT: 'Statement',
  OTHER: 'Other',
};

// Event Status Labels
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  REQUESTED: 'Requested',
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',
  CONVERTED: 'Converted',
};

// Default max visible events per day in grid
export const MAX_VISIBLE_EVENTS_PER_DAY = 3;

// Responsive breakpoints (Tailwind defaults)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// ============================================
// PHASE 2: CALENDAR ACTIONS
// ============================================

export const CALENDAR_ACTIONS: Record<CalendarAction, {
  label: string;
  icon: string;
  variant: 'default' | 'outline' | 'destructive' | 'ghost';
  showInDrawer: boolean;
  showOnCard: boolean;
}> = {
  VIEW_DETAILS: {
    label: 'View Details',
    icon: 'Eye',
    variant: 'ghost',
    showInDrawer: false,
    showOnCard: true,
  },
  REQUEST_CHANGE: {
    label: 'Request Change',
    icon: 'MessageSquare',
    variant: 'outline',
    showInDrawer: true,
    showOnCard: false,
  },
  ASSIGN_REPORTER: {
    label: 'Assign Reporter',
    icon: 'UserPlus',
    variant: 'default',
    showInDrawer: true,
    showOnCard: false,
  },
  ASSIGN_SCOPIST: {
    label: 'Assign Scopist',
    icon: 'UserPlus',
    variant: 'outline',
    showInDrawer: true,
    showOnCard: false,
  },
  ASSIGN_VIDEOGRAPHER: {
    label: 'Assign Videographer',
    icon: 'Video',
    variant: 'outline',
    showInDrawer: true,
    showOnCard: false,
  },
  ASSIGN_INTERPRETER: {
    label: 'Assign Interpreter',
    icon: 'Languages',
    variant: 'outline',
    showInDrawer: true,
    showOnCard: false,
  },
  CONVERT_TO_JOB: {
    label: 'Convert to Job',
    icon: 'FileText',
    variant: 'default',
    showInDrawer: true,
    showOnCard: false,
  },
  CANCEL_EVENT: {
    label: 'Cancel Event',
    icon: 'X',
    variant: 'destructive',
    showInDrawer: true,
    showOnCard: false,
  },
  RESCHEDULE: {
    label: 'Reschedule',
    icon: 'Calendar',
    variant: 'outline',
    showInDrawer: true,
    showOnCard: false,
  },
  ADD_NOTES: {
    label: 'Add Notes',
    icon: 'StickyNote',
    variant: 'outline',
    showInDrawer: true,
    showOnCard: false,
  },
  MARK_COMPLETE: {
    label: 'Mark Complete',
    icon: 'CheckCircle',
    variant: 'default',
    showInDrawer: true,
    showOnCard: false,
  },
};

// ============================================
// REQUIREMENT FLAGS
// ============================================

export const REQUIREMENT_FLAGS = {
  interpreter: {
    icon: 'Languages',
    label: 'Interpreter Required',
    shortLabel: 'Interp',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600',
  },
  videographer: {
    icon: 'Video',
    label: 'Videographer Required',
    shortLabel: 'Video',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    iconColor: 'text-purple-600',
  },
  remote: {
    icon: 'Monitor',
    label: 'Remote Proceeding',
    shortLabel: 'Remote',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
  },
  inPerson: {
    icon: 'Building2',
    label: 'In-Person',
    shortLabel: 'On-site',
    color: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
  },
  urgent: {
    icon: 'AlertTriangle',
    label: 'Urgent - Within 24 Hours',
    shortLabel: 'Urgent',
    color: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
  },
  unassigned: {
    icon: 'UserX',
    label: 'Unassigned',
    shortLabel: 'Needs Assignment',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600',
  },
};

// ============================================
// EVENT STATUS CONFIG
// ============================================

export const EVENT_STATUS_CONFIG: Record<EventStatus, {
  label: string;
  color: string;
  dotColor: string;
  description: string;
}> = {
  REQUESTED: {
    label: 'Requested',
    color: 'bg-gray-100 text-gray-800',
    dotColor: 'bg-gray-400',
    description: 'Event has been requested',
  },
  SCHEDULED: {
    label: 'Scheduled',
    color: 'bg-yellow-100 text-yellow-800',
    dotColor: 'bg-yellow-400',
    description: 'Event is scheduled but not yet confirmed',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-green-100 text-green-800',
    dotColor: 'bg-green-400',
    description: 'Event is confirmed and all assignments complete',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800',
    dotColor: 'bg-blue-400',
    description: 'Event is currently happening',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-800',
    dotColor: 'bg-gray-400',
    description: 'Event has been completed',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    dotColor: 'bg-red-400',
    description: 'Event was cancelled',
  },
  RESCHEDULED: {
    label: 'Rescheduled',
    color: 'bg-orange-100 text-orange-800',
    dotColor: 'bg-orange-400',
    description: 'Event was rescheduled',
  },
  CONVERTED: {
    label: 'Converted',
    color: 'bg-purple-100 text-purple-800',
    dotColor: 'bg-purple-400',
    description: 'Event was converted to a job',
  },
};

