'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  LocationType,
  DeponentRole,
  LOCATION_TYPE_LABELS,
  DEPONENT_ROLE_LABELS,
} from './calendar.types';

// ============================================
// FORM SCHEMA
// ============================================

const createEventSchema = z.object({
  // Case Info
  caseStyle: z.string().min(1, 'Case style is required'),
  caseNumber: z.string().optional(),
  deponentName: z.string().min(1, 'Deponent name is required'),
  deponentRole: z.enum(['PLAINTIFF', 'DEFENDANT', 'CORPORATE_REP', 'EXPERT_WITNESS', 'FACT_WITNESS', 'THIRD_PARTY']).optional(),
  
  // Scheduling
  scheduledDate: z.date({ message: 'Date is required' }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional(),
  timezone: z.string().default('America/Chicago'),
  
  // Location
  locationType: z.enum(['IN_PERSON', 'ZOOM', 'TEAMS', 'WEBEX', 'PHONE', 'HYBRID', 'OTHER']),
  locationAddress: z.string().optional(),
  locationRoom: z.string().optional(),
  zoomMeetingId: z.string().optional(),
  zoomJoinUrl: z.string().url().optional().or(z.literal('')),
  
  // Requirements
  interpreterRequired: z.boolean().default(false),
  interpreterLanguage: z.string().optional(),
  videographerRequired: z.boolean().default(false),
  realtimeRequired: z.boolean().default(false),
  
  // Assignment
  assignedReporterId: z.string().optional(),
  
  // Notes
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.endTime && data.startTime) {
      return data.endTime > data.startTime;
    }
    return true;
  },
  { message: 'End time must be after start time', path: ['endTime'] }
).refine(
  (data) => {
    if (data.interpreterRequired && !data.interpreterLanguage) {
      return false;
    }
    return true;
  },
  { message: 'Language is required when interpreter is needed', path: ['interpreterLanguage'] }
);

type CreateEventFormData = z.infer<typeof createEventSchema>;

// ============================================
// COMPONENT PROPS
// ============================================

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventFormData) => Promise<void>;
  defaultDate?: Date;
  reporters?: Array<{ id: string; firstName: string; lastName: string }>;
}

// ============================================
// CREATE EVENT MODAL COMPONENT
// ============================================

export function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
  reporters = [],
}: CreateEventModalProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('case');

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema) as any,
    defaultValues: {
      caseStyle: '',
      caseNumber: '',
      deponentName: '',
      deponentRole: undefined,
      scheduledDate: defaultDate || new Date(),
      startTime: '09:00',
      endTime: '',
      timezone: 'America/Chicago',
      locationType: 'IN_PERSON',
      locationAddress: '',
      locationRoom: '',
      zoomMeetingId: '',
      zoomJoinUrl: '',
      interpreterRequired: false,
      interpreterLanguage: '',
      videographerRequired: false,
      realtimeRequired: false,
      assignedReporterId: '',
      notes: '',
    },
  });

  const locationType = form.watch('locationType');
  const interpreterRequired = form.watch('interpreterRequired');

  const handleSubmit = (data: CreateEventFormData) => {
    startTransition(async () => {
      try {
        await onSubmit(data);
        toast.success('Deposition scheduled successfully');
        form.reset();
        onClose();
      } catch (error) {
        toast.error('Failed to schedule deposition');
        console.error(error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Deposition</DialogTitle>
          <DialogDescription>
            Enter the deposition details below. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit as any)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="case">Case Info</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
            </TabsList>

            {/* Case Info Tab */}
            <TabsContent value="case" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="caseStyle">
                  Case Style <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="caseStyle"
                  placeholder="Smith v. Jones, LLC"
                  {...form.register('caseStyle')}
                />
                {form.formState.errors.caseStyle && (
                  <p className="text-sm text-red-500">{form.formState.errors.caseStyle.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="caseNumber">Case Number</Label>
                <Input
                  id="caseNumber"
                  placeholder="2024-CV-12345"
                  {...form.register('caseNumber')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deponentName">
                  Deponent Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="deponentName"
                  placeholder="John Smith"
                  {...form.register('deponentName')}
                />
                {form.formState.errors.deponentName && (
                  <p className="text-sm text-red-500">{form.formState.errors.deponentName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deponentRole">Deponent Role</Label>
                <Select
                  value={form.watch('deponentRole')}
                  onValueChange={(value) => form.setValue('deponentRole', value as DeponentRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPONENT_ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => setActiveTab('schedule')}>
                  Next: Schedule →
                </Button>
              </div>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.watch('scheduledDate') && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('scheduledDate')
                        ? format(form.watch('scheduledDate'), 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('scheduledDate')}
                      onSelect={(date: Date | undefined) => date && form.setValue('scheduledDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">
                    Start Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...form.register('startTime')}
                  />
                  {form.formState.errors.startTime && (
                    <p className="text-sm text-red-500">{form.formState.errors.startTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (Optional)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...form.register('endTime')}
                  />
                  {form.formState.errors.endTime && (
                    <p className="text-sm text-red-500">{form.formState.errors.endTime.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={form.watch('timezone')}
                  onValueChange={(value) => form.setValue('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reporters.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="assignedReporterId">Assign Reporter</Label>
                  <Select
                    value={form.watch('assignedReporterId')}
                    onValueChange={(value) => form.setValue('assignedReporterId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reporter..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {reporters.map((reporter) => (
                        <SelectItem key={reporter.id} value={reporter.id}>
                          {reporter.firstName} {reporter.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab('case')}>
                  ← Back
                </Button>
                <Button type="button" onClick={() => setActiveTab('location')}>
                  Next: Location →
                </Button>
              </div>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Location Type <span className="text-red-500">*</span></Label>
                <Select
                  value={form.watch('locationType')}
                  onValueChange={(value) => form.setValue('locationType', value as LocationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(locationType === 'IN_PERSON' || locationType === 'HYBRID') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="locationAddress">Address</Label>
                    <Input
                      id="locationAddress"
                      placeholder="123 Main St, Houston, TX 77001"
                      {...form.register('locationAddress')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="locationRoom">Conference Room</Label>
                    <Input
                      id="locationRoom"
                      placeholder="Conference Room A"
                      {...form.register('locationRoom')}
                    />
                  </div>
                </>
              )}

              {(locationType === 'ZOOM' || locationType === 'TEAMS' || locationType === 'WEBEX' || locationType === 'HYBRID') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="zoomMeetingId">Meeting ID</Label>
                    <Input
                      id="zoomMeetingId"
                      placeholder="123 456 7890"
                      {...form.register('zoomMeetingId')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zoomJoinUrl">Meeting Link</Label>
                    <Input
                      id="zoomJoinUrl"
                      type="url"
                      placeholder="https://zoom.us/j/..."
                      {...form.register('zoomJoinUrl')}
                    />
                    {form.formState.errors.zoomJoinUrl && (
                      <p className="text-sm text-red-500">{form.formState.errors.zoomJoinUrl.message}</p>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab('schedule')}>
                  ← Back
                </Button>
                <Button type="button" onClick={() => setActiveTab('requirements')}>
                  Next: Requirements →
                </Button>
              </div>
            </TabsContent>

            {/* Requirements Tab */}
            <TabsContent value="requirements" className="space-y-4 mt-4">
              <div className="space-y-4">
                {/* Interpreter */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Interpreter Required</Label>
                    <p className="text-sm text-gray-500">
                      A foreign language interpreter is needed
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('interpreterRequired')}
                    onCheckedChange={(checked) => form.setValue('interpreterRequired', checked)}
                  />
                </div>

                {interpreterRequired && (
                  <div className="space-y-2 pl-4">
                    <Label htmlFor="interpreterLanguage">
                      Language <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="interpreterLanguage"
                      placeholder="Spanish"
                      {...form.register('interpreterLanguage')}
                    />
                    {form.formState.errors.interpreterLanguage && (
                      <p className="text-sm text-red-500">{form.formState.errors.interpreterLanguage.message}</p>
                    )}
                  </div>
                )}

                {/* Videographer */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Videographer Required</Label>
                    <p className="text-sm text-gray-500">
                      Video recording of the deposition
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('videographerRequired')}
                    onCheckedChange={(checked) => form.setValue('videographerRequired', checked)}
                  />
                </div>

                {/* Realtime */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Realtime Required</Label>
                    <p className="text-sm text-gray-500">
                      Live transcript streaming during deposition
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('realtimeRequired')}
                    onCheckedChange={(checked) => form.setValue('realtimeRequired', checked)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes or special instructions..."
                  rows={3}
                  {...form.register('notes')}
                />
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab('location')}>
                  ← Back
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Deposition
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateEventModal;
