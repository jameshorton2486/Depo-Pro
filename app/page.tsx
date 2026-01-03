// =============================================================================
// HOMEPAGE
// app/page.tsx
//
// Public landing page with hero section and feature highlights
// =============================================================================

import Link from 'next/link';
import { Mic, AlertCircle, Users, FileText, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-900 to-indigo-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            AI-Powered Legal Transcription
          </h1>
          <p className="text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">
            Depo-Pro streamlines the court reporting workflow with intelligent 
            transcription, scopist review, and seamless document delivery.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/register" 
              className="bg-teal-500 hover:bg-teal-600 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Get Started
            </Link>
            <Link 
              href="/features" 
              className="bg-white/10 hover:bg-white/20 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
      
      {/* Features Preview */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Mic}
              title="AI-Powered Transcription"
              description="Deepgram Nova-3 model optimized for legal terminology and accuracy"
            />
            <FeatureCard
              icon={AlertCircle}
              title="Low-Confidence Word Review"
              description="Scopists efficiently review uncertain words with audio sync"
            />
            <FeatureCard
              icon={Users}
              title="Role-Based Workflow"
              description="Separate dashboards for reporters, scopists, and administrators"
            />
            <FeatureCard
              icon={FileText}
              title="Professional Export"
              description="DOCX and PDF exports with legal formatting standards"
            />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-6">Secure & Compliant</h2>
            <p className="text-gray-600 mb-8">
              Built with security and compliance in mind. HIPAA-ready infrastructure 
              with end-to-end encryption and comprehensive audit logging.
            </p>
            <Link 
              href="/security" 
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Learn more about security →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-indigo-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-8">
            Join our beta program and help shape the future of legal transcription.
          </p>
          <Link 
            href="/register" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            Create Your Account
          </Link>
        </div>
      </section>
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
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <Icon className="w-12 h-12 text-indigo-600 mb-4" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
