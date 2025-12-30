// ============================================
// CALENDAR UI TYPES
// These are UI-only types - never import Prisma client here
// ============================================

export type CalendarEventStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'POSTPONED'
  | 'NO_SHOW';

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

export type CalendarViewType = 'month' | 'week' | 'day' | 'agenda' | 'timeline';

// ============================================
// CALENDAR EVENT (UI Display)
// ============================================

export interface CalendarEventUI {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  
  // Case Info
  caseStyle: string;
  caseNumber?: string;
  deponentName: string;
  deponentRole?: DeponentRole;
  
  // Status
  status: CalendarEventStatus;
  
  // Location
  locationType: LocationType;
  locationAddress?: string;
  zoomJoinUrl?: string;
  
  // Assignment
  assignedReporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  
  // Requirements
  interpreterRequired: boolean;
  interpreterLanguage?: string;
  videographerRequired: boolean;
  realtimeRequired: boolean;
  
  // Linked Job
  jobId?: string;
  
  // Metadata
  createdById: string;
  firmId?: string;
  agencyId?: string;
  notes?: string;
}

// ============================================
// CALENDAR FILTERS
// ============================================

export interface CalendarFilters {
  startDate: Date;
  endDate: Date;
  status?: CalendarEventStatus[];
  assignedReporterId?: string;
  locationType?: LocationType[];
  firmId?: string;
  agencyId?: string;
  showCancelled?: boolean;
}

// ============================================
// CREATE EVENT FORM DATA
// ============================================

export interface CreateEventFormData {
  // Case Info
  caseStyle: string;
  caseNumber?: string;
  deponentName: string;
  deponentRole?: DeponentRole;
  
  // Scheduling
  scheduledStart: Date;
  scheduledEnd?: Date;
  timezone: string;
  
  // Location
  locationType: LocationType;
  locationAddress?: string;
  locationRoom?: string;
  zoomMeetingId?: string;
  zoomJoinUrl?: string;
  
  // Requirements
  interpreterRequired: boolean;
  interpreterLanguage?: string;
  videographerRequired: boolean;
  realtimeRequired: boolean;
  
  // Assignment
  assignedReporterId?: string;
  
  // Notes
  notes?: string;
  internalNotes?: string;
}

// ============================================
// EVENT DETAIL PANEL PROPS
// ============================================

export interface EventDetailsPanelProps {
  event: CalendarEventUI | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEventUI) => void;
  onConvertToJob?: (eventId: string) => void;
  onCancel?: (eventId: string) => void;
}

// ============================================
// CALENDAR SHELL PROPS
// ============================================

export interface CalendarShellProps {
  userRole: 'ADMIN' | 'REPORTER' | 'SCOPIST' | 'ATTORNEY' | 'AGENCY_ADMIN';
  userId: string;
  firmId?: string;
  agencyId?: string;
  initialEvents?: CalendarEventUI[]; // Optional initial events from server-side fetch
}

// ============================================
// CALENDAR VIEW PROPS
// ============================================

export interface CalendarViewProps {
  events: CalendarEventUI[];
  view: CalendarViewType;
  date: Date;
  onViewChange: (view: CalendarViewType) => void;
  onDateChange: (date: Date) => void;
  onEventClick: (event: CalendarEventUI) => void;
  onSlotClick?: (slotInfo: { start: Date; end: Date }) => void;
  isLoading?: boolean;
}

// ============================================
// STATUS COLOR MAPPING
// ============================================

export const STATUS_COLORS: Record<CalendarEventStatus, { bg: string; text: string; border: string }> = {
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  POSTPONED: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  NO_SHOW: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
};

// ============================================
// LOCATION TYPE ICONS (for UI)
// ============================================

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  IN_PERSON: 'In Person',
  ZOOM: 'Zoom',
  TEAMS: 'Microsoft Teams',
  WEBEX: 'WebEx',
  PHONE: 'Phone',
  HYBRID: 'Hybrid',
  OTHER: 'Other',
};

// ============================================
// ROLE LABELS
// ============================================

export const DEPONENT_ROLE_LABELS: Record<DeponentRole, string> = {
  PLAINTIFF: 'Plaintiff',
  DEFENDANT: 'Defendant',
  CORPORATE_REP: 'Corporate Representative',
  EXPERT_WITNESS: 'Expert Witness',
  FACT_WITNESS: 'Fact Witness',
  THIRD_PARTY: 'Third Party',
};
