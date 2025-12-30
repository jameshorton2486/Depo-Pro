'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ConvertToJobButton } from './convert-to-job-button';
import { EventStatusBadge } from './event-status-badge';
import { AssignReporterDropdown } from '@/components/jobs/assign-reporter-dropdown';
import { 
  Calendar, 
  MapPin, 
  Video, 
  FileText,
  ExternalLink,
} from 'lucide-react';

interface CalendarEventWithJob {
  id: string;
  title: string;
  caseStyle?: string | null;
  caseNumber?: string | null;
  startTime: Date;
  endTime?: Date | null;
  location?: string | null;
  meetingLink?: string | null;
  status: 'REQUESTED' | 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CONVERTED' | 'CANCELLED' | 'RESCHEDULED';
  notes?: string | null;
  firmId: string;
  agencyId?: string | null;
  jobId?: string | null;
  job?: {
    id: string;
    title: string;
    status: string;
    assignedToId?: string | null;
    createdBy?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  } | null;
  assignedReporter?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface EventDetailPanelProps {
  event: CalendarEventWithJob;
  userRole?: string;
  onClose?: () => void;
}

export function EventDetailPanel({ event, userRole, onClose: _onClose }: EventDetailPanelProps) {
  const router = useRouter();
  const isConverted = event.status === 'CONVERTED' || !!event.jobId;

  const handleConversionComplete = (jobId: string) => {
    // Refresh the page or navigate to the job
    router.push(`/jobs/${jobId}`);
  };

  const handleViewJob = () => {
    if (event.jobId) {
      router.push(`/jobs/${event.jobId}`);
    }
  };

  const reporterName = event.assignedReporter 
    ? `${event.assignedReporter.firstName || ''} ${event.assignedReporter.lastName || ''}`.trim()
    : event.job?.createdBy
    ? `${event.job.createdBy.firstName || ''} ${event.job.createdBy.lastName || ''}`.trim()
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-xl">{event.title}</CardTitle>
          {event.caseStyle && (
            <p className="text-sm text-muted-foreground mt-1">
              {event.caseStyle}
              {event.caseNumber && ` • Case #${event.caseNumber}`}
            </p>
          )}
        </div>
        <EventStatusBadge status={event.status as any} hasJob={!!event.jobId} />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date & Time */}
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">
              {format(new Date(event.startTime), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.startTime), 'h:mm a')}
              {event.endTime && (
                <> – {format(new Date(event.endTime), 'h:mm a')}</>
              )}
            </p>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <p>{event.location}</p>
          </div>
        )}

        {/* Zoom Link */}
        {event.meetingLink && (
          <div className="flex items-start gap-3">
            <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
            <a 
              href={event.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Join Zoom Meeting
            </a>
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <p className="text-sm">{event.notes}</p>
          </div>
        )}

        <Separator />

        {/* Job Section */}
        {isConverted && event.job ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Linked Job</h4>
              <Button variant="outline" size="sm" onClick={handleViewJob}>
                View Job
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Reporter Assignment */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Assigned Reporter</p>
              <AssignReporterDropdown
                jobId={event.job.id}
                firmId={event.firmId}
                agencyId={event.agencyId}
                currentReporterId={event.job.assignedToId || undefined}
                currentReporterName={reporterName || undefined}
                userRole={userRole}
                onAssignmentChange={() => router.refresh()}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-medium">Actions</h4>
            <ConvertToJobButton
              eventId={event.id}
              eventTitle={event.title}
              isConverted={isConverted}
              existingJobId={event.jobId}
              userRole={userRole}
              onConversionComplete={handleConversionComplete}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

