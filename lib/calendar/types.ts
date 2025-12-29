// ============================================
// Calendar Types - Aligned to Prisma Schema
// ============================================

// Event statuses (matches Prisma CalendarEventStatus enum)
export type EventStatus = 
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED';

// Event types (matches Prisma EventType enum)
export type EventType = 
  | 'DEPOSITION'
  | 'HEARING'
  | 'ARBITRATION'
  | 'MEDIATION'
  | 'EUO'
  | 'STATEMENT'
  | 'OTHER';

// User roles (matches Prisma UserRole enum)
export type UserRole = 
  | 'ADMIN'
  | 'REPORTER'
  | 'SCOPIST'
  | 'ATTORNEY'
  | 'PARALEGAL'
  | 'AGENCY'
  | 'AGENCY_ADMIN'
  | 'FIRM_ADMIN';

// Calendar Event (matches API response structure)
export interface CalendarEvent {
  id: string;
  title: string;
  eventType: EventType;
  status: EventStatus;
  startTime: string;      // ISO 8601 datetime
  endTime: string | null; // ISO 8601 datetime
  location?: string | null;
  isRemote: boolean;
  meetingLink?: string | null;
  notes?: string | null;
  
  // Relationships (may be null based on role visibility)
  jobId?: string | null;
  firmId?: string;
  caseNumber?: string | null;
  caseName?: string | null;
  
  // Assignments (visibility varies by role)
  assignedReporterId?: string | null;
  assignedReporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

// Calendar Event UI (with parsed dates)
export interface CalendarEventUI extends Omit<CalendarEvent, 'startTime' | 'endTime'> {
  start: Date;
  end: Date | null;
}

// Calendar Filters
export interface CalendarFilters {
  startDate: Date;
  endDate: Date;
  eventTypes?: EventType[];
  status?: EventStatus[];
  assignedToMe?: boolean;
}

// Calendar View State
export type CalendarView = 'grid' | 'timeline';

export interface CalendarViewState {
  view: CalendarView;
  currentDate: Date;        // The focused month/week
  selectedEventId?: string;
}

// Day Events (for grid view)
export interface DayEvents {
  date: Date;
  events: CalendarEventUI[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

// API Response shape
export interface CalendarAPIResponse {
  events: CalendarEvent[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// ============================================
// PHASE 2: ACTION TYPES (UI representation only)
// ============================================

export type CalendarAction = 
  | 'VIEW_DETAILS'
  | 'REQUEST_CHANGE'
  | 'ASSIGN_REPORTER'
  | 'ASSIGN_SCOPIST'
  | 'ASSIGN_VIDEOGRAPHER'
  | 'ASSIGN_INTERPRETER'
  | 'CONVERT_TO_JOB'
  | 'CANCEL_EVENT'
  | 'RESCHEDULE'
  | 'ADD_NOTES'
  | 'MARK_COMPLETE';

export type ActionAvailability = 
  | 'AVAILABLE'      // Action can be performed (Phase 3)
  | 'DISABLED'       // Action exists but not yet implemented
  | 'NO_PERMISSION'  // User role cannot perform this action
  | 'HIDDEN';        // Action should not be shown at all

export interface ActionConfig {
  action: CalendarAction;
  label: string;
  icon: string;                    // Lucide icon name
  availability: ActionAvailability;
  disabledReason?: string;         // Shown in tooltip when disabled
  permissionReason?: string;       // Shown when no permission
}

// ============================================
// DRAWER / DETAIL VIEW TYPES
// ============================================

export interface EventDetailSection {
  id: string;
  title: string;
  visible: boolean;
  fields: EventDetailField[];
}

export interface EventDetailField {
  key: string;
  label: string;
  value: string | null;
  type: 'text' | 'date' | 'time' | 'badge' | 'link' | 'user' | 'location';
  visible: boolean;
}

export interface DrawerState {
  isOpen: boolean;
  selectedEvent: CalendarEventUI | null;
  activeTab: 'details' | 'assignments' | 'history';
}

// ============================================
// TIMELINE GROUPING TYPES
// ============================================

export type TimelineGroupBy = 'date' | 'reporter' | 'firm' | 'status';

export interface TimelineGroup {
  id: string;
  label: string;
  subtitle?: string;
  events: CalendarEventUI[];
  metadata?: {
    reporterName?: string;
    reporterId?: string;
    firmName?: string;
    firmId?: string;
    eventCount: number;
    hasUnassigned: boolean;
  };
}

// ============================================
// VISUAL INDICATOR TYPES
// ============================================

export interface EventIndicators {
  isRemote: boolean;
  isInPerson: boolean;
  requiresInterpreter: boolean;
  requiresVideographer: boolean;
  isAssigned: boolean;
  isUnassigned: boolean;
  isPastDue: boolean;
  isToday: boolean;
  isUrgent: boolean;              // Within 24 hours and unassigned
}

export interface IndicatorConfig {
  type: keyof EventIndicators;
  icon: string;
  label: string;
  color: string;
  priority: number;               // Display order (lower = first)
}

// ============================================
// PERMISSION TYPES
// ============================================

export interface RolePermissions {
  canViewAllEvents: boolean;
  canViewFirmEvents: boolean;
  canViewAssignedOnly: boolean;
  canAssignReporter: boolean;
  canAssignScopist: boolean;
  canAssignVideographer: boolean;
  canAssignInterpreter: boolean;
  canRequestChanges: boolean;
  canConvertToJob: boolean;
  canCancelEvent: boolean;
  canReschedule: boolean;
  canAddNotes: boolean;
  canMarkComplete: boolean;
  preferredView: 'grid' | 'timeline';
  canToggleView: boolean;
}

export type PermissionCheckResult = {
  allowed: boolean;
  reason?: string;
};

