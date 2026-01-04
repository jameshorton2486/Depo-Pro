// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Server-side only packages (not bundled for client)
  serverExternalPackages: [
    'bcrypt',
    'ioredis',
    'bullmq',
    '@dolbyio/media-apis', // Optional - may not be installed
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
