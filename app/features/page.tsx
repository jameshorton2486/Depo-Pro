// ═══════════════════════════════════════════════════════════════
// FEATURES PAGE - Role-Based Feature Sections
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';
import { FileText, Users, Shield } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-[var(--color-primary)] mb-6 leading-[1.1] max-w-4xl mx-auto">
            Features Built for Legal Professionals
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto mb-10 leading-relaxed">
            Comprehensive tools designed specifically for court reporters, scopists, and reporting firms.
          </p>
        </div>
      </section>

      {/* For Court Reporters */}
      <section className="py-16 lg:py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)]">
              For Court Reporters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureItem
              title="Job creation and case management"
              description="Streamlined interface for entering case details, managing assignments, and tracking deposition status."
            />
            <FeatureItem
              title="AI transcription with legal vocabulary support"
              description="Legal-optimized speech recognition trained on court reporting terminology and proper nouns."
            />
            <FeatureItem
              title="Proper-noun reference injection"
              description="Feed names, locations, and terms into the transcription engine for improved accuracy."
            />
            <FeatureItem
              title="Reporter notes for guiding transcription"
              description="Capture notes during deposition to guide AI accuracy and assist scopist review."
            />
            <FeatureItem
              title="Certified export formats"
              description="Export transcripts in DOCX, PDF, TXT, and legacy ASCII formats—court-ready."
            />
          </div>
        </div>
      </section>

      {/* For Scopists */}
      <section className="py-16 lg:py-24 bg-[var(--color-bg)]">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-[var(--color-success)]" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)]">
              For Scopists
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureItem
              title="Confidence-based word review"
              description="Focus on low-confidence words flagged by AI, with visual highlighting for efficient correction."
            />
            <FeatureItem
              title="Integrated audio playback with timestamps"
              description="Jump to exact moments in audio recordings with synchronized playback controls."
            />
            <FeatureItem
              title="Reporter notes visible during review"
              description="Access reporter-entered notes and proper nouns to ensure accurate corrections."
            />
            <FeatureItem
              title="Clean, distraction-free editing interface"
              description="Optimized workspace designed for fast, accurate transcript editing."
            />
          </div>
        </div>
      </section>

      {/* For Reporting Firms */}
      <section className="py-16 lg:py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-warning)]/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[var(--color-warning)]" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)]">
              For Reporting Firms
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureItem
              title="Team assignments and role-based permissions"
              description="Assign jobs to reporters and scopists with granular access controls and permissions."
            />
            <FeatureItem
              title="Productivity and turnaround analytics"
              description="Track team performance, job completion times, and identify workflow bottlenecks."
            />
            <FeatureItem
              title="Secure storage and audit logging"
              description="Enterprise-grade data protection with comprehensive audit trails for compliance."
            />
            <FeatureItem
              title="Multi-job oversight with standardized workflows"
              description="Manage multiple depositions simultaneously with consistent, repeatable processes."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-[var(--color-primary)] text-[var(--color-text-inverse)]">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-[var(--color-text-inverse)]/80 mb-8 max-w-2xl mx-auto">
            Join court reporters and scopists who trust Depo-Pro
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-[var(--radius-button)] px-8 py-6 text-base font-medium"
          >
            <Link href="/register">Create Your Account</Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
      <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3">{title}</h3>
      <p className="text-[var(--color-text-secondary)] leading-relaxed text-sm">{description}</p>
    </div>
  );
}
