import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    /* =========================================================================
       CONTAINER
       ========================================================================= */
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },

    extend: {
      /* =========================================================================
         COLORS
         ========================================================================= */
      colors: {
        /* --- Brand Colors --- */
        brand: {
          DEFAULT: "#1e40af",           // Primary brand indigo
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },

        /* --- Accent Colors (Teal) --- */
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },

        /* --- Semantic Colors (shadcn/ui compatible) --- */
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

        /* --- Sidebar Colors --- */
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        /* --- Chart Colors --- */
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        /* --- Status Colors --- */
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
      },

      /* =========================================================================
         TYPOGRAPHY
         ========================================================================= */
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "Fira Code",
          "Consolas",
          "monospace",
        ],
        legal: [
          "Courier New",
          "Courier",
          "monospace",
        ],
      },

      fontSize: {
        "display": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
        "h1": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.025em" }],
        "h2": ["2rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
        "h3": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.02em" }],
        "h4": ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        "h5": ["1.125rem", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        "body": ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "caption": ["0.8125rem", { lineHeight: "1.5" }],
        "tiny": ["0.75rem", { lineHeight: "1.4" }],
      },

      letterSpacing: {
        "tighter": "-0.05em",
        "tight": "-0.025em",
        "normal": "0",
        "wide": "0.025em",
        "wider": "0.05em",
        "widest": "0.1em",
      },

      /* =========================================================================
         SPACING
         ========================================================================= */
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "17": "4.25rem",
        "18": "4.5rem",
        "19": "4.75rem",
        "21": "5.25rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
        "38": "9.5rem",
        "42": "10.5rem",
        "50": "12.5rem",
        "54": "13.5rem",
        "58": "14.5rem",
        "62": "15.5rem",
        "66": "16.5rem",
        "70": "17.5rem",
        "74": "18.5rem",
        "78": "19.5rem",
        "82": "20.5rem",
        "86": "21.5rem",
        "90": "22.5rem",
        "94": "23.5rem",
        "100": "25rem",
        "104": "26rem",
        "108": "27rem",
        "112": "28rem",
        "116": "29rem",
        "120": "30rem",
      },

      /* =========================================================================
         MAX WIDTH
         ========================================================================= */
      maxWidth: {
        "8xl": "90rem",    // 1440px
        "9xl": "100rem",   // 1600px
        "content": "65ch", // Optimal reading width
      },

      /* =========================================================================
         BORDER RADIUS
         ========================================================================= */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "4xl": "2rem",
      },

      /* =========================================================================
         BOX SHADOW
         ========================================================================= */
      boxShadow: {
        "soft": "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "soft-md": "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "soft-lg": "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
        "soft-xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.05)",
        "glow": "0 0 20px -5px hsl(var(--primary) / 0.5)",
        "glow-lg": "0 0 40px -10px hsl(var(--primary) / 0.4)",
        "inner-soft": "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
      },

      /* =========================================================================
         BACKGROUND IMAGE / GRADIENTS
         ========================================================================= */
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)",
        "hero-gradient-light": "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
        "hero-radial": "radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 100%)",
        "cta-gradient": "linear-gradient(135deg, #1e40af 0%, #0f766e 100%)",
        "surface-gradient": "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        "card-gradient": "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(248,250,252,1) 100%)",
        "shimmer": "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
      },

      /* =========================================================================
         ANIMATIONS
         ========================================================================= */
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.3s ease-out",
        "fade-in-down": "fade-in-down 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
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
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },

      /* =========================================================================
         TRANSITIONS
         ========================================================================= */
      transitionDuration: {
        "0": "0ms",
        "50": "50ms",
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "250": "250ms",
        "300": "300ms",
        "400": "400ms",
        "500": "500ms",
      },

      transitionTimingFunction: {
        "in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
        "in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
      },

      /* =========================================================================
         Z-INDEX
         ========================================================================= */
      zIndex: {
        "60": "60",
        "70": "70",
        "80": "80",
        "90": "90",
        "100": "100",
        "dropdown": "1000",
        "sticky": "1020",
        "fixed": "1030",
        "modal-backdrop": "1040",
        "modal": "1050",
        "popover": "1060",
        "tooltip": "1070",
        "toast": "1080",
      },

      /* =========================================================================
         ASPECT RATIO
         ========================================================================= */
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
  ],
};

export default config;
