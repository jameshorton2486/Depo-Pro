// =============================================================================
// TAILWIND CONFIG - Depo-Pro Design System Extensions
// =============================================================================
// Note: Tailwind CSS v4 uses CSS-first configuration via @theme in CSS.
// This config file is provided for reference and backward compatibility.
// Primary design tokens are defined in styles/design-tokens.css
// =============================================================================

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        ink: '#0F172A',        // Deep Navy / Ink
        slate: '#334155',      // Slate
        accent: '#2563EB',     // Muted Blue
        'accent-hover': '#1D4ED8', // Darker blue on hover
        
        // Status Colors
        success: '#16A34A',    // Legal Green
        warning: '#D97706',    // Amber
        danger: '#DC2626',     // Red
        
        // Surface Colors
        surface: '#FFFFFF',    // White
        bg: '#F8FAFC',         // Soft Gray Background
        'bg-dark': '#1E1E1E',  // Dark mode background
        'panel-dark': '#252526', // Dark mode panels
        border: '#E5E7EB',     // Neutral Border
        'border-dark': '#3C3C3C', // Dark mode borders
        
        // Text Colors (semantic aliases)
        'text-primary': '#0F172A',
        'text-secondary': '#334155',
        'text-muted': '#64748B',
        'text-inverse': '#FFFFFF',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '12px',
      },
      boxShadow: {
        soft: '0 4px 12px rgba(15, 23, 42, 0.06)',
        card: '0 1px 3px rgba(15, 23, 42, 0.1), 0 1px 2px rgba(15, 23, 42, 0.06)',
        medium: '0 8px 24px rgba(15, 23, 42, 0.08)',
        elevated: '0 10px 25px rgba(15, 23, 42, 0.1)',
        lg: '0 12px 32px rgba(15, 23, 42, 0.1)',
      },
      fontSize: {
        // Type scale for legal professional aesthetic
        'hero': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'h1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h2': ['1.875rem', { lineHeight: '1.25' }],
        'h3': ['1.5rem', { lineHeight: '1.3' }],
        'h4': ['1.25rem', { lineHeight: '1.4' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'small': ['0.875rem', { lineHeight: '1.5' }],
        'meta': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.05em' }],
      },
      spacing: {
        // Section spacing - note: these are for use in padding utilities
        // Use py-section, py-section-sm, py-section-xs in components
      },
      fontFamily: {
        heading: ['var(--font-geist-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'sans-serif'],
        body: ['var(--font-geist-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      maxWidth: {
        container: '1200px',
        content: '1200px',    // Max content width (updated)
        narrow: '720px',      // Narrow content (text)
      },
    },
  },
  plugins: [],
};

export default config;
