// ============================================================
// CALENDAR EVENT MODAL
// Path: components/calendar/calendar-event-modal.tsx
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calendar, Clock, MapPin, Video, User } from 'lucide-react';
import { toast } from 'sonner';

// ------------------------------------------------------------
// VALIDATION SCHEMA
// ------------------------------------------------------------

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  eventType: z.enum(['DEPOSITION', 'HEARING', 'ARBITRATION', 'MEDIATION', 'EUO', 'STATEMENT', 'OTHER']),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endDate: z.string().min(1, 'End date is required'),
  endTime: z.string().min(1, 'End time is required'),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  meetingLink: z.string().url('Invalid URL').optional().or(z.literal('')),
  assignedReporterId: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

// ------------------------------------------------------------
// PROPS
// ------------------------------------------------------------

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDateRange?: { start: Date; end: Date } | null;
  reporters?: Array<{ id: string; name: string }>;
  editEvent?: any; // For editing existing events
}

// ------------------------------------------------------------
// EVENT TYPES
// ------------------------------------------------------------

const EVENT_TYPES = [
  { value: 'DEPOSITION', label: 'Deposition' },
  { value: 'HEARING', label: 'Hearing' },
  { value: 'ARBITRATION', label: 'Arbitration' },
  { value: 'MEDIATION', label: 'Mediation' },
  { value: 'EUO', label: 'Examination Under Oath' },
  { value: 'STATEMENT', label: 'Recorded Statement' },
  { value: 'OTHER', label: 'Other' },
];

// ------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------

export function CalendarEventModal({
  isOpen,
  onClose,
  onSuccess,
  initialDateRange,
  reporters = [],
  editEvent,
}: CalendarEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form
  const form = useForm<EventFormData, any, EventFormData>({
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      title: '',
      eventType: 'DEPOSITION',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '12:00',
      allDay: false,
      location: '',
      isRemote: false,
      meetingLink: '',
      assignedReporterId: '',
      notes: '',
      internalNotes: '',
    },
  });

  const { watch, setValue } = form;
  const isRemote = watch('isRemote');
  const allDay = watch('allDay');

  // Set initial dates when modal opens with date selection
  useEffect(() => {
    if (initialDateRange) {
      setValue('startDate', format(initialDateRange.start, 'yyyy-MM-dd'));
      setValue('endDate', format(initialDateRange.end, 'yyyy-MM-dd'));
      
      // If same day, set reasonable times
      if (format(initialDateRange.start, 'yyyy-MM-dd') === format(initialDateRange.end, 'yyyy-MM-dd')) {
        setValue('startTime', format(initialDateRange.start, 'HH:mm'));
        // Default to 3 hours if no end time specified
        const endTime = new Date(initialDateRange.start);
        endTime.setHours(endTime.getHours() + 3);
        setValue('endTime', format(endTime, 'HH:mm'));
      }
    }
  }, [initialDateRange, setValue]);

  // Populate form when editing
  useEffect(() => {
    if (editEvent) {
      const startDate = new Date(editEvent.start);
      const endDate = new Date(editEvent.end);
      
      form.reset({
        title: editEvent.title,
        eventType: editEvent.extendedProps?.eventType || 'DEPOSITION',
        startDate: format(startDate, 'yyyy-MM-dd'),
        startTime: format(startDate, 'HH:mm'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        endTime: format(endDate, 'HH:mm'),
        allDay: editEvent.allDay || false,
        location: editEvent.extendedProps?.location || '',
        isRemote: editEvent.extendedProps?.isRemote || false,
        meetingLink: editEvent.extendedProps?.meetingLink || '',
        assignedReporterId: editEvent.extendedProps?.assignedReporter?.id || '',
        notes: editEvent.extendedProps?.notes || '',
      });
    }
  }, [editEvent, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  // Handle submit
  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    
    try {
      // Construct datetime strings
      const startDateTime = allDay 
        ? `${data.startDate}T00:00:00`
        : `${data.startDate}T${data.startTime}:00`;
      
      const endDateTime = allDay
        ? `${data.endDate}T23:59:59`
        : `${data.endDate}T${data.endTime}:00`;

      // Validate end is after start
      if (new Date(endDateTime) <= new Date(startDateTime)) {
        toast.error('End time must be after start time');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        title: data.title,
        eventType: data.eventType,
        startTime: new Date(startDateTime).toISOString(),
        endTime: new Date(endDateTime).toISOString(),
        allDay: data.allDay,
        location: data.location || undefined,
        isRemote: data.isRemote,
        meetingLink: data.isRemote && data.meetingLink ? data.meetingLink : undefined,
        assignedReporterId: data.assignedReporterId || undefined,
        notes: data.notes || undefined,
        internalNotes: data.internalNotes || undefined,
      };

      const url = editEvent 
        ? `/api/calendar/events/${editEvent.id}`
        : '/api/calendar/events';
      
      const method = editEvent ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle conflict
        if (response.status === 409) {
          toast.error('Scheduling Conflict', {
            description: `${result.conflicts?.length || 0} conflicting event(s) found`,
          });
          return;
        }
        
        throw new Error(result.error || 'Failed to save event');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error(error.message || 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editEvent ? 'Edit Event' : 'Schedule New Event'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Smith v. Jones Deposition" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Type */}
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* All Day Toggle */}
            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>All Day Event</FormLabel>
                    <FormDescription>
                      Toggle for events without specific times
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Date/Time Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start */}
              <div className="space-y-2">
                <FormField
                  control={form.control as any}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Start Date *
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!allDay && (
                  <FormField
                    control={form.control as any}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Start Time *
                        </FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* End */}
              <div className="space-y-2">
                <FormField
                  control={form.control as any}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        End Date *
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!allDay && (
                  <FormField
                    control={form.control as any}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          End Time *
                        </FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Assigned Reporter */}
            {reporters.length > 0 && (
              <FormField
                control={form.control as any}
                name="assignedReporterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Assign Reporter
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reporter (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {reporters.map(reporter => (
                          <SelectItem key={reporter.id} value={reporter.id}>
                            {reporter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Remote Toggle */}
            <FormField
              control={form.control}
              name="isRemote"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Remote Event
                    </FormLabel>
                    <FormDescription>
                      Via Zoom or other video platform
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Meeting Link (if remote) */}
            {isRemote && (
              <FormField
                control={form.control as any}
                name="meetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Link</FormLabel>
                    <FormControl>
                      <Input 
                        type="url"
                        placeholder="https://zoom.us/j/..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Location (if not remote) */}
            {!isRemote && (
              <FormField
                control={form.control as any}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Address or room number" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Internal Notes */}
            <FormField
              control={form.control}
              name="internalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes (Agency Only)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notes visible only to agency staff..."
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Not visible to reporters or attorneys
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
