// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Use standalone output to prevent Windows FS rename bug for error pages
  output: 'standalone',

  // Note: NEXT_PUBLIC_* variables are automatically exposed to the client
  // No need to explicitly list them in env: {} - Next.js handles this automatically

  // Experimental optimizations
  experimental: {
    optimizePackageImports: [],
  },

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

  // Security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;


