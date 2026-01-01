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
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />

      {/* Hero - with gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative container mx-auto px-4 lg:px-6 pt-32 pb-20 lg:pt-40 lg:pb-24 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold mb-6 leading-[1.1] max-w-4xl mx-auto tracking-tight">
            Features Built for Legal Professionals
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Comprehensive tools designed specifically for court reporters, scopists, and reporting firms.
          </p>
        </div>
      </section>

      {/* For Court Reporters - Blue accent */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-12 border-l-4 border-indigo-600 pl-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-700" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
              For Court Reporters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureItem
              title="Job creation and case management"
              description="Streamlined interface for entering case details, managing assignments, and tracking deposition status."
              accentColor="indigo"
            />
            <FeatureItem
              title="AI transcription with legal vocabulary support"
              description="Legal-optimized speech recognition trained on court reporting terminology and proper nouns."
              accentColor="indigo"
            />
            <FeatureItem
              title="Proper-noun reference injection"
              description="Feed names, locations, and terms into the transcription engine for improved accuracy."
              accentColor="indigo"
            />
            <FeatureItem
              title="Reporter notes for guiding transcription"
              description="Capture notes during deposition to guide AI accuracy and assist scopist review."
              accentColor="indigo"
            />
            <FeatureItem
              title="Certified export formats"
              description="Export transcripts in DOCX, PDF, TXT, and legacy ASCII formats—court-ready."
              accentColor="indigo"
            />
          </div>
        </div>
      </section>

      {/* For Scopists - Teal accent */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-12 border-l-4 border-teal-600 pl-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-teal-700" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
              For Scopists
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureItem
              title="Confidence-based word review"
              description="Focus on low-confidence words flagged by AI, with visual highlighting for efficient correction."
              accentColor="teal"
            />
            <FeatureItem
              title="Integrated audio playback with timestamps"
              description="Jump to exact moments in audio recordings with synchronized playback controls."
              accentColor="teal"
            />
            <FeatureItem
              title="Reporter notes visible during review"
              description="Access reporter-entered notes and proper nouns to ensure accurate corrections."
              accentColor="teal"
            />
            <FeatureItem
              title="Clean, distraction-free editing interface"
              description="Optimized workspace designed for fast, accurate transcript editing."
              accentColor="teal"
            />
          </div>
        </div>
      </section>

      {/* For Reporting Firms - Slate accent */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-12 border-l-4 border-slate-600 pl-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-slate-700" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
              For Reporting Firms
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureItem
              title="Team assignments and role-based permissions"
              description="Assign jobs to reporters and scopists with granular access controls and permissions."
              accentColor="slate"
            />
            <FeatureItem
              title="Productivity and turnaround analytics"
              description="Track team performance, job completion times, and identify workflow bottlenecks."
              accentColor="slate"
            />
            <FeatureItem
              title="Secure storage and audit logging"
              description="Enterprise-grade data protection with comprehensive audit trails for compliance."
              accentColor="slate"
            />
            <FeatureItem
              title="Multi-job oversight with standardized workflows"
              description="Manage multiple depositions simultaneously with consistent, repeatable processes."
              accentColor="slate"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join court reporters and scopists who trust Depo-Pro
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-indigo-900 hover:bg-white/90 rounded-lg px-8 py-6 text-base font-semibold shadow-lg"
          >
            <Link href="/register">Create Your Account</Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function FeatureItem({ 
  title, 
  description, 
  accentColor = 'indigo' 
}: { 
  title: string; 
  description: string;
  accentColor?: 'indigo' | 'teal' | 'slate';
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
