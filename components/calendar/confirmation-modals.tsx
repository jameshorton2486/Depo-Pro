// ============================================================
// CALENDAR CONFIRMATION MODALS
// File: components/calendar/confirmation-modals.tsx
// ============================================================
// Required confirmations for sensitive calendar operations
// ============================================================

'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Calendar,
  Clock,
  User,
  ExternalLink,
  RefreshCw,
  Briefcase,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface BaseConfirmationProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface RescheduleConfirmationProps extends BaseConfirmationProps {
  eventTitle: string;
  originalStart: Date;
  originalEnd: Date;
  newStart: Date;
  newEnd: Date;
  reporterName?: string;
  hasLinkedJob?: boolean;
  isImminent?: boolean; // Within 24 hours
  warnings?: string[];
}

interface ReporterReassignmentConfirmationProps extends BaseConfirmationProps {
  eventTitle: string;
  eventDate: Date;
  currentReporterName: string;
  newReporterName: string;
  hasConflictingEvents?: boolean;
}

interface ExternalConflictConfirmationProps extends BaseConfirmationProps {
  internalEventTitle: string;
  externalEventTitle: string;
  externalProvider: 'GOOGLE' | 'OUTLOOK' | 'APPLE';
  conflictType: 'time_overlap' | 'double_booking';
  actionDescription: string;
}

interface JobMutationConfirmationProps extends BaseConfirmationProps {
  eventTitle: string;
  jobCaseName: string;
  mutationType: 'reschedule' | 'cancel' | 'reassign';
  affectedFields: string[];
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatDateTime(date: Date): string {
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// RESCHEDULE CONFIRMATION
// ============================================================

export function RescheduleConfirmation({
  open,
  onConfirm,
  onCancel,
  isLoading,
  eventTitle,
  originalStart,
  originalEnd,
  newStart,
  newEnd,
  reporterName,
  hasLinkedJob,
  isImminent,
  warnings = [],
}: RescheduleConfirmationProps) {
  const daysDifference = Math.abs(
    Math.round((newStart.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24))
  );
  
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Confirm Reschedule
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="font-medium text-foreground">{eventTitle}</p>
              
              {/* Time change visualization */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <p className="text-sm font-medium line-through text-gray-500">
                    {formatDateTime(originalStart)}
                  </p>
                  <p className="text-xs text-gray-400">
                    to {formatTime(originalEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">To</p>
                  <p className="text-sm font-medium text-blue-600">
                    {formatDateTime(newStart)}
                  </p>
                  <p className="text-xs text-gray-600">
                    to {formatTime(newEnd)}
                  </p>
                </div>
              </div>
              
              {/* Warnings */}
              {(isImminent || hasLinkedJob || daysDifference >= 7 || warnings.length > 0) && (
                <div className="space-y-2">
                  {isImminent && (
                    <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <span className="text-yellow-800">
                        This event is within 24 hours. Participants may not receive adequate notice.
                      </span>
                    </div>
                  )}
                  
                  {hasLinkedJob && (
                    <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-sm">
                      <Briefcase className="h-4 w-4 text-blue-600 mt-0.5" />
                      <span className="text-blue-800">
                        This event is linked to a job. The job record will also be updated.
                      </span>
                    </div>
                  )}
                  
                  {daysDifference >= 7 && (
                    <div className="flex items-start gap-2 p-2 bg-orange-50 rounded text-sm">
                      <Calendar className="h-4 w-4 text-orange-600 mt-0.5" />
                      <span className="text-orange-800">
                        Moving {daysDifference} days from original date.
                      </span>
                    </div>
                  )}
                  
                  {warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                      <AlertTriangle className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span className="text-gray-700">{warning}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {reporterName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Assigned to: {reporterName}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================
// REPORTER REASSIGNMENT CONFIRMATION
// ============================================================

export function ReporterReassignmentConfirmation({
  open,
  onConfirm,
  onCancel,
  isLoading,
  eventTitle,
  eventDate,
  currentReporterName,
  newReporterName,
  hasConflictingEvents,
}: ReporterReassignmentConfirmationProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            Confirm Reporter Change
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="font-medium text-foreground">{eventTitle}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(eventDate)}
              </p>
              
              {/* Reporter change visualization */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-1">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <p className="text-sm font-medium line-through text-gray-500">
                    {currentReporterName}
                  </p>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-1">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-purple-600">
                    {newReporterName}
                  </p>
                </div>
              </div>
              
              {hasConflictingEvents && (
                <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <span className="text-yellow-800">
                    {currentReporterName} has other events that day. They will be notified of this change.
                  </span>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                Both reporters will receive notification of this change.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Reassigning...' : 'Confirm Reassignment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================
// EXTERNAL CONFLICT CONFIRMATION
// ============================================================

const PROVIDER_NAMES = {
  GOOGLE: 'Google Calendar',
  OUTLOOK: 'Outlook',
  APPLE: 'Apple Calendar',
};

export function ExternalConflictConfirmation({
  open,
  onConfirm,
  onCancel,
  isLoading,
  internalEventTitle,
  externalEventTitle,
  externalProvider,
  conflictType,
  actionDescription,
}: ExternalConflictConfirmationProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-orange-600" />
            External Calendar Conflict
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                  This action conflicts with an event from {PROVIDER_NAMES[externalProvider]}.
                </p>
              </div>
              
              {/* Conflict visualization */}
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs bg-blue-100">Internal</Badge>
                  </div>
                  <p className="font-medium">{internalEventTitle}</p>
                </div>
                
                <div className="text-center text-sm text-muted-foreground">
                  {conflictType === 'time_overlap' ? 'overlaps with' : 'conflicts with'}
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg border-dashed border-2 border-gray-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">External</Badge>
                  </div>
                  <p className="font-medium text-gray-600">{externalEventTitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From {PROVIDER_NAMES[externalProvider]}
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded text-sm">
                <p className="font-medium text-blue-800 mb-1">What will happen:</p>
                <p className="text-blue-700">{actionDescription}</p>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Depo-Pro events always take priority over external calendar events.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Processing...' : 'Proceed Anyway'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================
// JOB MUTATION CONFIRMATION
// ============================================================

export function JobMutationConfirmation({
  open,
  onConfirm,
  onCancel,
  isLoading,
  eventTitle,
  jobCaseName,
  mutationType,
  affectedFields,
}: JobMutationConfirmationProps) {
  const getMutationDetails = () => {
    switch (mutationType) {
      case 'reschedule':
        return {
          icon: <Clock className="h-5 w-5 text-blue-600" />,
          title: 'Reschedule Linked Job',
          color: 'blue',
          description: 'This event is linked to a job. Rescheduling will update the job record.',
        };
      case 'cancel':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
          title: 'Cancel Linked Job Event',
          color: 'red',
          description: 'This event is linked to a job. Cancellation will affect the job workflow.',
        };
      case 'reassign':
        return {
          icon: <User className="h-5 w-5 text-purple-600" />,
          title: 'Reassign Linked Job',
          color: 'purple',
          description: 'This event is linked to a job. Reporter change will update job assignment.',
        };
    }
  };
  
  const details = getMutationDetails();
  
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {details.icon}
            {details.title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Event</p>
                <p className="font-medium">{eventTitle}</p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-muted-foreground">Linked Job</p>
                </div>
                <p className="font-medium text-blue-800">{jobCaseName}</p>
              </div>
              
              <p className="text-sm">{details.description}</p>
              
              {affectedFields.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Fields that will be updated:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {affectedFields.map((field, i) => (
                      <li key={i}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              details.color === 'blue' && 'bg-blue-600 hover:bg-blue-700',
              details.color === 'red' && 'bg-red-600 hover:bg-red-700',
              details.color === 'purple' && 'bg-purple-600 hover:bg-purple-700'
            )}
          >
            {isLoading ? 'Processing...' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================
// GENERIC DANGER CONFIRMATION
// ============================================================

interface DangerConfirmationProps extends BaseConfirmationProps {
  title: string;
  description: string;
  confirmText?: string;
  warnings?: string[];
}

export function DangerConfirmation({
  open,
  onConfirm,
  onCancel,
  isLoading,
  title,
  description,
  confirmText = 'Confirm',
  warnings = [],
}: DangerConfirmationProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{description}</p>
              
              {warnings.length > 0 && (
                <div className="space-y-2">
                  {warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded text-sm">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      <span className="text-red-700">{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
