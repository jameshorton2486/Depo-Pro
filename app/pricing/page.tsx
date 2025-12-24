// ═══════════════════════════════════════════════════════════════
// PRICING PAGE
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function PricingPage() {
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
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Choose the plan that fits your needs. All plans include core features and support.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingCard
            name="Starter"
            price="$49"
            period="month"
            description="Perfect for individual court reporters"
            features={[
              'Up to 20 hours transcription/month',
              'AI-powered transcription',
              'Basic job management',
              'Email support',
              'Export to DOCX, PDF, TXT',
            ]}
            cta="Start Free Trial"
            highlighted={false}
          />
          <PricingCard
            name="Professional"
            price="$149"
            period="month"
            description="For growing reporting firms"
            features={[
              'Up to 100 hours transcription/month',
              'Team collaboration tools',
              'Advanced analytics',
              'Priority support',
              'Custom integrations',
              'Unlimited scopists',
            ]}
            cta="Start Free Trial"
            highlighted={true}
          />
          <PricingCard
            name="Enterprise"
            price="Custom"
            period=""
            description="For large organizations"
            features={[
              'Unlimited transcription',
              'Dedicated account manager',
              'Custom SLA',
              'On-premise deployment options',
              'Advanced security features',
              'Training & onboarding',
            ]}
            cta="Contact Sales"
            highlighted={false}
          />
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <FAQItem
              question="What happens if I exceed my monthly transcription hours?"
              answer="You can purchase additional hours as needed, or upgrade to a higher plan. We'll notify you before you reach your limit."
            />
            <FAQItem
              question="Can I change plans later?"
              answer="Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges."
            />
            <FAQItem
              question="Is there a free trial?"
              answer="Yes, all plans include a 14-day free trial. No credit card required. You'll have full access to all features during the trial."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards and ACH transfers for Enterprise plans. All payments are processed securely."
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-gray-600 mb-8">Start your free trial today. No credit card required.</p>
        <Link href="/register">
          <Button size="lg">Start Free Trial</Button>
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

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-lg border-2 p-8 ${
        highlighted ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-200'
      }`}
    >
      {highlighted && (
        <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
          MOST POPULAR
        </div>
      )}
      <h3 className="text-2xl font-bold mb-2">{name}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        {period && <span className="text-gray-600">/{period}</span>}
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <Link href={cta === 'Contact Sales' ? '/contact' : '/register'} className="block">
        <Button className="w-full" variant={highlighted ? 'default' : 'outline'}>
          {cta}
        </Button>
      </Link>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white p-6 rounded-lg">
      <h3 className="font-semibold text-lg mb-2">{question}</h3>
      <p className="text-gray-600">{answer}</p>
    </div>
  );
}

