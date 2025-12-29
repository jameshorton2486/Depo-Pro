// ============================================
// Calendar Types - Aligned to ACTUAL Prisma Schema
// ============================================

// Event statuses that exist in CalendarEventStatus enum
export type CalendarEventStatus = 
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'POSTPONED'
  | 'NO_SHOW';

// Event types - ONLY include values that exist in YOUR schema
// Check prisma/schema.prisma for actual EventType enum values
export type EventType = 
  | 'DEPOSITION'
  | 'HEARING'
  | 'MEETING'
  | 'OTHER';

// User roles
export type UserRole = 
  | 'ADMIN'
  | 'COURT_REPORTER'
  | 'SCOPIST'
  | 'ATTORNEY'
  | 'AGENCY_ADMIN';

// Calendar view types
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

// ============================================
// API Response Types (matches lean API)
// ============================================

export interface CalendarEventDTO {
  id: string;
  title: string;
  start: string;  // ISO date string
  end: string | null;
  status: CalendarEventStatus;
  eventType?: EventType;
  location: string | null;
  isRemote: boolean;
  meetingLink: string | null;
  assignedReporter: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  firmId: string;
  agencyId: string | null;
  jobId: string | null;
  // Enriched from Job if linked
  caseName: string | null;
  caseNumber: string | null;
  jobStatus: string | null;
  notes: string | null;
}

// UI-ready event (dates parsed)
export interface CalendarEventUI {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  status: CalendarEventStatus;
  eventType?: EventType;
  location: string | null;
  isRemote: boolean;
  meetingLink: string | null;
  assignedReporter: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  firmId: string;
  agencyId: string | null;
  jobId: string | null;
  caseName: string | null;
  caseNumber: string | null;
  notes: string | null;
}

// ============================================
// Status Colors
// ============================================

export const STATUS_COLORS: Record<CalendarEventStatus, { bg: string; border: string; text: string }> = {
  SCHEDULED: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  CONFIRMED: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  IN_PROGRESS: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
  COMPLETED: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' },
  CANCELLED: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
  POSTPONED: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  NO_SHOW: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
};

// ============================================
// Component Props
// ============================================

export interface CalendarShellProps {
  userRole: string;
  userId: string;
  firmId?: string;
  agencyId?: string;
}

export interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export interface CalendarEventCardProps {
  event: CalendarEventUI;
  isCompact?: boolean;
  onClick?: () => void;
}
