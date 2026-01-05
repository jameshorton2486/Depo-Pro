// =============================================================================
// PRODUCT PAGE
// app/product/page.tsx
//
// Core Features & Capabilities
// =============================================================================

import Link from 'next/link';
import {
  FileText,
  Target,
  Users,
  Download,
  Upload,
  Mic,
  CheckCircle,
  ArrowRight,
  GitBranch
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
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            A Complete Deposition Workflow
          </h1>
          <p className="mt-4 text-xl text-teal-300 font-medium">
            From Audio to Final Transcript
          </p>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
            Depo-Pro centralizes every stage of the deposition lifecycle —
            no more fragmented tools, no more version drift.
          </p>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// WORKFLOW SECTION
// =============================================================================

const WORKFLOW_STEPS = [
  { icon: Upload, label: 'Secure audio ingestion' },
  { icon: Mic, label: 'AI-assisted transcription' },
  { icon: Target, label: 'Human-controlled review' },
  { icon: GitBranch, label: 'Versioned corrections' },
  { icon: Download, label: 'Court-ready export formats' },
] as const;

function WorkflowSection() {
  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-4 lg:gap-8">
          {WORKFLOW_STEPS.map((step, index) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                <step.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">{step.label}</span>
              {index < WORKFLOW_STEPS.length - 1 && (
                <ArrowRight className="h-4 w-4 text-slate-300 hidden lg:block ml-4" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// CORE FEATURES SECTION
// =============================================================================

const FEATURES = [
  {
    icon: FileText,
    title: 'Transcript Creation',
    description: 'High-quality speech-to-text with word-level confidence metadata preserved.',
    details: [
      'Deepgram Nova-3 integration',
      'Speaker diarization',
      'Timestamp synchronization',
      'Legal vocabulary optimization',
    ],
  },
  {
    icon: Target,
    title: 'AI-Assisted Review',
    description: 'Low-confidence words are flagged so reviewers focus where it matters most.',
    details: [
      'Word-level confidence scoring',
      'Audio-synced playback',
      'Keyboard navigation',
      'Context preservation',
    ],
  },
  {
    icon: Users,
    title: 'Role-Aware Access',
    description: 'Reporters, scopists, attorneys, and admins each see tailored workflows.',
    details: [
      'Role-based dashboards',
      'Permission-gated actions',
      'Tenant isolation',
      'Assignment management',
    ],
  },
  {
    icon: Download,
    title: 'Export & Delivery',
    description: 'DOCX, PDF, TXT, and JSON — formatted to legal standards.',
    details: [
      '25 lines per page',
      'Line numbering',
      'Q/A formatting',
      'Certification pages',
    ],
  },
] as const;

function FeaturesSection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Core Features
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Everything you need to manage depositions professionally.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl border border-slate-200 p-8 hover:border-slate-300 hover:shadow-soft-lg transition-all duration-200"
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 mb-5">
                <feature.icon className="h-6 w-6" />
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 mb-5">
                {feature.description}
              </p>

              {/* Details List */}
              <ul className="space-y-2">
                {feature.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-teal-600 shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// DIFFERENTIATOR SECTION
// =============================================================================

function DifferentiatorSection() {
  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              The Low-Confidence Word Advantage
            </h2>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              Our core differentiator: instead of reviewing entire transcripts word-by-word,
              scopists focus only on words the AI flagged as uncertain.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Click a flagged word → audio jumps to that moment',
                'Edit inline with full context visible',
                'Mark as reviewed and move to next',
                'Session state persists across browser refreshes',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                  <span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 p-6 rounded-xl bg-indigo-50 border border-indigo-100">
              <p className="text-indigo-900 font-medium">
                Result: 60%+ faster review cycles compared to traditional full-transcript review.
              </p>
            </div>
          </div>

          {/* Visual */}
          <div className="mt-12 lg:mt-0">
            <div className="relative aspect-[4/3] rounded-2xl bg-slate-900 p-6 overflow-hidden">
              {/* Mock UI */}
              <div className="absolute inset-0 p-6">
                {/* Header bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="text-xs text-slate-500 font-mono">review-session.tsx</div>
                </div>

                {/* Mock transcript with highlighted word */}
                <div className="space-y-3 font-mono text-sm">
                  <p className="text-slate-400">Q: Can you state your name for the record?</p>
                  <p className="text-slate-300">
                    A: My name is John{' '}
                    <span className="bg-amber-500/30 text-amber-300 px-1 rounded border-b-2 border-amber-400">
                      Smithson
                    </span>
                    .
                  </p>
                  <p className="text-slate-400">Q: And where do you reside?</p>
                  <p className="text-slate-300">
                    A: I live at 1234{' '}
                    <span className="bg-amber-500/30 text-amber-300 px-1 rounded border-b-2 border-amber-400">
                      Maple
                    </span>
                    {' '}Street.
                  </p>
                </div>

                {/* Audio player mock */}
                <div className="absolute bottom-6 left-6 right-6 h-12 rounded-lg bg-slate-800 flex items-center px-4 gap-4">
                  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                    <span className="text-white text-xs">▶</span>
                  </div>
                  <div className="flex-1 h-1 bg-slate-700 rounded-full">
                    <div className="w-1/3 h-full bg-teal-400 rounded-full" />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">02:34 / 45:12</span>
                </div>
              </div>
            </div>
          </div>
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
          Ready to Streamline Your Workflow?
        </h2>
        <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
          See how Depo-Pro can transform your deposition management.
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
            <Link href="/how-it-works">
              See How It Works
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

export default function ProductPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <HeroSection />
        <WorkflowSection />
        <FeaturesSection />
        <DifferentiatorSection />
        <CTASection />
      </main>
      <PublicFooter />
    </div>
  );
}
