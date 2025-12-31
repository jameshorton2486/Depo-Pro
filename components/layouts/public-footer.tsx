import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-t border-[var(--color-border)]">
      <div className="container mx-auto px-4 lg:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-8">
          {/* Column 1: Product */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[var(--tracking-label)] mb-4 text-[var(--color-text-inverse)]">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/features"
                  className="text-sm text-[var(--color-text-inverse)]/80 hover:text-[var(--color-text-inverse)] transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-[var(--color-text-inverse)]/80 hover:text-[var(--color-text-inverse)] transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="text-sm text-[var(--color-text-inverse)]/80 hover:text-[var(--color-text-inverse)] transition-colors"
                >
                  Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[var(--tracking-label)] mb-4 text-[var(--color-text-inverse)]">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-[var(--color-text-inverse)]/80 hover:text-[var(--color-text-inverse)] transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-[var(--color-text-inverse)]/80 hover:text-[var(--color-text-inverse)] transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-[var(--color-text-inverse)]/80 hover:text-[var(--color-text-inverse)] transition-colors opacity-60"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[var(--tracking-label)] mb-4 text-[var(--color-text-inverse)]">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-[var(--color-text-inverse)]/80 hover:text-[var(--color-text-inverse)] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-[var(--color-text-inverse)]/80 hover:text-[var(--color-text-inverse)] transition-colors"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="text-sm text-[var(--color-text-inverse)]/80 hover:text-[var(--color-text-inverse)] transition-colors"
                >
                  Compliance
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--color-text-inverse)]/20 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[var(--color-text-inverse)]/80">
              © {new Date().getFullYear()} Depo-Pro. All rights reserved.
            </p>
            <p className="text-sm text-[var(--color-text-inverse)]/60 italic">
              Built for Legal Professionals
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
