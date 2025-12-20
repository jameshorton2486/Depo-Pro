// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcrypt'],

  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  turbopack: {},

  // Webpack configuration (fallback for non-Turbopack builds)
  webpack: (config, { isServer: _isServer }) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    return config;
  },
};

export default nextConfig;
