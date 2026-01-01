import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* =====================================================================
         COLORS - Depo-Pro Brand System
         ===================================================================== */
      colors: {
        // Brand Primary (Indigo-based - trust, law, security)
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",  // PRIMARY
          900: "#1e3a8a",
          950: "#172554",
        },
        // Accent Teal (success, confirmation) - renamed to avoid conflict with shadcn accent
        accentTeal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",  // PRIMARY
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        // Role Colors
        role: {
          reporter: {
            DEFAULT: "#2563eb",
            soft: "#dbeafe",
          },
          scopist: {
            DEFAULT: "#0d9488",
            soft: "#ccfbf1",
          },
          admin: {
            DEFAULT: "#7c3aed",
            soft: "#ede9fe",
          },
          attorney: {
            DEFAULT: "#475569",
            soft: "#f1f5f9",
          },
        },
        // Job Status Colors
        status: {
          pending: {
            DEFAULT: "#f59e0b",
            soft: "#fef3c7",
          },
          processing: {
            DEFAULT: "#3b82f6",
            soft: "#dbeafe",
          },
          review: {
            DEFAULT: "#8b5cf6",
            soft: "#ede9fe",
          },
          complete: {
            DEFAULT: "#10b981",
            soft: "#d1fae5",
          },
          failed: {
            DEFAULT: "#ef4444",
            soft: "#fee2e2",
          },
        },
        // Confidence Highlighting
        confidence: {
          high: "transparent",
          medium: "#fef9c3",
          low: "#fed7aa",
          critical: "#fecaca",
        },
        // Semantic overrides for shadcn compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      /* =====================================================================
         TYPOGRAPHY
         ===================================================================== */
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        serif: ["Georgia", "Times New Roman", "serif"],
        // Legal transcript font
        transcript: ["Courier New", "Courier", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      letterSpacing: {
        legal: "0.02em", // Slight letter spacing for legal documents
      },
      lineHeight: {
        legal: "2", // Double-spaced for legal transcripts
      },

      /* =====================================================================
         SPACING & SIZING
         ===================================================================== */
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "112": "28rem",
        "128": "32rem",
        "144": "36rem",
      },
      maxWidth: {
        "8xl": "88rem",
        "9xl": "96rem",
      },
      minHeight: {
        "screen-nav": "calc(100vh - 64px)", // Full height minus navbar
        "screen-nav-audio": "calc(100vh - 64px - 120px)", // Minus navbar + audio player
      },

      /* =====================================================================
         BORDERS & RADIUS
         ===================================================================== */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "4xl": "2rem",
      },
      borderWidth: {
        "3": "3px",
      },

      /* =====================================================================
         SHADOWS
         ===================================================================== */
      boxShadow: {
        "card": "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px 0 rgb(0 0 0 / 0.02)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.08)",
        "inner-sm": "inset 0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "focus": "0 0 0 3px rgba(30, 64, 175, 0.15)",
        "focus-error": "0 0 0 3px rgba(220, 38, 38, 0.15)",
        "elevation-1": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "elevation-2": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "elevation-3": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "elevation-4": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },

      /* =====================================================================
         ANIMATIONS
         ===================================================================== */
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-left": "slide-left 0.3s ease-out",
        "slide-right": "slide-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "spin-slow": "spin 3s linear infinite",
        "pulse-soft": "pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
        "bounce-subtle": "bounce-subtle 1s ease-in-out infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-left": {
          from: { opacity: "0", transform: "translateX(10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-right": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },

      /* =====================================================================
         TRANSITIONS
         ===================================================================== */
      transitionDuration: {
        "0": "0ms",
        "250": "250ms",
        "400": "400ms",
      },
      transitionTimingFunction: {
        "in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },

      /* =====================================================================
         Z-INDEX SCALE
         ===================================================================== */
      zIndex: {
        "60": "60",
        "70": "70",
        "80": "80",
        "90": "90",
        "100": "100",
        "dropdown": "100",
        "sticky": "200",
        "fixed": "300",
        "modal-backdrop": "400",
        "modal": "500",
        "popover": "600",
        "tooltip": "700",
        "toast": "800",
      },

      /* =====================================================================
         BACKGROUND IMAGES
         ===================================================================== */
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #1e3a8a 0%, #020617 100%)",
        "hero-gradient-light": "linear-gradient(135deg, #dbeafe 0%, #f8fafc 100%)",
        "card-gradient": "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        "shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
        "hero-pattern": `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      },

      /* =====================================================================
         ASPECT RATIOS
         ===================================================================== */
      aspectRatio: {
        "4/3": "4 / 3",
        "3/2": "3 / 2",
        "2/1": "2 / 1",
        "21/9": "21 / 9",
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("tailwindcss-animate"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@tailwindcss/typography"),
    // Custom plugin for Depo-Pro utilities
    function({ addUtilities, addComponents, theme }: any) {
      // Text utilities
      addUtilities({
        ".text-balance": {
          textWrap: "balance",
        },
        ".text-legal": {
          fontFamily: theme("fontFamily.transcript"),
          lineHeight: theme("lineHeight.legal"),
          letterSpacing: theme("letterSpacing.legal"),
        },
      });

      // Component classes
      addComponents({
        // Card variants
        ".card-elevated": {
          backgroundColor: theme("colors.white"),
          borderRadius: theme("borderRadius.xl"),
          boxShadow: theme("boxShadow.card"),
          border: `1px solid ${theme("colors.slate.200")}`,
          transition: "box-shadow 0.2s ease, transform 0.2s ease",
          "&:hover": {
            boxShadow: theme("boxShadow.card-hover"),
          },
        },
        ".card-interactive": {
          "&:hover": {
            transform: "translateY(-2px)",
          },
        },
        // Focus ring
        ".focus-ring": {
          "&:focus-visible": {
            outline: "none",
            boxShadow: theme("boxShadow.focus"),
          },
        },
        // Gradient text
        ".text-gradient": {
          backgroundImage: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
        },
      });
    },
  ],
};

export default config;
