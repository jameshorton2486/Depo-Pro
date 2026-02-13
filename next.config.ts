// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel handles output mode automatically - standalone causes build issues in Next.js 15.0.7
  // output: 'standalone', // Commented out for Vercel deployment

  // Note: NEXT_PUBLIC_* variables are automatically exposed to the client
  // No need to explicitly list them in env: {} - Next.js handles this automatically

  // Experimental optimizations
  experimental: {
    optimizePackageImports: [],
  },

  // Turbopack configuration (Next.js 16+)
  turbopack: {},

    // Prevent Windows FS rename bug for error pages
  generateBuildId: async () => {
    return 'windows-build';
  },

  // Server-side only packages (not bundled for client)
  serverExternalPackages: [
    'bcrypt',
    'ioredis',
    'bullmq',
    '@dolbyio/media-apis', // Optional - may not be installed
    '@ffmpeg-installer/ffmpeg',
    'fluent-ffmpeg',
  ],

  // Webpack configuration
  webpack: (config, { isServer: _isServer }) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });

    // Ignore missing optional dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@dolbyio/media-apis': false,
    };

    return config;
  },

  // Production optimizations
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Security headers (Security Audit D.10)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.deepgram.com https://api.anthropic.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;


