import Link from "next/link";

/* =============================================================================
   FOOTER COMPONENTS
   ============================================================================= */

/**
 * Public Footer
 * Used on marketing pages
 */
export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
      { label: "API", href: "/api-docs" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "HIPAA Compliance", href: "/hipaa" },
    ],
    support: [
      { label: "Help Center", href: "/help" },
      { label: "Documentation", href: "/docs" },
      { label: "Status", href: "https://status.depo-pro.com" },
      { label: "Contact Support", href: "/support" },
    ],
  };

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Main Footer */}
      <div className="page-container py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 lg:pr-8">
            <Link href="/" className="inline-flex items-center gap-2 text-white no-underline">
              <DepoProLogo className="h-8 w-auto" />
              <span className="text-xl font-bold">Depo-Pro</span>
            </Link>
            <p className="mt-4 text-sm text-slate-400 max-w-xs">
              AI-powered legal transcription platform built for court reporters, 
              scopists, and law firms.
            </p>
            
            {/* Trust badges */}
            <div className="mt-6 flex items-center gap-3">
              <TrustBadge label="SOC 2" />
              <TrustBadge label="HIPAA" />
              <TrustBadge label="256-bit SSL" />
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Support
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="page-container py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            © {currentYear} Depo-Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <SocialLink href="https://twitter.com/depopro" aria-label="Twitter">
              <TwitterIcon className="w-5 h-5" />
            </SocialLink>
            <SocialLink href="https://linkedin.com/company/depopro" aria-label="LinkedIn">
              <LinkedInIcon className="w-5 h-5" />
            </SocialLink>
            <SocialLink href="https://github.com/depopro" aria-label="GitHub">
              <GitHubIcon className="w-5 h-5" />
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * App Footer
 * Minimal footer for authenticated dashboard
 */
export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="page-container py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-muted-foreground">
        <p>© {currentYear} Depo-Pro</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors no-underline">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors no-underline">
            Terms
          </Link>
          <Link href="/help" className="hover:text-foreground transition-colors no-underline">
            Help
          </Link>
          <a 
            href="https://status.depo-pro.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors no-underline flex items-center gap-1"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Status
          </a>
        </div>
      </div>
    </footer>
  );
}

/* =============================================================================
   HELPER COMPONENTS
   ============================================================================= */

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-slate-400 hover:text-white transition-colors no-underline"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="text-sm text-slate-400 hover:text-white transition-colors no-underline"
    >
      {children}
    </Link>
  );
}

function SocialLink({
  href,
  children,
  ...props
}: {
  href: string;
  children: React.ReactNode;
  "aria-label": string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-slate-400 hover:text-white transition-colors"
      {...props}
    >
      {children}
    </a>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
      {label}
    </span>
  );
}

/* =============================================================================
   ICONS
   ============================================================================= */

function DepoProLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M8 10h4v12H8V10zm6 0h6a4 4 0 014 4v4a4 4 0 01-4 4h-6V10zm4 8h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2v4z"
        fill="white"
      />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
