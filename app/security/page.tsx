// ═══════════════════════════════════════════════════════════════
// SECURITY PAGE - Trust & Compliance
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';
import { Shield, Lock, Eye, FileCheck, Server, CheckCircle } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <div className="w-20 h-20 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-[var(--color-primary)] mb-6 leading-[1.1] max-w-4xl mx-auto">
            Security & Compliance You Can Trust
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed">
            Your data security is our highest priority. Depo-Pro is built to meet the strict requirements of legal professionals handling sensitive information.
          </p>
        </div>
      </section>

      {/* Security Measures */}
      <section className="py-16 lg:py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 lg:px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] text-center mb-12 lg:mb-16">
            Security Measures
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            <SecurityFeature
              icon={Lock}
              title="End-to-End Encryption"
              description="All data is encrypted in transit and at rest using AES-256 encryption."
            />
            <SecurityFeature
              icon={Eye}
              title="Role-Based Access Controls"
              description="Users only see what their role permits—nothing more."
            />
            <SecurityFeature
              icon={FileCheck}
              title="Audit Logging"
              description="Every action is logged to ensure accountability and compliance."
            />
            <SecurityFeature
              icon={Server}
              title="Secure Infrastructure"
              description="Hosted on enterprise-grade cloud infrastructure with continuous monitoring."
            />
            <SecurityFeature
              icon={CheckCircle}
              title="HIPAA-Ready Architecture"
              description="Designed to safely handle protected health information when required."
            />
          </div>
        </div>
      </section>

      {/* Compliance & Certifications */}
      <section className="py-16 lg:py-24 bg-[var(--color-bg)]">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] text-center mb-12 lg:mb-16">
            Compliance & Certifications
          </h2>
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-8 lg:p-12 space-y-8 shadow-[var(--shadow-soft)] border border-[var(--color-border)]">
            <div>
              <h3 className="text-xl lg:text-2xl font-semibold text-[var(--color-primary)] mb-3">
                SOC 2 Type II
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                SOC 2 Type II audited infrastructure designed for legal data handling.
              </p>
            </div>
            <div>
              <h3 className="text-xl lg:text-2xl font-semibold text-[var(--color-primary)] mb-3">
                HIPAA-Ready Safeguards
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                Administrative, physical, and technical safeguards implemented to protect protected health information.
              </p>
            </div>
            <div>
              <h3 className="text-xl lg:text-2xl font-semibold text-[var(--color-primary)] mb-3">
                GDPR-Aligned Data Protections
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                Compliance with GDPR requirements for data protection and privacy, with full user control over data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Protection */}
      <section className="py-16 lg:py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] text-center mb-12 lg:mb-16">
            Data Protection
          </h2>
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] p-6 lg:p-8 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
              <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-3">Daily Backups with Point-in-Time Recovery</h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                All data is backed up daily with point-in-time recovery capabilities. Your transcripts are protected against data loss.
              </p>
            </div>
            <div className="bg-[var(--color-surface)] p-6 lg:p-8 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
              <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-3">Configurable Data Retention Policies</h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                Set retention policies that meet your compliance requirements. Delete data on demand or configure automatic retention periods.
              </p>
            </div>
            <div className="bg-[var(--color-surface)] p-6 lg:p-8 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
              <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-3">24/7 Incident Monitoring and Response</h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                Our security team monitors for threats around the clock and maintains detailed incident response procedures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Protects */}
      <section className="py-16 lg:py-24 bg-[var(--color-bg)]">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] text-center mb-12 lg:mb-16">
            Who This Protects
          </h2>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <ProtectionCard
              title="Court Reporters"
              description="Your deposition transcripts and case files are encrypted and access-controlled."
            />
            <ProtectionCard
              title="Law Firms"
              description="Client confidentiality maintained with enterprise-grade security controls."
            />
            <ProtectionCard
              title="Medical & PHI Records"
              description="HIPAA-ready safeguards for handling protected health information in depositions."
            />
          </div>
        </div>
      </section>

      {/* Security FAQ */}
      <section className="py-16 lg:py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] text-center mb-12 lg:mb-16">
            Security FAQ
          </h2>
          <div className="space-y-6">
            <FAQItem
              question="Who can see my transcripts?"
              answer="Only users with explicit permission granted through role-based access controls. Court reporters control access to their jobs, and scopists only see assignments made to them."
            />
            <FAQItem
              question="Are attorneys restricted?"
              answer="Yes. Attorneys have read-only access to transcripts assigned to their cases. They cannot modify transcripts or access other cases."
            />
            <FAQItem
              question="How is access logged?"
              answer="Every action—viewing, editing, exporting, or sharing—is logged with timestamps, user identification, and IP addresses. Full audit trails are available for compliance review."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-[var(--color-primary)] text-[var(--color-text-inverse)]">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Questions About Security?
          </h2>
          <p className="text-lg text-[var(--color-text-inverse)]/80 mb-8 max-w-2xl mx-auto">
            Our security team is here to help
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-[var(--radius-button)] px-8 py-6 text-base font-medium"
          >
            <Link href="/contact">Contact Security Team</Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function SecurityFeature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] p-6 lg:p-8 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
      <div className="w-12 h-12 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[var(--color-accent)]" />
      </div>
      <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-3">{title}</h3>
      <p className="text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}

function ProtectionCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)] text-center">
      <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3">{title}</h3>
      <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-[var(--color-surface)] p-6 lg:p-8 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
      <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3">{question}</h3>
      <p className="text-[var(--color-text-secondary)] leading-relaxed">{answer}</p>
    </div>
  );
}
