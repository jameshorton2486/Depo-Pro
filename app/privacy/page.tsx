import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-32 lg:pt-36">
        <h1 className="mb-4 text-4xl font-bold text-[var(--color-primary)]">Privacy Policy</h1>
        <p className="mb-8 text-sm text-[var(--color-text-secondary)]">Last updated: March 9, 2026</p>

        <div className="space-y-8 text-[var(--color-text-secondary)]">
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-[var(--color-primary)]">Information We Collect</h2>
            <p>
              Depo-Pro collects account data, organization details, job metadata, uploaded audio files, transcript
              content, and review activity needed to provide legal transcription workflows.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-[var(--color-primary)]">How We Use Information</h2>
            <p>
              We use collected information to authenticate users, process transcription jobs, enable collaboration,
              track audit history, and improve reliability and security.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-[var(--color-primary)]">Data Security</h2>
            <p>
              Depo-Pro uses encryption in transit and at rest, role-based access controls, and logging for sensitive
              actions to protect legal records.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-[var(--color-primary)]">Contact</h2>
            <p>For privacy questions, contact support at support@depo-pro.com.</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
