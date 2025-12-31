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
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-[var(--color-primary)] mb-6 leading-[1.1] max-w-4xl mx-auto">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed">
            Choose the plan that fits your workflow. All plans include core features and support.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 lg:py-24 bg-[var(--color-surface)]">
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
      <section className="py-16 lg:py-24 bg-[var(--color-bg)]">
        <div className="container mx-auto px-4 lg:px-6 max-w-3xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-primary)] text-center mb-12 lg:mb-16">
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
      <section className="py-16 lg:py-24 bg-[var(--color-primary)] text-[var(--color-text-inverse)]">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-[var(--color-text-inverse)]/80 mb-8 max-w-2xl mx-auto">
            Start your free trial today. No credit card required.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-[var(--radius-button)] px-8 py-6 text-base font-medium"
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
      className={`bg-[var(--color-surface)] rounded-[var(--radius-card)] border-2 p-8 lg:p-10 ${
        highlighted
          ? 'border-[var(--color-accent)] shadow-[var(--shadow-medium)] scale-105'
          : 'border-[var(--color-border)] shadow-[var(--shadow-soft)]'
      }`}
    >
      {highlighted && (
        <div className="bg-[var(--color-accent)] text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4 uppercase tracking-[var(--tracking-label)]">
          Most Popular
        </div>
      )}
      <h3 className="text-2xl lg:text-3xl font-bold text-[var(--color-primary)] mb-2">{name}</h3>
      <div className="mb-4">
        <p className="text-sm text-[var(--color-text-secondary)] mb-1">
          <span className="font-medium">Best for:</span> {bestFor}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          <span className="font-medium">Typical monthly workload:</span> {typicalWorkload}
        </p>
      </div>
      <div className="mb-6 pb-6 border-b border-[var(--color-border)]">
        <span className="text-4xl lg:text-5xl font-bold text-[var(--color-primary)]">{price}</span>
        {period && <span className="text-lg text-[var(--color-text-secondary)]">/{period}</span>}
      </div>
      <div className="mb-8">
        <p className="text-sm font-semibold text-[var(--color-primary)] mb-4 uppercase tracking-[var(--tracking-label)]">
          Includes:
        </p>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
              <span className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link href={cta === 'Contact Sales' ? '/contact' : '/register'} className="block">
        <Button
          className={`w-full rounded-[var(--radius-button)] ${
            highlighted
              ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
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
    <div className="bg-[var(--color-surface)] p-6 lg:p-8 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
      <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3">{question}</h3>
      <p className="text-[var(--color-text-secondary)] leading-relaxed">{answer}</p>
    </div>
  );
}
