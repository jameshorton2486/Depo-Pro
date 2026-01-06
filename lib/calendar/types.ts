// =============================================================================
// CALENDAR TYPES
// lib/calendar/types.ts
//
// Centralized type definitions for calendar functionality
// =============================================================================

import type { UserRole } from '@/types/database';
import { AssignmentStatus } from '@/types/database';

/**
 * Availability block data contract
 * Phase 3A-2: ISO strings in UI, Date objects server-side
 */
export interface AvailabilityBlock {
  id: string;
  userId: string;
  start: string; // ISO string
  end: string;   // ISO string
  recurring?: {
    pattern: 'daily' | 'weekly';
    until?: string; // ISO string
  };
}

// Re-export Prisma types for convenience
export type { UserRole, AssignmentStatus };

// =============================================================================
// CALENDAR EVENT TYPES
// =============================================================================

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

// Alias for compatibility
export type EventStatus = CalendarEventStatus;
export type EventType = CalendarEventType;

// =============================================================================
// CALENDAR VIEW TYPES
// =============================================================================

// View type from use-allowed-calendar-views (Phase 3A)
export type CalendarView = 'jobs' | 'availability' | 'assignments';

// FullCalendar view type (different from above)
export type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'month' | 'week' | 'day' | 'agenda' | 'timeline';

// =============================================================================
// CALENDAR EVENT UI
// =============================================================================

export type LocationType =
  | 'IN_PERSON'
  | 'ZOOM'
  | 'TEAMS'
  | 'WEBEX'
  | 'PHONE'
  | 'HYBRID'
  | 'OTHER';

export type DeponentRole =
  | 'PLAINTIFF'
  | 'DEFENDANT'
  | 'CORPORATE_REP'
  | 'EXPERT_WITNESS'
  | 'FACT_WITNESS'
  | 'THIRD_PARTY';

export interface CalendarEventUI {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  
  // Case Info
  caseStyle?: string;
  caseName?: string;
  caseNumber?: string;
  deponentName?: string;
  deponentRole?: DeponentRole;
  
  // Status
  status: CalendarEventStatus;
  eventType?: CalendarEventType;
  
  // Location
  locationType?: LocationType;
  location?: string;
  locationAddress?: string;
  zoomJoinUrl?: string;
  isRemote?: boolean;
  
  // Assignment
  assignedReporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedReporterId?: string;
  
  // Requirements
  interpreterRequired?: boolean;
  interpreterLanguage?: string;
  videographerRequired?: boolean;
  realtimeRequired?: boolean;
  
  // Linked Job
  jobId?: string;
  
  // Metadata
  createdById: string;
  firmId?: string;
  agencyId?: string;
  notes?: string;
}

// =============================================================================
// CALENDAR ACTIONS
// =============================================================================

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

// =============================================================================
// CALENDAR PERMISSIONS
// =============================================================================

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
  preferredView: 'grid' | 'timeline' | 'list';
  canToggleView: boolean;
}

export type ActionAvailability = 'AVAILABLE' | 'DISABLED' | 'NO_PERMISSION' | 'HIDDEN';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

// =============================================================================
// CALENDAR FILTERS
// =============================================================================

export interface CalendarFilters {
  startDate: Date;
  endDate: Date;
  status?: CalendarEventStatus[];
  assignedReporterId?: string;
  locationType?: LocationType[];
  firmId?: string;
  agencyId?: string;
  showCancelled?: boolean;
  eventTypes?: CalendarEventType[];
  assignedToMe?: boolean;
}

// =============================================================================
// CALENDAR UTILITIES
// =============================================================================

export interface DayEvents {
  date: Date;
  events: CalendarEventUI[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

// =============================================================================
// DRAWER STATE
// =============================================================================

export interface DrawerState {
  isOpen: boolean;
  event: CalendarEventUI | null;
  action: CalendarAction | null;
  activeTab?: string;
  selectedEvent: CalendarEventUI | null;
}
