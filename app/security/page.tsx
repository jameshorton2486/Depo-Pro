// ═══════════════════════════════════════════════════════════════
// SECURITY PAGE
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Eye, FileCheck, Server, CheckCircle } from 'lucide-react';

export default function SecurityPage() {
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
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Security & Compliance
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Your data security is our top priority. We employ enterprise-grade security measures
          to protect your sensitive legal documents.
        </p>
      </div>

      {/* Security Features */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <SecurityFeature
            icon={Lock}
            title="End-to-End Encryption"
            description="All data is encrypted in transit and at rest using AES-256 encryption. Your transcripts are protected from unauthorized access."
          />
          <SecurityFeature
            icon={Shield}
            title="SOC 2 Compliant"
            description="We maintain SOC 2 Type II compliance, ensuring our security controls meet the highest industry standards."
          />
          <SecurityFeature
            icon={Eye}
            title="Access Controls"
            description="Role-based access control ensures that only authorized users can view or modify sensitive information."
          />
          <SecurityFeature
            icon={FileCheck}
            title="Audit Logging"
            description="Every action is logged and tracked. Complete audit trails for compliance and security monitoring."
          />
          <SecurityFeature
            icon={Server}
            title="Secure Infrastructure"
            description="Hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA and regular security audits."
          />
          <SecurityFeature
            icon={CheckCircle}
            title="HIPAA Ready"
            description="Our platform is designed to meet HIPAA requirements for handling protected health information."
          />
        </div>
      </div>

      {/* Compliance */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Compliance & Certifications</h2>
          <div className="bg-white rounded-lg p-8 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">SOC 2 Type II</h3>
              <p className="text-gray-600">
                We undergo annual SOC 2 Type II audits to ensure our security controls,
                availability, processing integrity, confidentiality, and privacy meet the
                highest standards.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">HIPAA Compliance</h3>
              <p className="text-gray-600">
                Our platform is designed with HIPAA requirements in mind. We implement
                administrative, physical, and technical safeguards to protect PHI.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">GDPR Ready</h3>
              <p className="text-gray-600">
                We comply with GDPR requirements for data protection and privacy. You have
                full control over your data and can request deletion at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Protection */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h2 className="text-3xl font-bold text-center mb-12">Data Protection</h2>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Regular Backups</h3>
            <p className="text-gray-600">
              All data is backed up daily with point-in-time recovery capabilities. Your
              transcripts are never lost, even in the event of a disaster.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Data Retention</h3>
            <p className="text-gray-600">
              You control how long your data is retained. Delete transcripts and files at
              any time, or set automatic retention policies.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Incident Response</h3>
            <p className="text-gray-600">
              Our security team monitors for threats 24/7 and responds immediately to any
              security incidents. We maintain detailed incident response procedures.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Questions About Security?</h2>
        <p className="text-gray-600 mb-8">Our security team is here to help</p>
        <Link href="/contact">
          <Button size="lg">Contact Security Team</Button>
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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

