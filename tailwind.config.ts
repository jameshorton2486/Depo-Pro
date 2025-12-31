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
        
        // Status Colors
        success: '#16A34A',    // Legal Green
        warning: '#D97706',    // Amber
        
        // Surface Colors
        surface: '#FFFFFF',    // White
        bg: '#F8FAFC',         // Soft Gray Background
        border: '#E5E7EB',     // Neutral Border
        
        // Text Colors (semantic aliases)
        'text-primary': '#0F172A',
        'text-secondary': '#334155',
        'text-muted': '#64748B',
        'text-inverse': '#FFFFFF',
      },
      borderRadius: {
        md: '10px',
        lg: '12px',
      },
      boxShadow: {
        soft: '0 4px 12px rgba(15, 23, 42, 0.06)',
        medium: '0 8px 24px rgba(15, 23, 42, 0.08)',
        lg: '0 12px 32px rgba(15, 23, 42, 0.1)',
      },
      fontFamily: {
        heading: ['var(--font-geist-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'sans-serif'],
        body: ['var(--font-geist-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      maxWidth: {
        container: '1200px',
        content: '800px',
        narrow: '640px',
      },
    },
  },
  plugins: [],
};

export default config;
