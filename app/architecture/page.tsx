// =============================================================================
// ARCHITECTURE PAGE
// app/architecture/page.tsx
//
// Technical Stack & System Architecture
// =============================================================================

import Link from 'next/link';
import {
  Server,
  Database,
  Lock,
  Globe,
  Layers,
  ArrowRight,
  CheckCircle,
  Code,
  Shield,
  Zap
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
            <Code className="h-4 w-4" />
            Technical Overview
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            Built for Scale & Security
          </h1>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
            Depo-Pro is architected with modern, battle-tested technologies
            designed for compliance-heavy legal environments.
          </p>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// TECH STACK SECTION
// =============================================================================

const STACK_LAYERS = [
  {
    layer: 'Frontend',
    technology: 'Next.js (App Router)',
    icon: Globe,
    color: 'indigo',
    description: 'React-based UI with server-side rendering and edge optimization',
  },
  {
    layer: 'Backend',
    technology: 'Next.js API Routes',
    icon: Server,
    color: 'blue',
    description: 'Serverless API endpoints with TypeScript type safety',
  },
  {
    layer: 'Database',
    technology: 'PostgreSQL (Supabase)',
    icon: Database,
    color: 'teal',
    description: 'Managed PostgreSQL with row-level security and real-time subscriptions',
  },
  {
    layer: 'ORM',
    technology: 'Prisma',
    icon: Layers,
    color: 'purple',
    description: 'Type-safe database access with migrations and schema management',
  },
  {
    layer: 'Auth',
    technology: 'Supabase Auth',
    icon: Lock,
    color: 'amber',
    description: 'Enterprise-grade authentication with SSO readiness',
  },
  {
    layer: 'Hosting',
    technology: 'Vercel',
    icon: Zap,
    color: 'slate',
    description: 'Edge network deployment with automatic scaling',
  },
] as const;

const LAYER_COLORS = {
  indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200',
  blue: 'bg-blue-100 text-blue-600 border-blue-200',
  teal: 'bg-teal-100 text-teal-600 border-teal-200',
  purple: 'bg-purple-100 text-purple-600 border-purple-200',
  amber: 'bg-amber-100 text-amber-600 border-amber-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
} as const;

function TechStackSection() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            High-Level Stack
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Modern technologies chosen for reliability, security, and developer experience.
          </p>
        </div>

        {/* Stack Table */}
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Layer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Technology</th>
                </tr>
              </thead>
              <tbody>
                {STACK_LAYERS.map((item, _index) => (
                  <tr
                    key={item.layer}
                    className={_index < STACK_LAYERS.length - 1 ? 'border-b border-slate-100' : ''}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${LAYER_COLORS[item.color]}`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-900">{item.layer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{item.technology}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// ARCHITECTURE DIAGRAM SECTION
// =============================================================================

function ArchitectureDiagramSection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            System Architecture
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Secure, stateless, and scalable by design.
          </p>
        </div>

        {/* Diagram */}
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl bg-slate-800 border border-slate-700 p-8 md:p-12">
            {/* Diagram Layout */}
            <div className="space-y-8">
              {/* User Browser */}
              <div className="flex justify-center">
                <div className="px-6 py-4 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-center">
                  <Globe className="h-8 w-8 text-indigo-300 mx-auto mb-2" />
                  <p className="font-medium text-white">User Browser</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-0.5 h-8 bg-slate-600" />
              </div>

              {/* Next.js App Router */}
              <div className="flex justify-center">
                <div className="px-8 py-5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-center">
                  <Layers className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                  <p className="font-medium text-white">Next.js App Router</p>
                  <p className="text-xs text-blue-200 mt-1">Server Components + Client Hydration</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-0.5 h-8 bg-slate-600" />
              </div>

              {/* API Routes - with branch to Supabase Auth */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div /> {/* Spacer */}

                <div className="px-8 py-5 rounded-xl bg-teal-500/20 border border-teal-400/30 text-center">
                  <Server className="h-8 w-8 text-teal-300 mx-auto mb-2" />
                  <p className="font-medium text-white">API Routes</p>
                  <p className="text-xs text-teal-200 mt-1">RBAC enforced at API + UI</p>
                </div>

                <div className="flex items-center justify-center md:justify-start">
                  <div className="hidden md:block w-8 h-0.5 bg-slate-600" />
                  <div className="px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-center">
                    <Lock className="h-6 w-6 text-amber-300 mx-auto mb-1" />
                    <p className="text-sm font-medium text-white">Supabase Auth</p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-0.5 h-8 bg-slate-600" />
              </div>

              {/* Prisma ORM */}
              <div className="flex justify-center">
                <div className="px-8 py-5 rounded-xl bg-purple-500/20 border border-purple-400/30 text-center">
                  <Code className="h-8 w-8 text-purple-300 mx-auto mb-2" />
                  <p className="font-medium text-white">Prisma ORM</p>
                  <p className="text-xs text-purple-200 mt-1">Type-safe queries + Migrations</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-0.5 h-8 bg-slate-600" />
              </div>

              {/* PostgreSQL */}
              <div className="flex justify-center">
                <div className="px-8 py-5 rounded-xl bg-teal-500/20 border border-teal-400/30 text-center">
                  <Database className="h-8 w-8 text-teal-300 mx-auto mb-2" />
                  <p className="font-medium text-white">PostgreSQL (Supabase)</p>
                  <p className="text-xs text-teal-200 mt-1">Managed database with RLS</p>
                </div>
              </div>

              {/* Annotations */}
              <div className="mt-8 pt-8 border-t border-slate-700">
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700 text-slate-300 text-xs">
                    <Shield className="h-3 w-3" />
                    Passwords never touch app DB
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700 text-slate-300 text-xs">
                    <Lock className="h-3 w-3" />
                    RBAC enforced at API + UI
                  </div>
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
// WHY THIS WORKS SECTION
// =============================================================================

const BENEFITS = [
  {
    icon: Zap,
    title: 'Stateless and Scalable',
    description: 'Serverless functions scale automatically. No servers to manage or capacity to plan.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description: 'Authentication delegated to specialists. Row-level security at the database level.',
  },
  {
    icon: Code,
    title: 'Easy to Extend',
    description: 'Type-safe from database to UI. New features integrate cleanly with existing patterns.',
  },
  {
    icon: CheckCircle,
    title: 'Built for Compliance',
    description: 'Audit logging, access controls, and data isolation designed for legal requirements.',
  },
] as const;

function WhyItWorksSection() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Why This Architecture Works
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Designed for legal-grade reliability and security.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-soft transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <benefit.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-600">
                    {benefit.description}
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
// TRANSCRIPT LIFECYCLE SECTION
// =============================================================================

function TranscriptLifecycleSection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Transcript Lifecycle
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Every stage is tracked, versioned, and auditable.
          </p>
        </div>

        {/* Lifecycle Flow */}
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-indigo-200" />

            {/* Steps */}
            <div className="space-y-6">
              {[
                { step: 'Audio Upload', badge: null },
                { step: 'AI Transcription', badge: null },
                { step: 'Draft Transcript', badge: null },
                { step: 'Low-Confidence Detection', badge: null },
                { step: 'Review Session', badge: 'Human-in-the-Loop' },
                { step: 'Corrections Applied', badge: 'Versioned' },
                { step: 'Finalized Transcript', badge: 'Auditable' },
                { step: 'Export (DOCX / PDF)', badge: null },
              ].map((item, _index) => (
                <div key={item.step} className="relative flex items-center gap-4 pl-14">
                  {/* Node */}
                  <div className="absolute left-4 w-5 h-5 rounded-full bg-indigo-600 border-4 border-white shadow-sm" />

                  {/* Content */}
                  <div className="flex-1 flex items-center justify-between p-4 rounded-lg bg-white border border-slate-200">
                    <span className="font-medium text-slate-900">{item.step}</span>
                    {item.badge && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
          Technical Questions?
        </h2>
        <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
          Our team is happy to discuss architecture, integrations, or custom requirements.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 text-base font-semibold bg-white text-indigo-900 hover:bg-white/90"
          >
            <Link href="/contact">
              Contact Engineering
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

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <HeroSection />
        <TechStackSection />
        <ArchitectureDiagramSection />
        <WhyItWorksSection />
        <TranscriptLifecycleSection />
        <CTASection />
      </main>
      <PublicFooter />
    </div>
  );
}
