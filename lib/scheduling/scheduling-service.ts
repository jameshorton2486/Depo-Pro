// ============================================================
// PHASE 4: SCHEDULING SERVICE
// Path: lib/scheduling/scheduling-service.ts
// ============================================================
// Service for handling reschedule operations with audit trails
// ============================================================

import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { AuditAction, AuditEntityType } from '@/lib/enums';
import { checkForConflicts, ConflictCheckResult } from './conflict-detection';

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export interface RescheduleParams {
  eventId: string;
  newStart: Date;
  newEnd: Date;
  userId: string;
  userRole: string;
  firmId: string;
  forceOverride?: boolean;
  overrideReason?: string;
}

export interface RescheduleResult {
  success: boolean;
  event?: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    previousStart: Date;
    previousEnd: Date;
  };
  conflicts?: ConflictCheckResult;
  error?: string;
  code?: string;
  canUndo: boolean;
  undoToken?: string;
}

export interface UndoRescheduleParams {
  eventId: string;
  userId: string;
  userRole: string;
  firmId: string;
}

export interface ResizeParams {
  eventId: string;
  newEnd: Date;
  userId: string;
  userRole: string;
  firmId: string;
}

// ------------------------------------------------------------
// UNDO TOKEN MANAGEMENT
// In production, use Redis or similar for expiring tokens
// ------------------------------------------------------------

const undoTokens = new Map<string, {
  eventId: string;
  previousStart: Date;
  previousEnd: Date;
  userId: string;
  createdAt: Date;
}>();

// Token expiration (5 minutes)
const UNDO_TOKEN_EXPIRY_MS = 5 * 60 * 1000;

function generateUndoToken(
  eventId: string,
  previousStart: Date,
  previousEnd: Date,
  userId: string
): string {
  const token = `undo_${eventId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  undoTokens.set(token, {
    eventId,
    previousStart,
    previousEnd,
    userId,
    createdAt: new Date(),
  });

  // Clean up expired tokens
  for (const [key, value] of undoTokens.entries()) {
    if (Date.now() - value.createdAt.getTime() > UNDO_TOKEN_EXPIRY_MS) {
      undoTokens.delete(key);
    }
  }

  return token;
}

function getUndoToken(token: string) {
  const data = undoTokens.get(token);
  if (!data) return null;
  
  // Check expiration
  if (Date.now() - data.createdAt.getTime() > UNDO_TOKEN_EXPIRY_MS) {
    undoTokens.delete(token);
    return null;
  }
  
  return data;
}

function consumeUndoToken(token: string) {
  const data = getUndoToken(token);
  if (data) {
    undoTokens.delete(token);
  }
  return data;
}

// ------------------------------------------------------------
// RBAC HELPERS
// ------------------------------------------------------------

const RESCHEDULE_ALLOWED_ROLES = ['ADMIN', 'AGENCY'];
const RESIZE_ALLOWED_ROLES = ['ADMIN', 'AGENCY'];

export function canRescheduleEvent(userRole: string): boolean {
  return RESCHEDULE_ALLOWED_ROLES.includes(userRole);
}

export function canResizeEvent(userRole: string): boolean {
  return RESIZE_ALLOWED_ROLES.includes(userRole);
}

// ------------------------------------------------------------
// MAIN RESCHEDULE FUNCTION
// ------------------------------------------------------------

/**
 * Reschedule a calendar event with conflict detection and audit logging
 */
export async function rescheduleEvent(
  params: RescheduleParams
): Promise<RescheduleResult> {
  const { eventId, newStart, newEnd, userId, userRole, firmId, forceOverride, overrideReason } = params;

  // 1. Permission check
  if (!canRescheduleEvent(userRole)) {
    return {
      success: false,
      error: 'You do not have permission to reschedule events',
      code: 'FORBIDDEN',
      canUndo: false,
    };
  }

  // 2. Fetch the event
  const event = await db.calendarEvent.findUnique({
    where: { id: eventId },
    include: {
      assignedReporter: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (!event) {
    return {
      success: false,
      error: 'Event not found',
      code: 'NOT_FOUND',
      canUndo: false,
    };
  }

  // 3. Firm validation
  if (userRole !== 'ADMIN' && event.firmId !== firmId) {
    return {
      success: false,
      error: 'You do not have access to this event',
      code: 'FORBIDDEN',
      canUndo: false,
    };
  }

  // 4. Check if event is locked (converted to job)
  if (event.status === 'CONVERTED' || event.status === 'CANCELLED') {
    return {
      success: false,
      error: `Cannot reschedule a ${event.status.toLowerCase()} event`,
      code: 'EVENT_LOCKED',
      canUndo: false,
    };
  }

  // 5. Validate time range
  if (newEnd <= newStart) {
    return {
      success: false,
      error: 'End time must be after start time',
      code: 'INVALID_TIME_RANGE',
      canUndo: false,
    };
  }

  // 6. Check for conflicts
  const conflictResult = await checkForConflicts({
    eventId,
    reporterId: event.assignedReporterId || undefined,
    location: event.location || undefined,
    proposedStart: newStart,
    proposedEnd: newEnd,
    firmId: event.firmId,
  });

  // 7. Handle conflicts
  if (conflictResult.hasConflicts && !forceOverride) {
    return {
      success: false,
      error: 'Scheduling conflicts detected',
      code: 'CONFLICTS_DETECTED',
      conflicts: conflictResult,
      canUndo: false,
    };
  }

  // 8. If overriding conflicts, validate
  if (conflictResult.hasConflicts && forceOverride) {
    if (!conflictResult.canOverride) {
      return {
        success: false,
        error: 'These conflicts cannot be overridden',
        code: 'CANNOT_OVERRIDE',
        conflicts: conflictResult,
        canUndo: false,
      };
    }

    // Log the override
    await logAudit({
      userId,
      action: AuditAction.CALENDAR_CONFLICT_OVERRIDE,
      entityType: AuditEntityType.CalendarEvent,
      entityId: eventId,
      details: {
        conflicts: conflictResult.conflicts.map(c => ({
          type: c.type,
          conflictingEventId: c.conflictingEventId,
          message: c.message,
        })),
        overrideReason,
      },
    });
  }

  // 9. Store previous values for undo
  const previousStart = event.startTime;
  const previousEnd = event.endTime;

  // 10. Update the event
  try {
    const updatedEvent = await db.calendarEvent.update({
      where: { id: eventId },
      data: {
        startTime: newStart,
        endTime: newEnd,
        lastRescheduledAt: new Date(),
        lastRescheduledBy: { connect: { id: userId } },
        rescheduleCount: { increment: 1 },
        // Store original time on first reschedule
        originalStartTime: event.originalStartTime || previousStart,
        updatedAt: new Date(),
      },
    });

    // 11. Create undo token
    const undoToken = generateUndoToken(eventId, previousStart, previousEnd, userId);

    // 12. Audit log
    await logAudit({
      userId,
      action: AuditAction.CALENDAR_DRAG_DROP,
      entityType: AuditEntityType.CalendarEvent,
      entityId: eventId,
      details: {
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        newStart: newStart.toISOString(),
        newEnd: newEnd.toISOString(),
        rescheduleCount: updatedEvent.rescheduleCount,
        hadConflicts: conflictResult.hasConflicts,
        overrideUsed: forceOverride || false,
      },
    });

    return {
      success: true,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        startTime: updatedEvent.startTime,
        endTime: updatedEvent.endTime,
        previousStart,
        previousEnd,
      },
      canUndo: true,
      undoToken,
    };
  } catch (error) {
    console.error('Error rescheduling event:', error);
    return {
      success: false,
      error: 'Failed to reschedule event',
      code: 'INTERNAL_ERROR',
      canUndo: false,
    };
  }
}

// ------------------------------------------------------------
// UNDO RESCHEDULE FUNCTION
// ------------------------------------------------------------

/**
 * Undo a recent reschedule operation
 */
export async function undoReschedule(
  undoToken: string,
  params: UndoRescheduleParams
): Promise<RescheduleResult> {
  const { userId, userRole, firmId } = params;

  // 1. Permission check
  if (!canRescheduleEvent(userRole)) {
    return {
      success: false,
      error: 'You do not have permission to undo reschedules',
      code: 'FORBIDDEN',
      canUndo: false,
    };
  }

  // 2. Get and consume the undo token
  const tokenData = consumeUndoToken(undoToken);
  if (!tokenData) {
    return {
      success: false,
      error: 'Undo token expired or invalid',
      code: 'INVALID_TOKEN',
      canUndo: false,
    };
  }

  // 3. Verify the user matches
  if (tokenData.userId !== userId && userRole !== 'ADMIN') {
    return {
      success: false,
      error: 'You can only undo your own reschedules',
      code: 'FORBIDDEN',
      canUndo: false,
    };
  }

  // 4. Fetch the event
  const event = await db.calendarEvent.findUnique({
    where: { id: tokenData.eventId },
  });

  if (!event) {
    return {
      success: false,
      error: 'Event not found',
      code: 'NOT_FOUND',
      canUndo: false,
    };
  }

  // 5. Firm validation
  if (userRole !== 'ADMIN' && event.firmId !== firmId) {
    return {
      success: false,
      error: 'You do not have access to this event',
      code: 'FORBIDDEN',
      canUndo: false,
    };
  }

  // 6. Restore the previous time
  try {
    const currentStart = event.startTime;
    const currentEnd = event.endTime;

    const updatedEvent = await db.calendarEvent.update({
      where: { id: tokenData.eventId },
      data: {
        startTime: tokenData.previousStart,
        endTime: tokenData.previousEnd,
        updatedAt: new Date(),
      },
    });

    // 7. Audit log
    await logAudit({
      userId,
      action: AuditAction.CALENDAR_UNDO_RESCHEDULE,
      entityType: AuditEntityType.CalendarEvent,
      entityId: tokenData.eventId,
      details: {
        restoredStart: tokenData.previousStart.toISOString(),
        restoredEnd: tokenData.previousEnd.toISOString(),
        undoneStart: currentStart.toISOString(),
        undoneEnd: currentEnd.toISOString(),
      },
    });

    return {
      success: true,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        startTime: updatedEvent.startTime,
        endTime: updatedEvent.endTime,
        previousStart: currentStart,
        previousEnd: currentEnd,
      },
      canUndo: false, // Can't undo an undo
    };
  } catch (error) {
    console.error('Error undoing reschedule:', error);
    return {
      success: false,
      error: 'Failed to undo reschedule',
      code: 'INTERNAL_ERROR',
      canUndo: false,
    };
  }
}

// ------------------------------------------------------------
// RESIZE EVENT FUNCTION
// ------------------------------------------------------------

/**
 * Resize an event (change end time only)
 */
export async function resizeEvent(
  params: ResizeParams
): Promise<RescheduleResult> {
  const { eventId, newEnd, userId, userRole, firmId } = params;

  // 1. Permission check
  if (!canResizeEvent(userRole)) {
    return {
      success: false,
      error: 'You do not have permission to resize events',
      code: 'FORBIDDEN',
      canUndo: false,
    };
  }

  // 2. Fetch the event
  const event = await db.calendarEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return {
      success: false,
      error: 'Event not found',
      code: 'NOT_FOUND',
      canUndo: false,
    };
  }

  // 3. Firm validation
  if (userRole !== 'ADMIN' && event.firmId !== firmId) {
    return {
      success: false,
      error: 'You do not have access to this event',
      code: 'FORBIDDEN',
      canUndo: false,
    };
  }

  // 4. Check if event is locked
  if (event.status === 'CONVERTED' || event.status === 'CANCELLED') {
    return {
      success: false,
      error: `Cannot resize a ${event.status.toLowerCase()} event`,
      code: 'EVENT_LOCKED',
      canUndo: false,
    };
  }

  // 5. Validate new end time
  if (newEnd <= event.startTime) {
    return {
      success: false,
      error: 'End time must be after start time',
      code: 'INVALID_TIME_RANGE',
      canUndo: false,
    };
  }

  // 6. Check for conflicts with new duration
  const conflictResult = await checkForConflicts({
    eventId,
    reporterId: event.assignedReporterId || undefined,
    location: event.location || undefined,
    proposedStart: event.startTime,
    proposedEnd: newEnd,
    firmId: event.firmId,
  });

  if (conflictResult.hasConflicts) {
    return {
      success: false,
      error: 'Extending this event would create conflicts',
      code: 'CONFLICTS_DETECTED',
      conflicts: conflictResult,
      canUndo: false,
    };
  }

  // 7. Update the event
  try {
    const previousEnd = event.endTime;

    const updatedEvent = await db.calendarEvent.update({
      where: { id: eventId },
      data: {
        endTime: newEnd,
        updatedAt: new Date(),
      },
    });

    // 8. Audit log
    await logAudit({
      userId,
      action: AuditAction.CALENDAR_RESIZE,
      entityType: AuditEntityType.CalendarEvent,
      entityId: eventId,
      details: {
        previousEnd: previousEnd.toISOString(),
        newEnd: newEnd.toISOString(),
        durationChange: Math.round((newEnd.getTime() - previousEnd.getTime()) / (1000 * 60)),
      },
    });

    return {
      success: true,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        startTime: updatedEvent.startTime,
        endTime: updatedEvent.endTime,
        previousStart: event.startTime,
        previousEnd,
      },
      canUndo: false, // Resize doesn't support undo for now
    };
  } catch (error) {
    console.error('Error resizing event:', error);
    return {
      success: false,
      error: 'Failed to resize event',
      code: 'INTERNAL_ERROR',
      canUndo: false,
    };
  }
}

// ------------------------------------------------------------
// PREVIEW RESCHEDULE (DRY RUN)
// ------------------------------------------------------------

/**
 * Check what would happen if an event is rescheduled (without actually doing it)
 */
export async function previewReschedule(
  params: Omit<RescheduleParams, 'forceOverride' | 'overrideReason'>
): Promise<ConflictCheckResult & { eventTitle: string; isLocked: boolean }> {
  const { eventId, newStart, newEnd, firmId: _firmId } = params;

  // Fetch the event
  const event = await db.calendarEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return {
      hasConflicts: false,
      conflicts: [],
      canOverride: false,
      eventTitle: 'Unknown',
      isLocked: true,
    };
  }

  const isLocked = event.status === 'CONVERTED' || event.status === 'CANCELLED';

  const conflictResult = await checkForConflicts({
    eventId,
    reporterId: event.assignedReporterId || undefined,
    location: event.location || undefined,
    proposedStart: newStart,
    proposedEnd: newEnd,
    firmId: event.firmId,
  });

  return {
    ...conflictResult,
    eventTitle: event.title,
    isLocked,
  };
}

