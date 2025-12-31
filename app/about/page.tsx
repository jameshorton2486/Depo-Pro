// ═══════════════════════════════════════════════════════════════
// ABOUT PAGE - Authority Positioning
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';
import { Target, Users, Lightbulb } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-[var(--color-primary)] mb-6 leading-[1.1] max-w-4xl mx-auto">
            About Depo-Pro
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed">
            Depo-Pro was created to modernize deposition transcription without compromising accuracy, compliance, or professional standards.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 lg:py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          <div className="bg-[var(--color-surface)] p-8 lg:p-12 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] mb-6">Our Mission</h2>
            <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed mb-6">
              To help court reporters and scopists work faster, collaborate better, and deliver transcripts with confidence.
            </p>
            <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
              We understand that accuracy, security, and compliance are non-negotiable in legal proceedings. That&apos;s why we&apos;ve built Depo-Pro with these principles at its core, combining AI-powered efficiency with human expertise.
            </p>
          </div>
        </div>
      </section>

      {/* Built by Legal Professionals */}
      <section className="py-16 lg:py-24 bg-[var(--color-bg)]">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] mb-6">
            Built by Legal Professionals, for Legal Professionals
          </h2>
          <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed mb-8">
            Our team includes former court reporters, legal technologists, and software engineers who understand the realities of legal proceedings. We&apos;re not just building software—we&apos;re solving real problems for real professionals.
          </p>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mt-12">
            <TeamCard
              title="Former Court Reporters"
              description="Team members who understand the daily challenges of deposition transcription."
            />
            <TeamCard
              title="Legal Technologists"
              description="Experts in legal workflows and compliance requirements."
            />
            <TeamCard
              title="Software Engineers"
              description="Building modern, secure, and user-friendly solutions."
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 lg:px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] text-center mb-12 lg:mb-16">
            Our Values
          </h2>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
            <ValueCard
              icon={Target}
              title="Accuracy"
              description="Transcripts you can trust—meeting the rigorous standards of the legal profession."
            />
            <ValueCard
              icon={Users}
              title="Security"
              description="Protection at every level—enterprise-grade encryption and compliance measures."
            />
            <ValueCard
              icon={Lightbulb}
              title="Innovation"
              description="Purpose-built legal technology designed around real deposition workflows."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-[var(--color-primary)] text-[var(--color-text-inverse)]">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Join Us</h2>
          <p className="text-lg text-[var(--color-text-inverse)]/80 mb-8 max-w-2xl mx-auto">
            Experience the future of deposition transcription
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-[var(--radius-button)] px-8 py-6 text-base font-medium"
            >
              <Link href="/register">Get Started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[var(--color-text-inverse)]/30 text-[var(--color-text-inverse)] hover:bg-[var(--color-text-inverse)]/10 rounded-[var(--radius-button)] px-8 py-6 text-base font-medium"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function ValueCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] p-6 lg:p-8 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)] text-center">
      <div className="w-12 h-12 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-[var(--color-accent)]" />
      </div>
      <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-3">{title}</h3>
      <p className="text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}

function TeamCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
      <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3">{title}</h3>
      <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{description}</p>
    </div>
  );
}
