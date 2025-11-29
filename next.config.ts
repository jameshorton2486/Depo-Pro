// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  
  // Output standalone for Docker/serverless
  output: 'standalone',
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle audio file imports
    config.module.rules.push({
      test: /\.(mp3|wav|ogg|flac|m4a)$/,
      type: 'asset/resource',
    });
    
    return config;
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
