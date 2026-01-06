// =============================================================================
// STEP 6: SCHEDULING VALIDATION SERVICE (UX Hardening)
// =============================================================================
// lib/scheduling/validation-service.ts
// =============================================================================

import { logAudit } from '@/lib/audit';
import {
  CalendarEventStatus,
  SchedulingValidationType,
  ValidationSeverity,
} from '@/lib/enums/calendar';
import { AuditAction, AuditEntityType } from '@/lib/enums';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

export interface ValidationIssue {
  type: SchedulingValidationType;
  severity: ValidationSeverity;
  message: string;
  details?: {
    conflictingEventIds?: string[];
    reporterId?: string;
    reporterName?: string;
    suggestedAction?: string;
    originalTime?: Date;
    attemptedTime?: Date;
  };
}

export interface SchedulingValidationContext {
  firmId: string;
  userId: string;
  eventId?: string;                  // For updates/reschedules
  startTime: Date;
  endTime: Date;
  reporterId?: string;
  eventType?: string;
  isReschedule?: boolean;
  overrideWarnings?: boolean;        // User confirmed to proceed
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Minimum notice for scheduling (hours)
  MIN_NOTICE_HOURS: 24,
  
  // Business hours
  BUSINESS_START_HOUR: 7,
  BUSINESS_END_HOUR: 19,
  
  // Minimum event duration (minutes)
  MIN_DURATION_MINUTES: 15,
  
  // Maximum event duration (hours)
  MAX_DURATION_HOURS: 12,
  
  // Buffer between events (minutes)
  BUFFER_MINUTES: 15,
};

// =============================================================================
// VALIDATION SERVICE CLASS
// =============================================================================

export class SchedulingValidationService {

  // ===========================================================================
  // MAIN VALIDATION METHOD
  // ===========================================================================

  async validateScheduling(
    context: SchedulingValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: ValidationIssue[] = [];

    // 1. Check for past time scheduling
    const pastCheck = this.validateNotInPast(context);
    if (pastCheck) {
      if (pastCheck.severity === ValidationSeverity.ERROR) {
        errors.push(pastCheck);
      } else {
        warnings.push(pastCheck);
      }
    }

    // 2. Check for short notice
    const noticeCheck = this.validateNotice(context);
    if (noticeCheck) warnings.push(noticeCheck);

    // 3. Check for business hours
    const hoursCheck = this.validateBusinessHours(context);
    if (hoursCheck) warnings.push(hoursCheck);

    // 4. Check for duration issues
    const durationCheck = this.validateDuration(context);
    if (durationCheck) {
      if (durationCheck.severity === ValidationSeverity.ERROR) {
        errors.push(durationCheck);
      } else {
        warnings.push(durationCheck);
      }
    }

    // 5. Check for internal event overlaps
    const overlapCheck = await this.validateNoOverlaps(context);
    if (overlapCheck) errors.push(overlapCheck);

    // 6. Check for reporter double-booking
    const doubleBookCheck = await this.validateNoDoubleBooking(context);
    if (doubleBookCheck) errors.push(doubleBookCheck);

    // 7. Check for external calendar conflicts
    const externalCheck = await this.validateNoExternalConflicts(context);
    if (externalCheck) warnings.push(externalCheck);

    // Determine if confirmation is required
    const requiresConfirmation = 
      warnings.length > 0 && 
      !context.overrideWarnings;

    let confirmationMessage: string | undefined;
    if (requiresConfirmation) {
      confirmationMessage = this.buildConfirmationMessage(warnings);
    }

    return {
      isValid: errors.length === 0 && (context.overrideWarnings || warnings.length === 0),
      errors,
      warnings,
      info,
      requiresConfirmation,
      confirmationMessage,
    };
  }

  // ===========================================================================
  // DRAG-DROP SPECIFIC VALIDATION
  // ===========================================================================

  /**
   * Validate a drag-drop operation
   * Returns validation result before drop is committed
   */
  async validateDragDrop(
    eventId: string,
    newStart: Date,
    newEnd: Date,
    firmId: string,
    userId: string
  ): Promise<ValidationResult> {
    // Get the existing event
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        assignedReporter: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!event) {
      return {
        isValid: false,
        errors: [{
          type: SchedulingValidationType.OVERLAP,
          severity: ValidationSeverity.ERROR,
          message: 'Event not found',
        }],
        warnings: [],
        info: [],
        requiresConfirmation: false,
      };
    }

    // Check if event can be mutated
    const lockedStatuses = [
      CalendarEventStatus.COMPLETED,
      CalendarEventStatus.CANCELLED,
      CalendarEventStatus.CONVERTED,
      CalendarEventStatus.EXTERNAL_BLOCK,
    ];

    if (lockedStatuses.includes(event.status as CalendarEventStatus)) {
      return {
        isValid: false,
        errors: [{
          type: SchedulingValidationType.OVERLAP,
          severity: ValidationSeverity.ERROR,
          message: `Cannot reschedule ${event.status.toLowerCase()} event`,
        }],
        warnings: [],
        info: [],
        requiresConfirmation: false,
      };
    }

    return this.validateScheduling({
      firmId,
      userId,
      eventId,
      startTime: newStart,
      endTime: newEnd,
      reporterId: event.assignedReporterId || undefined,
      isReschedule: true,
    });
  }

  /**
   * Preview conflicts before drop
   * Returns preview info without committing
   */
  async previewDragDrop(
    eventId: string,
    newStart: Date,
    newEnd: Date,
    firmId: string
  ): Promise<{
    hasConflicts: boolean;
    conflicts: Array<{
      id: string;
      title: string;
      startTime: Date;
      endTime: Date;
      type: 'INTERNAL' | 'EXTERNAL';
    }>;
  }> {
    const conflicts: Array<{
      id: string;
      title: string;
      startTime: Date;
      endTime: Date;
      type: 'INTERNAL' | 'EXTERNAL';
    }> = [];

    // Find overlapping internal events
    const internalConflicts = await prisma.calendarEvent.findMany({
      where: {
        firmId,
        id: { not: eventId },
        status: { notIn: [CalendarEventStatus.CANCELLED] },
        OR: [
          { startTime: { gte: newStart, lt: newEnd } },
          { endTime: { gt: newStart, lte: newEnd } },
          { AND: [{ startTime: { lte: newStart } }, { endTime: { gte: newEnd } }] },
        ],
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
    });

    for (const event of internalConflicts) {
      conflicts.push({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        type: 'INTERNAL',
      });
    }

    // Find overlapping external events
    const externalConflicts = await prisma.externalCalendarEvent.findMany({
      where: {
        firmId,
        isBlockingTime: true,
        deletedAt: null,
        OR: [
          { startTime: { gte: newStart, lt: newEnd } },
          { endTime: { gt: newStart, lte: newEnd } },
          { AND: [{ startTime: { lte: newStart } }, { endTime: { gte: newEnd } }] },
        ],
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
    });

    for (const event of externalConflicts) {
      conflicts.push({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        type: 'EXTERNAL',
      });
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  // ===========================================================================
  // INDIVIDUAL VALIDATION CHECKS
  // ===========================================================================

  private validateNotInPast(context: SchedulingValidationContext): ValidationIssue | null {
    const now = new Date();
    
    if (context.startTime < now) {
      // Complete past is an error
      if (context.endTime < now) {
        return {
          type: SchedulingValidationType.PAST_TIME,
          severity: ValidationSeverity.ERROR,
          message: 'Cannot schedule events entirely in the past',
          details: {
            attemptedTime: context.startTime,
          },
        };
      }
      
      // Partial past is a warning
      return {
        type: SchedulingValidationType.PAST_TIME,
        severity: ValidationSeverity.WARNING,
        message: 'Event start time is in the past',
        details: {
          attemptedTime: context.startTime,
          suggestedAction: 'Adjust start time to current time or later',
        },
      };
    }

    return null;
  }

  private validateNotice(context: SchedulingValidationContext): ValidationIssue | null {
    const now = new Date();
    const hoursUntilStart = (context.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < CONFIG.MIN_NOTICE_HOURS) {
      return {
        type: SchedulingValidationType.TOO_SHORT_NOTICE,
        severity: ValidationSeverity.WARNING,
        message: `Less than ${CONFIG.MIN_NOTICE_HOURS} hours notice for this event`,
        details: {
          suggestedAction: 'Confirm with all parties before scheduling',
        },
      };
    }

    return null;
  }

  private validateBusinessHours(context: SchedulingValidationContext): ValidationIssue | null {
    const startHour = context.startTime.getHours();
    const endHour = context.endTime.getHours();
    const startDay = context.startTime.getDay();
    const endDay = context.endTime.getDay();

    // Check weekend
    if (startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6) {
      return {
        type: SchedulingValidationType.OUTSIDE_HOURS,
        severity: ValidationSeverity.WARNING,
        message: 'Event scheduled on a weekend',
        details: {
          suggestedAction: 'Confirm weekend availability with reporter',
        },
      };
    }

    // Check early morning or late evening
    if (startHour < CONFIG.BUSINESS_START_HOUR || endHour > CONFIG.BUSINESS_END_HOUR) {
      return {
        type: SchedulingValidationType.OUTSIDE_HOURS,
        severity: ValidationSeverity.WARNING,
        message: 'Event scheduled outside typical business hours',
        details: {
          suggestedAction: 'Confirm availability outside normal hours',
        },
      };
    }

    return null;
  }

  private validateDuration(context: SchedulingValidationContext): ValidationIssue | null {
    const durationMs = context.endTime.getTime() - context.startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    const durationHours = durationMinutes / 60;

    if (durationMinutes < CONFIG.MIN_DURATION_MINUTES) {
      return {
        type: SchedulingValidationType.DURATION_MISMATCH,
        severity: ValidationSeverity.ERROR,
        message: `Event duration (${Math.round(durationMinutes)} minutes) is too short`,
        details: {
          suggestedAction: `Minimum duration is ${CONFIG.MIN_DURATION_MINUTES} minutes`,
        },
      };
    }

    if (durationHours > CONFIG.MAX_DURATION_HOURS) {
      return {
        type: SchedulingValidationType.DURATION_MISMATCH,
        severity: ValidationSeverity.WARNING,
        message: `Event duration (${Math.round(durationHours)} hours) is unusually long`,
        details: {
          suggestedAction: 'Consider breaking into multiple sessions',
        },
      };
    }

    return null;
  }

  private async validateNoOverlaps(
    context: SchedulingValidationContext
  ): Promise<ValidationIssue | null> {
    const overlapping = await prisma.calendarEvent.findMany({
      where: {
        firmId: context.firmId,
        id: context.eventId ? { not: context.eventId } : undefined,
        status: { notIn: [CalendarEventStatus.CANCELLED] },
        OR: [
          { startTime: { gte: context.startTime, lt: context.endTime } },
          { endTime: { gt: context.startTime, lte: context.endTime } },
          { AND: [
            { startTime: { lte: context.startTime } },
            { endTime: { gte: context.endTime } },
          ]},
        ],
      },
      select: { id: true, title: true },
    });

    if (overlapping.length > 0) {
      return {
        type: SchedulingValidationType.OVERLAP,
        severity: ValidationSeverity.ERROR,
        message: `Overlaps with ${overlapping.length} existing event(s)`,
        details: {
          conflictingEventIds: overlapping.map(e => e.id),
          suggestedAction: 'Choose a different time slot',
        },
      };
    }

    return null;
  }

  private async validateNoDoubleBooking(
    context: SchedulingValidationContext
  ): Promise<ValidationIssue | null> {
    if (!context.reporterId) {
      return null;
    }

    const reporterConflicts = await prisma.calendarEvent.findMany({
      where: {
        firmId: context.firmId,
        id: context.eventId ? { not: context.eventId } : undefined,
        assignedReporterId: context.reporterId,
        status: { notIn: [CalendarEventStatus.CANCELLED] },
        OR: [
          { startTime: { gte: context.startTime, lt: context.endTime } },
          { endTime: { gt: context.startTime, lte: context.endTime } },
          { AND: [
            { startTime: { lte: context.startTime } },
            { endTime: { gte: context.endTime } },
          ]},
        ],
      },
      include: {
        assignedReporter: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (reporterConflicts.length > 0) {
      const reporter = reporterConflicts[0].assignedReporter;
      const reporterName = reporter 
        ? `${reporter.firstName} ${reporter.lastName}` 
        : 'The reporter';

      return {
        type: SchedulingValidationType.DOUBLE_BOOKING,
        severity: ValidationSeverity.ERROR,
        message: `${reporterName} is already scheduled during this time`,
        details: {
          conflictingEventIds: reporterConflicts.map(e => e.id),
          reporterId: context.reporterId,
          reporterName: reporterName,
          suggestedAction: 'Assign a different reporter or choose another time',
        },
      };
    }

    return null;
  }

  private async validateNoExternalConflicts(
    context: SchedulingValidationContext
  ): Promise<ValidationIssue | null> {
    const externalConflicts = await prisma.externalCalendarEvent.findMany({
      where: {
        firmId: context.firmId,
        isBlockingTime: true,
        deletedAt: null,
        ...(context.reporterId && {
          connection: { userId: context.reporterId },
        }),
        OR: [
          { startTime: { gte: context.startTime, lt: context.endTime } },
          { endTime: { gt: context.startTime, lte: context.endTime } },
          { AND: [
            { startTime: { lte: context.startTime } },
            { endTime: { gte: context.endTime } },
          ]},
        ],
      },
      select: { id: true, title: true },
    });

    if (externalConflicts.length > 0) {
      return {
        type: SchedulingValidationType.EXTERNAL_CONFLICT,
        severity: ValidationSeverity.WARNING,
        message: `Conflicts with ${externalConflicts.length} external calendar event(s)`,
        details: {
          conflictingEventIds: externalConflicts.map(e => e.id),
          suggestedAction: 'Verify external calendar availability before confirming',
        },
      };
    }

    return null;
  }

  // ===========================================================================
  // CONFIRMATION HELPERS
  // ===========================================================================

  private buildConfirmationMessage(warnings: ValidationIssue[]): string {
    const messages = warnings.map(w => `• ${w.message}`);
    return `The following issues were found:\n${messages.join('\n')}\n\nDo you want to proceed anyway?`;
  }

  // ===========================================================================
  // AUDIT LOGGING
  // ===========================================================================

  async logValidationFailure(
    context: SchedulingValidationContext,
    result: ValidationResult
  ): Promise<void> {
    if (!result.isValid) {
      await logAudit({
        action: 'SCHEDULING_VALIDATION_FAILED' as AuditAction,
        entityType: AuditEntityType.CalendarEvent,
        entityId: context.eventId || 'new',
        userId: context.userId,
        details: {
          firmId: context.firmId,
          errors: result.errors,
          warnings: result.warnings,
          startTime: context.startTime,
          endTime: context.endTime,
          reporterId: context.reporterId,
        },
      });
    }
  }

  async logOverrideConfirmation(
    context: SchedulingValidationContext,
    warnings: ValidationIssue[]
  ): Promise<void> {
    await logAudit({
      action: 'SCHEDULING_OVERRIDE_CONFIRMED' as AuditAction,
      entityType: AuditEntityType.CalendarEvent,
      entityId: context.eventId || 'new',
      userId: context.userId,
      details: {
        firmId: context.firmId,
        overriddenWarnings: warnings,
        startTime: context.startTime,
        endTime: context.endTime,
        reporterId: context.reporterId,
      },
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const schedulingValidationService = new SchedulingValidationService();
