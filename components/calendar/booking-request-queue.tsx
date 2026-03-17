// ============================================================
// AGENCY BOOKING REQUEST QUEUE
// Path: components/calendar/booking-request-queue.tsx
// Task 2.3.3 - Agency view for managing booking requests
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Video,
  Languages,
  AlertCircle,
  RefreshCw,
  Eye,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

interface BookingRequest {
  id: string;
  caseName: string;
  caseNumber?: string;
  preferredDate: string;
  alternateDate1?: string;
  alternateDate2?: string;
  estimatedDuration: number;
  eventType: string;
  location?: string;
  isRemote: boolean;
  deponentName: string;
  deponentContact?: string;
  needsInterpreter: boolean;
  interpreterLanguage?: string;
  needsVideographer: boolean;
  needsRealtime: boolean;
  specialNotes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'MODIFIED';
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  respondedBy?: {
    id: string;
    name: string;
  };
  calendarEvent?: {
    id: string;
    title: string;
    startTime: string;
    status: string;
  };
  createdAt: string;
}

interface Reporter {
  id: string;
  name: string;
}

interface BookingRequestQueueProps {
  reporters?: Reporter[];
}

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const STATUS_CONFIG = {
  PENDING: { color: 'bg-yellow-500', label: 'Pending', icon: Clock },
  APPROVED: { color: 'bg-green-500', label: 'Approved', icon: CheckCircle },
  REJECTED: { color: 'bg-red-500', label: 'Rejected', icon: XCircle },
  CANCELLED: { color: 'bg-gray-500', label: 'Cancelled', icon: XCircle },
  MODIFIED: { color: 'bg-blue-500', label: 'Modified', icon: AlertCircle },
};

// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------

export function BookingRequestQueue({ reporters = [] }: BookingRequestQueueProps) {
  // State
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'modify' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action form state
  const [actionForm, setActionForm] = useState({
    assignedReporterId: '',
    confirmedDate: '',
    confirmedTime: '',
    rejectionReason: '',
    proposedDate: '',
    proposedTime: '',
  });

  // ------------------------------------------------------------
  // DATA FETCHING
  // ------------------------------------------------------------

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/calendar/booking-requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load booking requests');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ------------------------------------------------------------
  // ACTIONS
  // ------------------------------------------------------------

  const openActionDialog = (request: BookingRequest, type: 'approve' | 'reject' | 'modify') => {
    setSelectedRequest(request);
    setActionType(type);

    // Pre-fill form
    const prefDate = new Date(request.preferredDate);
    setActionForm({
      assignedReporterId: '',
      confirmedDate: format(prefDate, 'yyyy-MM-dd'),
      confirmedTime: format(prefDate, 'HH:mm'),
      rejectionReason: '',
      proposedDate: format(prefDate, 'yyyy-MM-dd'),
      proposedTime: format(prefDate, 'HH:mm'),
    });

    setIsActionOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setIsSubmitting(true);
    try {
      const payload: any = { action: actionType };

      if (actionType === 'approve') {
        if (!actionForm.assignedReporterId) {
          toast.error('Please select a reporter');
          setIsSubmitting(false);
          return;
        }

        const confirmedDateTime = `${actionForm.confirmedDate}T${actionForm.confirmedTime}:00`;
        payload.assignedReporterId = actionForm.assignedReporterId;
        payload.confirmedDate = new Date(confirmedDateTime).toISOString();
      } else if (actionType === 'reject') {
        if (!actionForm.rejectionReason.trim()) {
          toast.error('Please provide a reason');
          setIsSubmitting(false);
          return;
        }
        payload.rejectionReason = actionForm.rejectionReason;
      } else if (actionType === 'modify') {
        const proposedDateTime = `${actionForm.proposedDate}T${actionForm.proposedTime}:00`;
        payload.proposedDate = new Date(proposedDateTime).toISOString();
      }

      const response = await fetch(`/api/calendar/booking-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          toast.error('Reporter has a conflict at this time');
          return;
        }
        throw new Error(data.error || 'Action failed');
      }

      toast.success(
        actionType === 'approve' ? 'Request approved!' :
        actionType === 'reject' ? 'Request rejected' :
        'Alternative date proposed'
      );

      setIsActionOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetail = (request: BookingRequest) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Booking Requests</h2>
          <p className="text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} pending request${pendingCount > 1 ? 's' : ''} awaiting review`
              : 'All requests have been processed'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="MODIFIED">Modified</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchRequests}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No booking requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Deponent</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(request => {
                  const statusConfig = STATUS_CONFIG[request.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.caseName}</p>
                          {request.caseNumber && (
                            <p className="text-xs text-muted-foreground">
                              #{request.caseNumber}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            by {request.requestedBy.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{request.deponentName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(request.preferredDate), 'MMM d, yyyy')}
                          <br />
                          <span className="text-muted-foreground">
                            {format(new Date(request.preferredDate), 'h:mm a')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(request.estimatedDuration)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.eventType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {request.isRemote && (
                            <Badge variant="secondary" className="text-xs">
                              <Video className="w-3 h-3 mr-1" />
                              Remote
                            </Badge>
                          )}
                          {request.needsInterpreter && (
                            <Badge variant="secondary" className="text-xs">
                              <Languages className="w-3 h-3 mr-1" />
                              {request.interpreterLanguage}
                            </Badge>
                          )}
                          {request.needsVideographer && (
                            <Badge variant="secondary" className="text-xs">
                              Video
                            </Badge>
                          )}
                          {request.needsRealtime && (
                            <Badge variant="secondary" className="text-xs">
                              Realtime
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig.color} text-white`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(request)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {request.status === 'PENDING' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => openActionDialog(request, 'approve')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => openActionDialog(request, 'reject')}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Case Style</Label>
                  <p className="font-medium">{selectedRequest.caseName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cause Number</Label>
                  <p>{selectedRequest.caseNumber || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Deponent</Label>
                  <p>{selectedRequest.deponentName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Requested By</Label>
                  <p>{selectedRequest.requestedBy.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.requestedBy.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Preferred Date</Label>
                  <p>{format(new Date(selectedRequest.preferredDate), 'PPP p')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Duration</Label>
                  <p>{formatDuration(selectedRequest.estimatedDuration)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p>{selectedRequest.isRemote ? 'Remote / Video Conference' : selectedRequest.location || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Event Type</Label>
                  <p>{selectedRequest.eventType}</p>
                </div>
              </div>

              {selectedRequest.alternateDate1 && (
                <div>
                  <Label className="text-muted-foreground">Alternate Dates</Label>
                  <p>1. {format(new Date(selectedRequest.alternateDate1), 'PPP p')}</p>
                  {selectedRequest.alternateDate2 && (
                    <p>2. {format(new Date(selectedRequest.alternateDate2), 'PPP p')}</p>
                  )}
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Special Requirements</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedRequest.needsInterpreter && (
                    <Badge>Interpreter: {selectedRequest.interpreterLanguage}</Badge>
                  )}
                  {selectedRequest.needsVideographer && <Badge>Videographer</Badge>}
                  {selectedRequest.needsRealtime && <Badge>Realtime Transcription</Badge>}
                  {!selectedRequest.needsInterpreter && !selectedRequest.needsVideographer && !selectedRequest.needsRealtime && (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>

              {selectedRequest.specialNotes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.specialNotes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === 'PENDING' && (
              <>
                <Button variant="outline" onClick={() => openActionDialog(selectedRequest, 'modify')}>
                  Propose Different Date
                </Button>
                <Button variant="destructive" onClick={() => openActionDialog(selectedRequest, 'reject')}>
                  Reject
                </Button>
                <Button onClick={() => openActionDialog(selectedRequest, 'approve')}>
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Request'}
              {actionType === 'reject' && 'Reject Request'}
              {actionType === 'modify' && 'Propose Alternative Date'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'Assign a reporter and confirm the date to approve this request.'}
              {actionType === 'reject' && 'Provide a reason for rejecting this request.'}
              {actionType === 'modify' && 'Propose an alternative date for the attorney to consider.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === 'approve' && (
              <>
                <div className="space-y-2">
                  <Label>Assign Reporter *</Label>
                  <Select
                    value={actionForm.assignedReporterId}
                    onValueChange={(v) => setActionForm(prev => ({ ...prev, assignedReporterId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reporter" />
                    </SelectTrigger>
                    <SelectContent>
                      {reporters.map(reporter => (
                        <SelectItem key={reporter.id} value={reporter.id}>
                          {reporter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Confirmed Date</Label>
                    <Input
                      type="date"
                      value={actionForm.confirmedDate}
                      onChange={(e) => setActionForm(prev => ({ ...prev, confirmedDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={actionForm.confirmedTime}
                      onChange={(e) => setActionForm(prev => ({ ...prev, confirmedTime: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            {actionType === 'reject' && (
              <div className="space-y-2">
                <Label>Reason for Rejection *</Label>
                <Textarea
                  placeholder="Please explain why this request cannot be accommodated..."
                  value={actionForm.rejectionReason}
                  onChange={(e) => setActionForm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                  rows={3}
                />
              </div>
            )}

            {actionType === 'modify' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proposed Date</Label>
                  <Input
                    type="date"
                    value={actionForm.proposedDate}
                    onChange={(e) => setActionForm(prev => ({ ...prev, proposedDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={actionForm.proposedTime}
                    onChange={(e) => setActionForm(prev => ({ ...prev, proposedTime: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === 'approve' && 'Approve & Create Event'}
              {actionType === 'reject' && 'Reject Request'}
              {actionType === 'modify' && 'Send Proposal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
