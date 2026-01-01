// ═══════════════════════════════════════════════════════════════
// SECURITY PAGE - Trust & Compliance
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';
import { Shield, Lock, Eye, FileCheck, Server, CheckCircle, Database, RefreshCcw } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />

      {/* Hero - Dark charcoal background for serious/premium feel */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="relative container mx-auto px-4 lg:px-6 pt-32 pb-20 lg:pt-40 lg:pb-24 text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-500/10">
            <Shield className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold mb-6 leading-[1.1] max-w-4xl mx-auto tracking-tight">
            Security & Compliance You Can Trust
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Your data security is our highest priority. Depo-Pro is built to meet the strict requirements of legal professionals handling sensitive information.
          </p>
        </div>
      </section>

      {/* Security by Design Strip */}
      <section className="py-8 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Encryption</span>
            </div>
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Access Control</span>
            </div>
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Audit Trails</span>
            </div>
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Backups</span>
            </div>
          </div>
        </div>
      </section>

      {/* Security Measures */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 text-center mb-12 lg:mb-16">
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
            <SecurityFeature
              icon={RefreshCcw}
              title="Disaster Recovery"
              description="Automated backups and failover systems ensure business continuity."
            />
          </div>
        </div>
      </section>

      {/* Compliance & Certifications */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 text-center mb-12 lg:mb-16">
            Compliance & Certifications
          </h2>
          <div className="bg-white rounded-2xl p-8 lg:p-12 space-y-8 shadow-sm border border-slate-200">
            <div className="flex items-start gap-4">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 flex-shrink-0">
                SOC 2
              </span>
              <div>
                <h3 className="text-xl lg:text-2xl font-semibold text-slate-900 mb-2">
                  SOC 2 Type II
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  SOC 2 Type II audited infrastructure designed for legal data handling.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 flex-shrink-0">
                HIPAA
              </span>
              <div>
                <h3 className="text-xl lg:text-2xl font-semibold text-slate-900 mb-2">
                  HIPAA-Ready Safeguards
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Administrative, physical, and technical safeguards implemented to protect protected health information.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 flex-shrink-0">
                GDPR
              </span>
              <div>
                <h3 className="text-xl lg:text-2xl font-semibold text-slate-900 mb-2">
                  GDPR-Aligned Data Protections
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Compliance with GDPR requirements for data protection and privacy, with full user control over data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Protection */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 text-center mb-12 lg:mb-16">
            Data Protection
          </h2>
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 lg:p-8 rounded-xl border border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Daily Backups with Point-in-Time Recovery</h3>
              <p className="text-slate-600 leading-relaxed">
                All data is backed up daily with point-in-time recovery capabilities. Your transcripts are protected against data loss.
              </p>
            </div>
            <div className="bg-slate-50 p-6 lg:p-8 rounded-xl border border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Configurable Data Retention Policies</h3>
              <p className="text-slate-600 leading-relaxed">
                Set retention policies that meet your compliance requirements. Delete data on demand or configure automatic retention periods.
              </p>
            </div>
            <div className="bg-slate-50 p-6 lg:p-8 rounded-xl border border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">24/7 Incident Monitoring and Response</h3>
              <p className="text-slate-600 leading-relaxed">
                Our security team monitors for threats around the clock and maintains detailed incident response procedures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Protects */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 text-center mb-12 lg:mb-16">
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
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 text-center mb-12 lg:mb-16">
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
      <section className="py-16 lg:py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Questions About Security?
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Our security team is here to help
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-slate-900 hover:bg-white/90 rounded-lg px-8 py-6 text-base font-semibold shadow-lg"
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
    <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-slate-700" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function ProtectionCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center hover:shadow-md transition-all duration-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-slate-50 p-6 lg:p-8 rounded-xl border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">{question}</h3>
      <p className="text-slate-600 leading-relaxed">{answer}</p>
    </div>
  );
}
