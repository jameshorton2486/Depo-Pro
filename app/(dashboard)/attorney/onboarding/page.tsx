// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.1: ATTORNEY ONBOARDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/(dashboard)/attorney/onboarding/page.tsx
// Profile setup for new attorney users
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Scale,
  Building2,
  Phone,
  Mail,
  MapPin,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// Validation schema
const onboardingSchema = z.object({
  // Step 1: Bar Information
  barNumber: z.string().min(1, 'Bar number is required'),
  barState: z.string().min(2, 'State is required'),

  // Step 2: Firm Information
  firmName: z.string().optional(),
  firmAddress: z.string().optional(),
  firmPhone: z.string().optional(),

  // Step 3: Practice Areas
  practiceAreas: z.array(z.string()).min(1, 'Select at least one practice area'),

  // Step 4: Preferences
  defaultExportFormat: z.enum(['PDF', 'DOCX', 'TXT']).default('PDF'),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  billingEmail: z.string().email().optional().or(z.literal('')),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const PRACTICE_AREAS = [
  'Personal Injury',
  'Medical Malpractice',
  'Civil Litigation',
  'Commercial Litigation',
  'Employment Law',
  'Family Law',
  'Criminal Defense',
  'Insurance Defense',
  'Products Liability',
  'Intellectual Property',
  'Real Estate',
  'Construction Law',
  'Environmental Law',
  'Securities Litigation',
  'Class Actions',
  'Mass Torts',
  'Workers Compensation',
  'Professional Liability',
  'General Practice',
  'Other',
];

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

const STEPS = [
  { id: 1, title: 'Bar Information', description: 'Your professional credentials' },
  { id: 2, title: 'Firm Details', description: 'Where you practice' },
  { id: 3, title: 'Practice Areas', description: 'Your areas of expertise' },
  { id: 4, title: 'Preferences', description: 'Customize your experience' },
];

export default function AttorneyOnboardingPage() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPracticeAreas, setSelectedPracticeAreas] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: {
      barNumber: '',
      barState: '',
      firmName: '',
      firmAddress: '',
      firmPhone: '',
      practiceAreas: [],
      defaultExportFormat: 'PDF',
      emailNotifications: true,
      smsNotifications: false,
      billingEmail: '',
    },
  });

  const watchedData = watch();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    setValue('practiceAreas', selectedPracticeAreas);
  }, [selectedPracticeAreas, setValue]);

  const validateCurrentStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 1:
        return await trigger(['barNumber', 'barState']);
      case 2:
        return true; // Firm info is optional
      case 3:
        return await trigger(['practiceAreas']);
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const togglePracticeArea = (area: string) => {
    setSelectedPracticeAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const onSubmit: (data: OnboardingData) => Promise<void> = async (data) => {
    try {
      setSubmitting(true);

      const response = await fetch('/api/attorney/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save profile');
      }

      toast.success('Profile created successfully!');
      router.push('/attorney');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Scale className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Complete Your Profile</h1>
        <p className="text-muted-foreground mt-2">
          Set up your attorney profile to access transcripts and case materials
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-2 text-sm ${
                step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step.id < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step.id === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.id < currentStep ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span className="hidden md:inline">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Bar Information */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="barState">State of Bar Admission *</Label>
                  <Select
                    value={watchedData.barState}
                    onValueChange={(value) => setValue('barState', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.barState && (
                    <p className="text-sm text-destructive">{errors.barState.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barNumber">Bar Number *</Label>
                  <Input
                    id="barNumber"
                    placeholder="Enter your bar number"
                    {...register('barNumber')}
                  />
                  {errors.barNumber && (
                    <p className="text-sm text-destructive">{errors.barNumber.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Firm Information */}
            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firmName">Law Firm Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firmName"
                      placeholder="Your firm's name"
                      className="pl-10"
                      {...register('firmName')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firmAddress">Firm Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firmAddress"
                      placeholder="123 Main Street, City, State 12345"
                      className="pl-10"
                      {...register('firmAddress')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firmPhone">Firm Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firmPhone"
                      placeholder="(555) 123-4567"
                      className="pl-10"
                      {...register('firmPhone')}
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Firm information is optional but helps court reporters identify your cases.
                </p>
              </>
            )}

            {/* Step 3: Practice Areas */}
            {currentStep === 3 && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the areas of law you practice. This helps us match you with relevant
                  cases and transcripts.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {PRACTICE_AREAS.map((area) => (
                    <div
                      key={area}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPracticeAreas.includes(area)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => togglePracticeArea(area)}
                    >
                      <Checkbox
                        checked={selectedPracticeAreas.includes(area)}
                        onCheckedChange={() => togglePracticeArea(area)}
                      />
                      <span className="text-sm">{area}</span>
                    </div>
                  ))}
                </div>

                {errors.practiceAreas && (
                  <p className="text-sm text-destructive">{errors.practiceAreas.message}</p>
                )}

                {selectedPracticeAreas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedPracticeAreas.map((area) => (
                      <Badge
                        key={area}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => togglePracticeArea(area)}
                      >
                        {area} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Step 4: Preferences */}
            {currentStep === 4 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="defaultExportFormat">Default Export Format</Label>
                  <Select
                    value={watchedData.defaultExportFormat}
                    onValueChange={(value: 'PDF' | 'DOCX' | 'TXT') =>
                      setValue('defaultExportFormat', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PDF">PDF - Best for sharing</SelectItem>
                      <SelectItem value="DOCX">Word Document - For editing</SelectItem>
                      <SelectItem value="TXT">Plain Text - For processing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-4">
                  <Label>Notifications</Label>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Receive updates about new transcripts
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={watchedData.emailNotifications}
                      onCheckedChange={(checked) =>
                        setValue('emailNotifications', checked as boolean)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Get text alerts for urgent items
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={watchedData.smsNotifications}
                      onCheckedChange={(checked) =>
                        setValue('smsNotifications', checked as boolean)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label htmlFor="billingEmail">Billing Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="billingEmail"
                      type="email"
                      placeholder="billing@yourfirm.com"
                      className="pl-10"
                      {...register('billingEmail')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    If different from your account email
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>

        {/* Skip Option */}
        {currentStep === 2 && (
          <div className="text-center mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="text-muted-foreground"
            >
              Skip this step
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
