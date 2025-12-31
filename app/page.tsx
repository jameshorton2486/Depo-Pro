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
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-[var(--color-primary)] mb-6 leading-[1.1] max-w-4xl mx-auto">
            Professional Deposition Transcription—Built for Court Reporters
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto mb-10 leading-relaxed">
            Depo-Pro streamlines deposition management with AI-powered transcription, scopist collaboration, and enterprise-grade security—designed specifically for the legal reporting workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-[var(--radius-button)] px-8 py-6 text-base font-medium"
            >
              <Link href="/register">Start Free Trial</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] rounded-[var(--radius-button)] px-8 py-6 text-base font-medium"
            >
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] mb-4">
              How It Works
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
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
      <section className="py-16 lg:py-24 bg-[var(--color-bg)]">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] mb-4">
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
      <section className="py-12 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-primary)]">SOC 2</span>
              <span>Type II Audited</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-primary)]">HIPAA</span>
              <span>Ready Architecture</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-primary)]">AES-256</span>
              <span>Encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 lg:py-24 bg-[var(--color-primary)] text-[var(--color-text-inverse)]">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to modernize your deposition workflow?
          </h2>
          <p className="text-lg text-[var(--color-text-inverse)]/80 mb-8 max-w-2xl mx-auto">
            Start your free trial today—no credit card required.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-[var(--radius-button)] px-8 py-6 text-base font-medium"
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
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--color-accent)]" />
      </div>
      <div className="text-sm font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-[var(--tracking-label)]">
        Step {number}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}

function RoleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[var(--color-surface)] p-6 lg:p-8 rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] border border-[var(--color-border)]">
      <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-3">{title}</h3>
      <p className="text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}
