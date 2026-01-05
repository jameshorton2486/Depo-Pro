import Link from 'next/link';
import { Mail, Linkedin, Twitter } from 'lucide-react';

// =============================================================================
// FOOTER CONFIGURATION
// =============================================================================

const FOOTER_LINKS = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '/product' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'AI & Accuracy', href: '/ai' },
      { label: 'Pricing', href: '/pricing', comingSoon: true },
    ],
  },
  solutions: {
    title: 'Solutions',
    links: [
      { label: 'Court Reporters', href: '/solutions/reporters', comingSoon: true },
      { label: 'Scopists', href: '/solutions/scopists', comingSoon: true },
      { label: 'Agencies', href: '/solutions/agencies', comingSoon: true },
      { label: 'Law Firms', href: '/solutions/law-firms', comingSoon: true },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Security', href: '/security' },
      { label: 'Architecture', href: '/architecture' },
      { label: 'Documentation', href: '/docs', comingSoon: true },
      { label: 'API Reference', href: '/api-docs', comingSoon: true },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
} as const;

const SOCIAL_LINKS = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/depo-pro', icon: Linkedin },
  { label: 'Twitter', href: 'https://twitter.com/depopro', icon: Twitter },
];

// =============================================================================
// FOOTER LINK COLUMN COMPONENT
// =============================================================================

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string; comingSoon?: boolean }>;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
        {title}
      </h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            {link.comingSoon ? (
              <span className="inline-flex items-center gap-2 text-sm text-slate-500 cursor-not-allowed">
                {link.label}
                <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                  Soon
                </span>
              </span>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-slate-400 hover:text-white transition-colors duration-150"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================================
// MAIN FOOTER COMPONENT
// =============================================================================

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2 lg:pr-8">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm text-white transition-transform group-hover:scale-105">
                DP
              </div>
              <span className="text-xl font-bold tracking-tight">Depo-Pro</span>
            </Link>
            
            {/* Tagline */}
            <p className="mt-4 text-sm text-slate-400 max-w-xs leading-relaxed">
              Secure, AI-assisted deposition and transcript management platform 
              built specifically for legal professionals.
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-2">
              <a 
                href="mailto:hello@depo-pro.com" 
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4" />
                hello@depo-pro.com
              </a>
            </div>

            {/* Social Links */}
            <div className="mt-6 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-150"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          <FooterLinkColumn {...FOOTER_LINKS.product} />
          <FooterLinkColumn {...FOOTER_LINKS.solutions} />
          <FooterLinkColumn {...FOOTER_LINKS.resources} />
          <FooterLinkColumn {...FOOTER_LINKS.company} />
        </div>
      </div>

      {/* Trust Statement */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-slate-500 max-w-3xl mx-auto leading-relaxed">
            Depo-Pro is not a generic transcription tool. It is a{' '}
            <span className="text-slate-400">purpose-built legal platform</span>{' '}
            designed for environments where accuracy, security, and accountability matter.
          </p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <p className="text-sm text-slate-500">
              © {currentYear} Depo-Pro. All rights reserved.
            </p>

            {/* Compliance Badges / Trust Indicators */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                HIPAA Ready
              </span>
              <span className="text-xs text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                SOC 2 (In Progress)
              </span>
              <span className="text-xs text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                256-bit Encryption
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
