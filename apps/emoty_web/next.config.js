/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  basePath: '/emo',
  assetPrefix: '/emo',
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    optimizePackageImports: ['bootstrap']
  },
  // Allow the Django proxy host to fetch Next.js dev-only resources (fonts, HMR).
  // Needed because the suite is browsed via 127.0.0.1, which isn't allow-listed
  // by default. Dev-only key — ignored by `next build` / production.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost'
      },
      {
        protocol: 'https',
        hostname: 'localhost'
      }
    ],
    formats: ['image/webp', 'image/avif'],
    unoptimized: true
  },
  output: 'standalone',
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        }
      ]
    }
  ]
}
module.exports = nextConfig
