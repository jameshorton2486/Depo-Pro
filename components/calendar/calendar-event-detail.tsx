// ============================================================
// CALENDAR EVENT DETAIL
// Path: components/calendar/calendar-event-detail.tsx
// ============================================================

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Briefcase,
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  extendedProps: {
    eventType: string;
    status: string;
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
    participants?: Array<{
      id: string;
      role: string;
      user?: { name: string; email: string };
      externalName?: string;
      externalEmail?: string;
    }>;
    notes?: string;
    timezone: string;
  };
}

interface CalendarEventDetailProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onUpdate: () => void;
  canEdit: boolean;
}

// ------------------------------------------------------------
// STATUS CONFIG
// ------------------------------------------------------------

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  REQUESTED: { color: 'bg-orange-500', label: 'Requested', icon: Clock },
  SCHEDULED: { color: 'bg-blue-500', label: 'Scheduled', icon: Calendar },
  CONFIRMED: { color: 'bg-green-500', label: 'Confirmed', icon: CheckCircle },
  IN_PROGRESS: { color: 'bg-teal-500', label: 'In Progress', icon: Loader2 },
  COMPLETED: { color: 'bg-gray-500', label: 'Completed', icon: CheckCircle },
  CANCELLED: { color: 'bg-red-500', label: 'Cancelled', icon: XCircle },
  RESCHEDULED: { color: 'bg-purple-500', label: 'Rescheduled', icon: Calendar },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  DEPOSITION: 'Deposition',
  HEARING: 'Hearing',
  ARBITRATION: 'Arbitration',
  MEDIATION: 'Mediation',
  EUO: 'Examination Under Oath',
  STATEMENT: 'Recorded Statement',
  OTHER: 'Other',
};

// ------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------

export function CalendarEventDetail({
  isOpen,
  onClose,
  event,
  onUpdate,
  canEdit,
}: CalendarEventDetailProps) {
  const { session } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  if (!event) return null;

  const statusConfig = STATUS_CONFIG[event.extendedProps.status] || STATUS_CONFIG.SCHEDULED;
  const StatusIcon = statusConfig.icon;

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  const isReporter = session?.user?.role === 'REPORTER';
  const isAssigned = event.extendedProps.assignedReporter?.id === session?.user?.id;
  const canConfirm = isReporter && isAssigned && event.extendedProps.status === 'SCHEDULED';

  // ------------------------------------------------------------
  // ACTIONS
  // ------------------------------------------------------------

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm');
      }

      toast.success('Event confirmed');
      onUpdate();
    } catch (error) {
      console.error('Error confirming:', error);
      toast.error('Failed to confirm event');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          cancellationReason: cancellationReason.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel');
      }

      toast.success('Event cancelled');
      setShowCancelDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Error cancelling:', error);
      toast.error('Failed to cancel event');
    } finally {
      setIsCancelling(false);
    }
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl">{event.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`${statusConfig.color} text-white`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                  <Badge variant="outline">
                    {EVENT_TYPE_LABELS[event.extendedProps.eventType]}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Date & Time */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date & Time
              </h3>
              <div className="pl-6 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Start: </span>
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                  {!event.allDay && ` at ${format(startDate, 'h:mm a')}`}
                </p>
                <p>
                  <span className="text-muted-foreground">End: </span>
                  {format(endDate, 'EEEE, MMMM d, yyyy')}
                  {!event.allDay && ` at ${format(endDate, 'h:mm a')}`}
                </p>
                <p className="text-muted-foreground text-xs">
                  Timezone: {event.extendedProps.timezone}
                </p>
              </div>
            </div>

            <Separator />

            {/* Location */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                {event.extendedProps.isRemote ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                Location
              </h3>
              <div className="pl-6 text-sm">
                {event.extendedProps.isRemote ? (
                  <>
                    <p>Remote / Video Conference</p>
                    {event.extendedProps.meetingLink && (
                      <a
                        href={event.extendedProps.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        Join Meeting
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </>
                ) : (
                  <p>{event.extendedProps.location || 'No location specified'}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Assigned Reporter */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Assigned Reporter
              </h3>
              <div className="pl-6 text-sm">
                {event.extendedProps.assignedReporter ? (
                  <>
                    <p className="font-medium">{event.extendedProps.assignedReporter.name}</p>
                    <p className="text-muted-foreground">{event.extendedProps.assignedReporter.email}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Not yet assigned</p>
                )}
              </div>
            </div>

            {/* Linked Job */}
            {event.extendedProps.job && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Linked Job
                  </h3>
                  <div className="pl-6 text-sm">
                    <p className="font-medium">{event.extendedProps.job.caseName}</p>
                    <p className="text-muted-foreground">Status: {event.extendedProps.job.status}</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto mt-1"
                      asChild
                    >
                      <a href={`/jobs/${event.extendedProps.job.id}`}>
                        View Job Details →
                      </a>
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Participants */}
            {event.extendedProps.participants && event.extendedProps.participants.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Participants
                  </h3>
                  <div className="pl-6 space-y-2">
                    {event.extendedProps.participants.map((participant) => (
                      <div key={participant.id} className="text-sm">
                        <p className="font-medium">
                          {participant.user?.name || participant.externalName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {participant.role.replace('_', ' ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {event.extendedProps.notes && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notes
                  </h3>
                  <div className="pl-6 text-sm">
                    <p className="whitespace-pre-wrap">{event.extendedProps.notes}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="mt-8 flex-col sm:flex-row gap-2">
            {/* Reporter Confirm Button */}
            {canConfirm && (
              <Button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="w-full sm:w-auto"
              >
                {isConfirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Assignment
              </Button>
            )}

            {/* Agency/Admin Actions */}
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: Open edit modal
                    toast.info('Edit functionality coming soon');
                  }}
                  className="w-full sm:w-auto"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Event
                </Button>

                {event.extendedProps.status !== 'CANCELLED' &&
                 event.extendedProps.status !== 'COMPLETED' && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full sm:w-auto"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Event
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the event and notify all participants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for cancellation..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancellationReason('')}>
              Keep Event
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling || !cancellationReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancel Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
