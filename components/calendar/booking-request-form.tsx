// ============================================================
// ATTORNEY BOOKING REQUEST FORM
// Path: components/calendar/booking-request-form.tsx
// Task 2.3.3 - Attorney Booking Request Workflow
// ============================================================

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Calendar,
  User,
  MapPin,
  Video,
  Languages,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ------------------------------------------------------------
// VALIDATION SCHEMA
// ------------------------------------------------------------

const bookingRequestSchema = z.object({
  caseName: z.string().min(1, 'Case name is required'),
  caseNumber: z.string().optional(),
  preferredDate: z.string().min(1, 'Preferred date is required'),
  preferredTime: z.string().min(1, 'Preferred time is required'),
  alternateDate1: z.string().optional(),
  alternateTime1: z.string().optional(),
  alternateDate2: z.string().optional(),
  alternateTime2: z.string().optional(),
  estimatedHours: z.string().default('4'),
  eventType: z.enum(['DEPOSITION', 'HEARING', 'ARBITRATION', 'MEDIATION', 'EUO', 'STATEMENT', 'OTHER']),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  deponentName: z.string().min(1, 'Deponent name is required'),
  deponentContact: z.string().optional(),
  needsInterpreter: z.boolean().default(false),
  interpreterLanguage: z.string().optional(),
  needsVideographer: z.boolean().default(false),
  needsRealtime: z.boolean().default(false),
  specialNotes: z.string().optional(),
});

type BookingRequestFormData = z.infer<typeof bookingRequestSchema>;

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const EVENT_TYPES = [
  { value: 'DEPOSITION', label: 'Deposition' },
  { value: 'HEARING', label: 'Hearing' },
  { value: 'ARBITRATION', label: 'Arbitration' },
  { value: 'MEDIATION', label: 'Mediation' },
  { value: 'EUO', label: 'Examination Under Oath (EUO)' },
  { value: 'STATEMENT', label: 'Recorded Statement' },
  { value: 'OTHER', label: 'Other' },
];

const DURATION_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '3', label: '3 hours' },
  { value: '4', label: '4 hours (half day)' },
  { value: '6', label: '6 hours' },
  { value: '8', label: '8 hours (full day)' },
];

const LANGUAGES = [
  'Spanish',
  'Mandarin Chinese',
  'Vietnamese',
  'Korean',
  'Tagalog',
  'Arabic',
  'French',
  'German',
  'Russian',
  'Portuguese',
  'Japanese',
  'Italian',
  'Polish',
  'Hindi',
  'American Sign Language (ASL)',
  'Other',
];

// ------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------

export function BookingRequestForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BookingRequestFormData>({
    resolver: zodResolver(bookingRequestSchema) as any,
    defaultValues: {
      caseName: '',
      caseNumber: '',
      preferredDate: '',
      preferredTime: '09:00',
      alternateDate1: '',
      alternateTime1: '09:00',
      alternateDate2: '',
      alternateTime2: '09:00',
      estimatedHours: '4',
      eventType: 'DEPOSITION',
      location: '',
      isRemote: false,
      deponentName: '',
      deponentContact: '',
      needsInterpreter: false,
      interpreterLanguage: '',
      needsVideographer: false,
      needsRealtime: false,
      specialNotes: '',
    },
  });

  const { watch } = form;
  const isRemote = watch('isRemote');
  const needsInterpreter = watch('needsInterpreter');

  // ------------------------------------------------------------
  // SUBMIT HANDLER
  // ------------------------------------------------------------

  const onSubmit = async (data: BookingRequestFormData) => {
    setIsSubmitting(true);

    try {
      // Combine date and time
      const preferredDateTime = `${data.preferredDate}T${data.preferredTime}:00`;

      const payload: any = {
        caseName: data.caseName,
        caseNumber: data.caseNumber || undefined,
        preferredDate: new Date(preferredDateTime).toISOString(),
        estimatedDuration: parseInt(data.estimatedHours) * 60, // Convert to minutes
        eventType: data.eventType,
        location: data.isRemote ? 'Remote' : data.location,
        isRemote: data.isRemote,
        deponentName: data.deponentName,
        deponentContact: data.deponentContact || undefined,
        needsInterpreter: data.needsInterpreter,
        interpreterLanguage: data.needsInterpreter ? data.interpreterLanguage : undefined,
        needsVideographer: data.needsVideographer,
        needsRealtime: data.needsRealtime,
        specialNotes: data.specialNotes || undefined,
      };

      // Add alternate dates if provided
      if (data.alternateDate1 && data.alternateTime1) {
        payload.alternateDate1 = new Date(`${data.alternateDate1}T${data.alternateTime1}:00`).toISOString();
      }
      if (data.alternateDate2 && data.alternateTime2) {
        payload.alternateDate2 = new Date(`${data.alternateDate2}T${data.alternateTime2}:00`).toISOString();
      }

      const response = await fetch('/api/calendar/booking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to submit request');
      }

      toast.success('Booking request submitted!', {
        description: 'The agency will review and respond to your request.',
      });

      router.push('/calendar/requests');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Case Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Case Information
            </CardTitle>
            <CardDescription>
              Enter the case details for this deposition request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="caseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith v. Jones" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="caseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Number</FormLabel>
                    <FormControl>
                      <Input placeholder="2025-CV-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type *</FormLabel>
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
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Scheduling
            </CardTitle>
            <CardDescription>
              Provide your preferred date(s) and time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preferred Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control as any}
                name="preferredDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="preferredTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Duration</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Alternate Dates */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Alternate dates (optional, increases scheduling success)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <FormField
                    control={form.control as any}
                    name="alternateDate1"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Alternate Date 1</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="alternateTime1"
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2">
                  <FormField
                    control={form.control as any}
                    name="alternateDate2"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Alternate Date 2</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="alternateTime2"
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deponent Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Deponent Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="deponentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deponent Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="deponentContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deponent Contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone or email" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional - for coordination
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="isRemote"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Remote Deposition
                    </FormLabel>
                    <FormDescription>
                      Conduct via Zoom or other video platform
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

            {!isRemote && (
              <FormField
                control={form.control as any}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main St, Suite 400, City, State ZIP"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Special Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Special Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Interpreter */}
            <FormField
              control={form.control}
              name="needsInterpreter"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Languages className="w-4 h-4" />
                      Interpreter Needed
                    </FormLabel>
                    <FormDescription>
                      Deponent requires language interpretation
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

            {needsInterpreter && (
              <FormField
                control={form.control as any}
                name="interpreterLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language Required *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Videographer */}
            <FormField
              control={form.control}
              name="needsVideographer"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Videographer Needed</FormLabel>
                    <FormDescription>
                      Video recording of the deposition
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

            {/* Realtime */}
            <FormField
              control={form.control}
              name="needsRealtime"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Realtime Transcription</FormLabel>
                    <FormDescription>
                      Live transcript feed during deposition
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

            {/* Notes */}
            <FormField
              control={form.control}
              name="specialNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special requirements, instructions, or notes for the agency..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </div>
      </form>
    </Form>
  );
}
