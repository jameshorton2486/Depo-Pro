// ═══════════════════════════════════════════════════════════════
// FEATURES PAGE
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, Users, Shield, Zap, BarChart3, Lock } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Depo-Pro
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Everything You Need for Professional Deposition Management
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Streamline your workflow with AI-powered transcription, seamless collaboration, and enterprise-grade security.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg">Start Free Trial</Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" variant="outline">Contact Sales</Button>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={FileText}
            title="AI-Powered Transcription"
            description="Advanced speech recognition with 95%+ accuracy. Supports multiple speakers, legal terminology, and real-time processing."
          />
          <FeatureCard
            icon={Users}
            title="Team Collaboration"
            description="Assign jobs to scopists, track progress, and manage workflows seamlessly. Built for court reporting firms."
          />
          <FeatureCard
            icon={Shield}
            title="Enterprise Security"
            description="Bank-level encryption, SOC 2 compliance, and HIPAA-ready infrastructure. Your data is protected at every step."
          />
          <FeatureCard
            icon={Zap}
            title="Fast Processing"
            description="Transcribe 60-minute depositions in under an hour. Real-time status updates and instant notifications."
          />
          <FeatureCard
            icon={BarChart3}
            title="Analytics & Insights"
            description="Track productivity, monitor job status, and generate reports. Make data-driven decisions for your business."
          />
          <FeatureCard
            icon={Lock}
            title="Compliance Ready"
            description="Built for legal professionals. Meets court reporting standards, maintains chain of custody, and audit trails."
          />
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Built for Legal Professionals</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              title="Court Reporters"
              description="Create jobs, upload audio, assign to scopists, and export final transcripts. Everything in one place."
            />
            <UseCaseCard
              title="Scopists"
              description="Review flagged words, edit transcripts, and submit completed work. Streamlined review interface."
            />
            <UseCaseCard
              title="Reporting Firms"
              description="Manage multiple reporters, track assignments, and monitor productivity across your entire team."
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-gray-600 mb-8">Join court reporters and scopists who trust Depo-Pro</p>
        <Link href="/register">
          <Button size="lg">Create Your Account</Button>
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <Link href="/features" className="hover:text-gray-900">Features</Link>
            <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
            <Link href="/security" className="hover:text-gray-900">Security</Link>
            <Link href="/about" className="hover:text-gray-900">About</Link>
            <Link href="/contact" className="hover:text-gray-900">Contact</Link>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            © {new Date().getFullYear()} Depo-Pro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function UseCaseCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-lg">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

