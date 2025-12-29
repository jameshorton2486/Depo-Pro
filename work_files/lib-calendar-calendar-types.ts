// ============================================================
// CALENDAR TYPES
// Path: lib/calendar/calendar-types.ts
// ============================================================
// Centralized type definitions for calendar components
// ============================================================

// ------------------------------------------------------------
// CALENDAR EVENT TYPES
// ------------------------------------------------------------

export type CalendarEventType =
  | 'DEPOSITION'
  | 'HEARING'
  | 'ARBITRATION'
  | 'MEDIATION'
  | 'EUO'
  | 'STATEMENT'
  | 'OTHER';

export type CalendarEventStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'CONVERTED';

// ------------------------------------------------------------
// CALENDAR VIEW TYPES
// ------------------------------------------------------------

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

// ------------------------------------------------------------
// CALENDAR TOOLBAR PROPS
// Props interface for calendar toolbar component
// ------------------------------------------------------------

export interface CalendarToolbarProps {
  /** Current calendar view mode */
  currentView: CalendarView;
  /** Callback when view changes */
  onViewChange: (view: CalendarView) => void;
  /** Status filter value */
  statusFilter: string;
  /** Callback when status filter changes */
  onStatusFilterChange: (status: string) => void;
  /** Reporter filter value */
  reporterFilter: string;
  /** Callback when reporter filter changes */
  onReporterFilterChange: (reporterId: string) => void;
  /** Available reporters for filter dropdown */
  reporters: Array<{ id: string; name: string }>;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Callback to refresh calendar data */
  onRefresh: () => void;
  /** Callback to create new event */
  onCreateEvent?: () => void;
  /** Whether user can create events */
  canCreateEvents: boolean;
}

// ------------------------------------------------------------
// CALENDAR EVENT DATA
// ------------------------------------------------------------

export interface CalendarEventData {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  editable?: boolean;
  extendedProps: CalendarEventExtendedProps;
}

export interface CalendarEventExtendedProps {
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  location?: string;
  isRemote: boolean;
  meetingLink?: string;
  assignedReporter?: {
    id: string;
    name: string;
    email: string;
  };
  requestedBy?: {
    id: string;
    name: string;
    email: string;
  };
  job?: {
    id: string;
    caseName: string;
    status: string;
  };
  participants?: CalendarParticipant[];
  notes?: string;
  timezone: string;
}

export interface CalendarParticipant {
  id: string;
  userId: string;
  role: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ------------------------------------------------------------
// STATUS COLORS (for consistent UI)
// ------------------------------------------------------------

export const STATUS_COLORS: Record<CalendarEventStatus, { bg: string; text: string; label: string }> = {
  REQUESTED: { bg: '#FFA500', text: '#fff', label: 'Requested' },
  SCHEDULED: { bg: '#3788D8', text: '#fff', label: 'Scheduled' },
  CONFIRMED: { bg: '#28A745', text: '#fff', label: 'Confirmed' },
  IN_PROGRESS: { bg: '#17A2B8', text: '#fff', label: 'In Progress' },
  COMPLETED: { bg: '#6C757D', text: '#fff', label: 'Completed' },
  CANCELLED: { bg: '#DC3545', text: '#fff', label: 'Cancelled' },
  RESCHEDULED: { bg: '#9B59B6', text: '#fff', label: 'Rescheduled' },
  CONVERTED: { bg: '#4F46E5', text: '#fff', label: 'Converted' },
};

// Locked statuses - events in these states cannot be modified
export const LOCKED_STATUSES: CalendarEventStatus[] = ['CONVERTED', 'CANCELLED', 'COMPLETED'];

// ------------------------------------------------------------
// CALENDAR DATE RANGE
// ------------------------------------------------------------

export interface CalendarDateRange {
  start: Date;
  end: Date;
}

// ------------------------------------------------------------
// CALENDAR FILTER OPTIONS
// ------------------------------------------------------------

export interface CalendarFilters {
  status?: CalendarEventStatus;
  reporterId?: string;
  eventType?: CalendarEventType;
  startDate?: Date;
  endDate?: Date;
}
