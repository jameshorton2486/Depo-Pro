// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // DO NOT use output: 'standalone' — Vercel handles output mode automatically.
  // DO NOT use generateBuildId — the 'windows-build' hack breaks Vercel's cache.

  // Note: NEXT_PUBLIC_* variables are automatically exposed to the client
  // No need to explicitly list them in env: {} - Next.js handles this automatically

  // Experimental optimizations
  experimental: {
    optimizePackageImports: [],
    serverActions: {
      bodySizeLimit: '2gb',
    },
  },

  // Turbopack configuration (Next.js 16+)
  turbopack: {},

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
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.live https://*.vercel-scripts.com`,
      `script-src-elem 'self' 'unsafe-inline' https://vercel.live https://*.vercel.live https://*.vercel-scripts.com`,
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live wss://ws-us3.pusher.com https://*.pusher.com`,
      `style-src 'self' 'unsafe-inline' https://vercel.live`,
      `img-src 'self' data: blob: https://*.supabase.co https://vercel.live`,
      `frame-src 'self' https://vercel.live`,
      `font-src 'self' data: https://vercel.live`,
      `media-src 'self' blob: https://*.supabase.co`,
      `worker-src 'self' blob:`,
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
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

