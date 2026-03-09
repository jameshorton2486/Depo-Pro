import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-32 lg:pt-36">
        <h1 className="mb-4 text-4xl font-bold text-[var(--color-primary)]">Terms of Service</h1>
        <p className="mb-8 text-sm text-[var(--color-text-secondary)]">Last updated: March 9, 2026</p>

        <div className="space-y-8 text-[var(--color-text-secondary)]">
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-[var(--color-primary)]">Service Scope</h2>
            <p>
              Depo-Pro provides SaaS tools for deposition scheduling, transcription workflows, transcript review, and
              export management for legal teams.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-[var(--color-primary)]">Account Responsibility</h2>
            <p>
              Customers are responsible for user access management, lawful use of uploaded content, and compliance
              with contractual or regulatory duties applicable to deposition records.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-[var(--color-primary)]">Platform Availability</h2>
            <p>
              We strive for high reliability and may perform maintenance, updates, or emergency mitigation as needed
              to protect the service.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-[var(--color-primary)]">Contact</h2>
            <p>For legal inquiries about these terms, contact support@depo-pro.com.</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
