// =============================================================================
// AI & ACCURACY PAGE
// app/ai/page.tsx
//
// AI Philosophy & Capabilities
// =============================================================================

import Link from 'next/link';
import {
  Target,
  XCircle,
  ArrowRight,
  Gauge,
  Navigation,
  Volume2,
  Save,
  Brain,
  Eye,
  Shield
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
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            AI Assists.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-teal-400">
              Humans Decide.
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
            Depo-Pro uses AI to surface risk, not to replace legal judgment.
            Every correction is human-approved, auditable, and traceable.
          </p>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// PHILOSOPHY SECTION
// =============================================================================

function PhilosophySection() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16">
          {/* Left Column - Philosophy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
              <Brain className="h-4 w-4" />
              Our Philosophy
            </div>

            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Human-in-the-Loop by Design
            </h2>

            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              In legal transcription, accuracy isn't optional — it's mandatory.
              That's why Depo-Pro treats AI as an assistant, not a decision-maker.
            </p>

            <p className="mt-4 text-slate-600 leading-relaxed">
              Our AI identifies potential issues and surfaces them to trained professionals.
              Every word that makes it into the final transcript has been reviewed,
              approved, or corrected by a human.
            </p>

            <div className="mt-8 p-6 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-slate-700 font-medium">
                "AI highlights risk — humans make final decisions. Every word remains defensible."
              </p>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="mt-12 lg:mt-0">
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Center Circle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-indigo-100 to-teal-100 flex items-center justify-center">
                  <div className="text-center">
                    <Target className="h-12 w-12 text-indigo-600 mx-auto mb-2" />
                    <p className="text-lg font-semibold text-slate-900">Human</p>
                    <p className="text-sm text-slate-600">Decision</p>
                  </div>
                </div>
              </div>

              {/* Orbiting Elements */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white shadow-soft border border-slate-200">
                <span className="text-sm font-medium text-slate-700">AI Flags Risk</span>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white shadow-soft border border-slate-200">
                <span className="text-sm font-medium text-slate-700">Human Reviews</span>
              </div>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 px-4 py-2 rounded-full bg-white shadow-soft border border-slate-200">
                <span className="text-sm font-medium text-slate-700">Context Shown</span>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 rounded-full bg-white shadow-soft border border-slate-200">
                <span className="text-sm font-medium text-slate-700">Audit Logged</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// CAPABILITIES SECTION
// =============================================================================

const CAPABILITIES = [
  {
    icon: Gauge,
    title: 'Word-Level Confidence Scoring',
    description: 'Every word in the transcript carries a confidence score from the AI, allowing reviewers to focus on uncertain segments.',
  },
  {
    icon: Navigation,
    title: 'Context-Aware Navigation',
    description: 'Jump between flagged words while maintaining full context — surrounding text is always visible.',
  },
  {
    icon: Volume2,
    title: 'Audio-Synced Playback',
    description: 'Click any word and hear exactly what was said. Audio and transcript stay perfectly synchronized.',
  },
  {
    icon: Save,
    title: 'Review Session Persistence',
    description: 'Your review progress is saved automatically. Pick up where you left off, even across browser sessions.',
  },
] as const;

function CapabilitiesSection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            AI Capabilities
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Smart features that make review faster without compromising control.
          </p>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CAPABILITIES.map((capability) => (
            <div
              key={capability.title}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-soft transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                  <capability.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {capability.title}
                  </h3>
                  <p className="text-slate-600">
                    {capability.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// WHAT WE DON'T DO SECTION
// =============================================================================

const DONT_DO = [
  {
    title: 'No Auto-Finalization',
    description: 'Transcripts are never automatically marked as complete. A human must explicitly approve the final version.',
  },
  {
    title: 'No Silent Edits',
    description: 'Every change is logged. You can see who changed what and when, with full version history.',
  },
  {
    title: 'No Black-Box Decision Making',
    description: 'AI confidence scores are transparent. You can see why words were flagged and decide accordingly.',
  },
] as const;

function DontDoSection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-300 text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Our Commitments
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              What We Don't Do
            </h2>

            <p className="mt-6 text-lg text-slate-300 leading-relaxed">
              Legal work demands accountability. We've intentionally excluded features
              that could compromise the integrity of your transcripts.
            </p>

            {/* Don't Do List */}
            <div className="mt-8 space-y-6">
              {DONT_DO.map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="mt-12 lg:mt-0">
            <div className="relative aspect-square max-w-md mx-auto rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 flex items-center justify-center">
              <div className="text-center">
                <Eye className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-xl font-semibold text-white mb-2">Full Transparency</p>
                <p className="text-sm text-slate-400 max-w-xs">
                  Every AI decision is visible, explainable, and overridable by humans.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// ACCURACY METRICS SECTION
// =============================================================================

function MetricsSection() {
  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {[
            { value: '95%+', label: 'AI Baseline Accuracy', sublabel: 'Before human review' },
            { value: '99.5%+', label: 'Final Accuracy', sublabel: 'After scopist review' },
            { value: '60%', label: 'Faster Reviews', sublabel: 'Vs. full-transcript review' },
            { value: '100%', label: 'Human Approved', sublabel: 'Every final word' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-indigo-600 tracking-tight">
                {stat.value}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {stat.label}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {stat.sublabel}
              </div>
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
          See AI-Assisted Review in Action
        </h2>
        <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
          Experience how Depo-Pro balances speed with accuracy.
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
            <Link href="/security">
              View Security
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

export default function AIPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <HeroSection />
        <PhilosophySection />
        <CapabilitiesSection />
        <DontDoSection />
        <MetricsSection />
        <CTASection />
      </main>
      <PublicFooter />
    </div>
  );
}
