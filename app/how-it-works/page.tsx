// =============================================================================
// HOW IT WORKS PAGE
// app/how-it-works/page.tsx
//
// Step-Based Workflow Timeline
// =============================================================================

import Link from 'next/link';
import { 
  Shield, 
  Mic,
  Target,
  Lock,
  Download,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';

// =============================================================================
// HERO SECTION
// =============================================================================

function HeroSection() {
  return (
    <section className="relative bg-hero-gradient pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            How Depo-Pro Works
          </h1>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
            From secure authentication to court-ready export — a complete, 
            auditable workflow designed for legal professionals.
          </p>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// STEPS SECTION
// =============================================================================

const STEPS = [
  {
    number: '01',
    icon: Shield,
    title: 'Secure Authentication',
    description: 'Users authenticate via Supabase Auth. Passwords are never stored in the application database.',
    details: [
      'Email + password authentication',
      'Secure password hashing by Supabase',
      'Role assignment on registration',
      'SSO readiness for enterprise',
    ],
    color: 'indigo',
  },
  {
    number: '02',
    icon: Mic,
    title: 'Transcript Generation',
    description: 'Audio is processed into a draft transcript with confidence scoring.',
    details: [
      'Upload audio files securely',
      'Deepgram Nova-3 transcription',
      'Speaker diarization',
      'Word-level timestamps & confidence',
    ],
    color: 'blue',
  },
  {
    number: '03',
    icon: Target,
    title: 'Review Session',
    description: 'Reviewers navigate flagged low-confidence words, correcting errors efficiently.',
    details: [
      'Low-confidence words highlighted',
      'Click to jump audio playback',
      'Inline editing with context',
      'Session state persistence',
    ],
    color: 'amber',
  },
  {
    number: '04',
    icon: Lock,
    title: 'Finalization',
    description: 'Transcripts are finalized, locked, and versioned for legal defensibility.',
    details: [
      'Final review approval',
      'Version locking',
      'Audit trail completion',
      'Certification ready',
    ],
    color: 'teal',
  },
  {
    number: '05',
    icon: Download,
    title: 'Export & Delivery',
    description: 'Court-ready files are generated and delivered securely.',
    details: [
      'DOCX with legal formatting',
      'PDF with certification',
      'TXT for archives',
      'JSON for integrations',
    ],
    color: 'purple',
  },
] as const;

const STEP_COLORS = {
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    line: 'bg-indigo-200',
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    border: 'border-blue-200',
    line: 'bg-blue-200',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    border: 'border-amber-200',
    line: 'bg-amber-200',
  },
  teal: {
    bg: 'bg-teal-100',
    text: 'text-teal-600',
    border: 'border-teal-200',
    line: 'bg-teal-200',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    border: 'border-purple-200',
    line: 'bg-purple-200',
  },
} as const;

function StepsSection() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Steps Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 hidden md:block" />

          {/* Steps */}
          <div className="space-y-12 md:space-y-16">
            {STEPS.map((step, index) => {
              const colors = STEP_COLORS[step.color];
              return (
                <div key={step.number} className="relative">
                  {/* Step Content */}
                  <div className="md:pl-20">
                    {/* Number Badge (positioned on timeline for desktop) */}
                    <div className={`
                      absolute left-0 top-0 
                      w-12 h-12 rounded-full 
                      ${colors.bg} ${colors.text}
                      flex items-center justify-center 
                      font-bold text-lg
                      border-4 border-white shadow-sm
                      hidden md:flex
                    `}>
                      {step.number}
                    </div>

                    {/* Card */}
                    <div className={`
                      rounded-2xl border ${colors.border} bg-white p-6 md:p-8
                      hover:shadow-soft-lg transition-all duration-200
                    `}>
                      {/* Mobile Number Badge */}
                      <div className={`
                        w-10 h-10 rounded-full ${colors.bg} ${colors.text}
                        flex items-center justify-center font-bold text-sm
                        mb-4 md:hidden
                      `}>
                        {step.number}
                      </div>

                      {/* Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`
                          shrink-0 w-12 h-12 rounded-xl ${colors.bg}
                          flex items-center justify-center ${colors.text}
                          hidden md:flex
                        `}>
                          <step.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900">
                            {step.title}
                          </h3>
                          <p className="mt-1 text-slate-600">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex items-center gap-2 text-sm text-slate-600">
                            <CheckCircle className={`h-4 w-4 ${colors.text} shrink-0`} />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Connector (not on last item) */}
                  {index < STEPS.length - 1 && (
                    <div className={`
                      absolute left-6 top-12 w-0.5 h-12 md:h-16 ${colors.line}
                      hidden md:block
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// BADGES SECTION
// =============================================================================

function BadgesSection() {
  return (
    <section className="py-16 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-6">
          {[
            { label: 'Human-in-the-Loop', color: 'indigo' },
            { label: 'Versioned', color: 'teal' },
            { label: 'Auditable', color: 'amber' },
            { label: 'Court-Ready', color: 'purple' },
          ].map((badge) => (
            <div 
              key={badge.label}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                ${badge.color === 'indigo' ? 'bg-indigo-100 text-indigo-700' : ''}
                ${badge.color === 'teal' ? 'bg-teal-100 text-teal-700' : ''}
                ${badge.color === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
                ${badge.color === 'purple' ? 'bg-purple-100 text-purple-700' : ''}
              `}
            >
              {badge.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// CTA SECTION
// =============================================================================

function CTASection() {
  return (
    <section className="py-20 lg:py-24 bg-hero-gradient">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Ready to See It in Action?
        </h2>
        <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
          Request access to experience the complete Depo-Pro workflow.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            asChild 
            size="lg"
            className="h-12 px-8 text-base font-semibold bg-white text-indigo-900 hover:bg-white/90"
          >
            <Link href="/register">
              Request Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="lg"
            className="h-12 px-8 text-base font-semibold bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <Link href="/product">
              Explore Features
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <HeroSection />
        <StepsSection />
        <BadgesSection />
        <CTASection />
      </main>
      <PublicFooter />
    </div>
  );
}
