// ═══════════════════════════════════════════════════════════════
// PRICING PAGE - Value-Anchored Pricing
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';
import { CheckCircle } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />

      {/* Hero - with gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative container mx-auto px-4 lg:px-6 pt-32 pb-20 lg:pt-40 lg:pb-24 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold mb-6 leading-[1.1] max-w-4xl mx-auto tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Choose the plan that fits your workflow. All plans include core features and support.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-10 max-w-6xl mx-auto">
            <PricingCard
              name="Starter"
              price="$49"
              period="month"
              bestFor="individual court reporters"
              typicalWorkload="10–20 depositions per month"
              features={[
                'Up to 20 transcription hours/month',
                'AI transcription',
                'Basic job management',
                'Email support',
              ]}
              cta="Start Free Trial"
              highlighted={false}
            />
            <PricingCard
              name="Professional"
              price="$149"
              period="month"
              bestFor="growing reporting firms"
              typicalWorkload="30–100 depositions per month"
              features={[
                'Up to 100 transcription hours/month',
                'Team collaboration',
                'Advanced analytics',
                'Unlimited scopists',
                'Priority support',
              ]}
              cta="Start Free Trial"
              highlighted={true}
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              period=""
              bestFor="large organizations"
              typicalWorkload="100+ depositions per month"
              features={[
                'Unlimited transcription',
                'Dedicated account manager',
                'Custom SLAs',
                'Advanced security options',
                'On-premise deployment (optional)',
              ]}
              cta="Contact Sales"
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 text-center mb-12 lg:mb-16">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FAQItem
              question="Can I change plans later?"
              answer="Yes—upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate any charges."
            />
            <FAQItem
              question="Is there a free trial?"
              answer="Yes—14 days, no credit card required. Full access to all features during the trial period."
            />
            <FAQItem
              question="What happens if I exceed my monthly transcription hours?"
              answer="You can purchase additional hours as needed, or upgrade to a higher plan. We'll notify you before you reach your limit."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards and ACH transfers for Enterprise plans. All payments are processed securely."
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
            Start your free trial today. No credit card required.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-indigo-900 hover:bg-white/90 rounded-lg px-8 py-6 text-base font-semibold shadow-lg"
          >
            <Link href="/register">Start Free Trial</Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  bestFor,
  typicalWorkload,
  features,
  cta,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  bestFor: string;
  typicalWorkload: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`relative bg-white rounded-2xl border-2 p-8 lg:p-10 transition-all duration-200 ${
        highlighted
          ? 'border-indigo-600 shadow-lg scale-[1.02]'
          : 'border-slate-200 shadow-sm hover:shadow-md'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white uppercase tracking-wider">
            Most Popular
          </span>
        </div>
      )}
      <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">{name}</h3>
      <div className="mb-4">
        <p className="text-sm text-slate-600 mb-1">
          <span className="font-medium">Best for:</span> {bestFor}
        </p>
        <p className="text-sm text-slate-500">
          <span className="font-medium">Typical monthly workload:</span> {typicalWorkload}
        </p>
      </div>
      <div className="mb-6 pb-6 border-b border-slate-200">
        <span className="text-4xl lg:text-5xl font-bold text-slate-900">{price}</span>
        {period && <span className="text-lg text-slate-600">/{period}</span>}
      </div>
      <div className="mb-8">
        <p className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">
          Includes:
        </p>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600 text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link href={cta === 'Contact Sales' ? '/contact' : '/register'} className="block">
        <Button
          className={`w-full rounded-lg py-3 font-medium ${
            highlighted
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
          variant={highlighted ? 'default' : 'outline'}
        >
          {cta}
        </Button>
      </Link>
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
