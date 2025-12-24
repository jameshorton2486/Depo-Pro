// ═══════════════════════════════════════════════════════════════
// ABOUT PAGE
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
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
          About Depo-Pro
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Empowering legal professionals with cutting-edge transcription technology
        </p>
      </div>

      {/* Mission */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            Depo-Pro was founded with a simple goal: to make professional deposition transcription
            faster, more accurate, and more accessible. We understand the challenges court reporters
            and scopists face every day, and we've built a platform that addresses those challenges
            head-on.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            Our AI-powered transcription technology combines the best of machine learning with
            human expertise, ensuring that every transcript meets the highest standards of accuracy
            and compliance required in legal proceedings.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <ValueCard
              title="Accuracy"
              description="We&apos;re committed to delivering transcripts with 95%+ accuracy, meeting the rigorous standards of the legal profession."
            />
            <ValueCard
              title="Security"
              description="Your data security is our top priority. We employ enterprise-grade encryption and compliance measures."
            />
            <ValueCard
              title="Innovation"
              description="We continuously improve our technology to stay at the forefront of transcription and legal tech innovation."
            />
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h2 className="text-3xl font-bold text-center mb-12">Built by Legal Professionals, for Legal Professionals</h2>
        <p className="text-gray-700 text-lg text-center leading-relaxed">
          Our team includes former court reporters, legal tech experts, and software engineers
          who understand the unique needs of the legal transcription industry. We&apos;re not just
          building software—We&apos;re solving real problems for real professionals.
        </p>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Join Us</h2>
        <p className="text-gray-600 mb-8">Experience the future of deposition transcription</p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" variant="outline">Contact Us</Button>
          </Link>
        </div>
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

function ValueCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-lg">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

