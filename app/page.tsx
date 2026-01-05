// =============================================================================
// HOMEPAGE
// app/page.tsx
//
// Depo-Pro Landing Page — Aligned with Content Specifications
// Design System v2.0
// =============================================================================

import Link from 'next/link';
import {
  Shield,
  Target,
  Zap,
  Building2,
  User,
  Users,
  Scale,
  Briefcase,
  ArrowRight,
  CheckCircle,
  Lock,
  FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';

// =============================================================================
// HERO SECTION
// =============================================================================

function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-hero-gradient overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="max-w-3xl">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
            Deposition Transcripts.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-teal-400">
              Done Right.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl">
            Depo-Pro is a secure, AI-assisted deposition and transcript management platform
            built specifically for legal professionals — combining accuracy, auditability,
            and modern workflows.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base font-semibold bg-white text-indigo-900 hover:bg-white/90 shadow-xl shadow-black/20"
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
              className="h-12 px-8 text-base font-semibold bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
            >
              <Link href="/how-it-works">
                See How It Works
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// VALUE PROPOSITION SECTION
// =============================================================================

const VALUE_PROPS = [
  {
    icon: Target,
    title: 'Built for Legal Accuracy',
    description: 'AI highlights risk — humans make final decisions. Every word remains defensible.',
  },
  {
    icon: Shield,
    title: 'Secure by Design',
    description: 'Supabase-first authentication, role-based access, and complete audit trails.',
  },
  {
    icon: Zap,
    title: 'Faster Review Cycles',
    description: 'Low-confidence word navigation dramatically reduces transcript review time.',
  },
] as const;

function ValuePropsSection() {
  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title} className="text-center">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 mb-5">
                <prop.icon className="h-7 w-7" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                {prop.title}
              </h3>

              {/* Description */}
              <p className="text-slate-600 leading-relaxed">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// WHO IT'S FOR SECTION
// =============================================================================

const AUDIENCES = [
  { icon: Building2, label: 'Court Reporting Firms' },
  { icon: User, label: 'Independent Court Reporters' },
  { icon: Users, label: 'Scopists' },
  { icon: Scale, label: 'Attorneys & Legal Teams' },
  { icon: Briefcase, label: 'Agencies managing multi-reporter workflows' },
] as const;

function AudienceSection() {
  return (
    <section className="py-20 lg:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Who It's For
          </h2>
        </div>

        {/* Audience Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.label}
              className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-soft transition-all duration-200"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <audience.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                {audience.label}
              </span>
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
    icon: FileCheck,
    title: 'Transcript Creation',
    description: 'High-quality speech-to-text with word-level confidence metadata preserved.',
  },
  {
    icon: Target,
    title: 'AI-Assisted Review',
    description: 'Low-confidence words are flagged so reviewers focus where it matters most.',
  },
  {
    icon: Users,
    title: 'Role-Aware Access',
    description: 'Reporters, scopists, attorneys, and admins each see tailored workflows.',
  },
  {
    icon: ArrowRight,
    title: 'Export & Delivery',
    description: 'DOCX, PDF, TXT, and JSON — formatted to legal standards.',
  },
] as const;

function FeaturesSection() {
  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            A Complete Deposition Workflow
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From Audio to Final Transcript
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-soft transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom statement */}
        <p className="mt-10 text-center text-slate-600">
          No more fragmented tools. No more version drift.
        </p>
      </div>
    </section>
  );
}

// =============================================================================
// AI PHILOSOPHY SECTION
// =============================================================================

function AIPhilosophySection() {
  return (
    <section className="py-20 lg:py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              AI Assists.{' '}
              <span className="text-teal-400">Humans Decide.</span>
            </h2>

            <p className="mt-6 text-lg text-slate-300 leading-relaxed">
              Depo-Pro uses AI to surface risk, not to replace legal judgment.
              Every correction is human-approved, auditable, and traceable.
            </p>

            {/* AI Capabilities */}
            <div className="mt-8">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                AI Capabilities
              </h4>
              <ul className="space-y-3">
                {[
                  'Word-level confidence scoring',
                  'Context-aware navigation',
                  'Audio-synced playback',
                  'Review session persistence',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="h-5 w-5 text-teal-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* What We Don't Do */}
            <div className="mt-8">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                What We Don't Do
              </h4>
              <ul className="space-y-3">
                {[
                  'No auto-finalization',
                  'No silent edits',
                  'No black-box decision making',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-400">
                    <span className="w-5 h-5 flex items-center justify-center text-slate-500">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Visual */}
          <div className="mt-12 lg:mt-0">
            <div className="relative aspect-square max-w-md mx-auto rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-10 w-10 text-indigo-400" />
                </div>
                <p className="text-xl font-semibold text-white mb-2">Human in the Loop</p>
                <p className="text-sm text-slate-400">Every decision is yours</p>
              </div>

              {/* Floating badges */}
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-medium">
                Auditable
              </div>
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                Versioned
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// SECURITY SECTION
// =============================================================================

function SecuritySection() {
  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          {/* Visual */}
          <div className="order-2 lg:order-1 mt-12 lg:mt-0">
            <div className="relative aspect-square max-w-md mx-auto rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 p-8 flex items-center justify-center">
              <Shield className="h-32 w-32 text-white/10" />

              {/* Security badges */}
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
                256-bit Encryption
              </div>
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-medium">
                RBAC Enforced
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                Complete Audit Trails
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
              <Lock className="h-4 w-4" />
              Enterprise Security
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Enterprise-Grade Security, Built In
            </h2>

            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              All authentication is handled by Supabase. Depo-Pro never stores
              plaintext or hashed passwords.
            </p>

            {/* Security Features */}
            <div className="mt-8 space-y-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Authentication</h4>
                <ul className="space-y-2 text-slate-600">
                  {['Secure password hashing', 'Email verification', 'Password resets', 'SSO readiness'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-teal-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Authorization (RBAC)</h4>
                <p className="text-slate-600 text-sm">
                  Roles: Admin, Reporter, Scopist, Attorney. Access enforced at middleware, API routes, and UI navigation.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Audit Trails</h4>
                <p className="text-slate-600 text-sm">
                  Every action is recorded: who changed what, when it happened, what version was affected.
                </p>
              </div>
            </div>

            <Button asChild className="mt-8 bg-indigo-600 hover:bg-indigo-700">
              <Link href="/security">
                Learn About Security
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// TRUST STATEMENT SECTION
// =============================================================================

function TrustSection() {
  return (
    <section className="py-16 lg:py-20 bg-slate-50 border-y border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xl sm:text-2xl text-slate-700 leading-relaxed font-medium">
          "Depo-Pro is not a generic transcription tool. It is a{' '}
          <span className="text-indigo-600">purpose-built legal platform</span>{' '}
          designed for environments where accuracy, security, and accountability matter."
        </p>
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
          Ready to Transform Your Workflow?
        </h2>
        <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
          Join legal professionals who demand accuracy, security, and modern workflows.
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
            <Link href="/contact">
              Contact Us
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

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <HeroSection />
        <ValuePropsSection />
        <AudienceSection />
        <FeaturesSection />
        <AIPhilosophySection />
        <SecuritySection />
        <TrustSection />
        <CTASection />
      </main>
      <PublicFooter />
    </div>
  );
}
