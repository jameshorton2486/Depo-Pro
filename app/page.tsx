// ═══════════════════════════════════════════════════════════════
// HOME PAGE - Professional Deposition Transcription
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FileText, Upload, Zap, Users, FileCheck } from 'lucide-react';

export default async function Home() {
  // Redirect to dashboard if already logged in
  const session = await getCurrentUser();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg)]">
      <PublicHeader />

      {/* Hero Section - Enhanced with gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative container mx-auto px-4 lg:px-6 pt-32 pb-20 lg:pt-40 lg:pb-28 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold mb-6 leading-[1.1] max-w-4xl mx-auto tracking-tight">
            Professional Deposition Transcription—Built for Court Reporters
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-10 leading-relaxed">
            Depo-Pro streamlines deposition management with AI-powered transcription, scopist collaboration, and enterprise-grade security—designed specifically for the legal reporting workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-indigo-900 hover:bg-white/90 rounded-lg px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Link href="/register">Start Free Trial</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 rounded-lg px-8 py-6 text-base font-medium"
            >
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              A complete deposition workflow—from job creation to certified transcript.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8 max-w-6xl mx-auto">
            <WorkflowStep
              icon={FileText}
              number="1"
              title="Create the Job"
              description="Enter case details, upload notices, assign reporters and scopists."
            />
            <WorkflowStep
              icon={Upload}
              number="2"
              title="Record or Upload Audio"
              description="Support for Zoom or in-person depositions with multi-channel audio."
            />
            <WorkflowStep
              icon={Zap}
              number="3"
              title="AI-Powered Transcription"
              description="Legal-optimized speech recognition with confidence scoring."
            />
            <WorkflowStep
              icon={Users}
              number="4"
              title="Scopist Review & Corrections"
              description="Review flagged words, apply reporter notes, ensure accuracy."
            />
            <WorkflowStep
              icon={FileCheck}
              number="5"
              title="Finalize & Export"
              description="Deliver certified transcripts in court-ready formats."
            />
          </div>
        </div>
      </section>

      {/* Built for Legal Professionals Section */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Built for Legal Professionals
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
            <RoleCard
              title="Court Reporters"
              description="Create jobs, manage audio, guide AI accuracy, and finalize transcripts with confidence."
            />
            <RoleCard
              title="Scopists"
              description="Review flagged words, apply corrections, and collaborate efficiently."
            />
            <RoleCard
              title="Reporting Firms"
              description="Manage teams, track productivity, and maintain compliance across all jobs."
            />
          </div>
        </div>
      </section>

      {/* Security Trust Strip */}
      <section className="py-12 bg-white border-y border-slate-200">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">SOC 2</span>
              <span>Type II Audited</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">HIPAA</span>
              <span>Ready Architecture</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">AES-256</span>
              <span>Encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to modernize your deposition workflow?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Start your free trial today—no credit card required.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-indigo-900 hover:bg-white/90 rounded-lg px-8 py-6 text-base font-semibold shadow-lg"
          >
            <Link href="/register">Start Free Trial</Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function WorkflowStep({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
        <Icon className="w-8 h-8 text-indigo-700" />
      </div>
      <div className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wider">
        Step {number}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function RoleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white p-6 lg:p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
      <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
