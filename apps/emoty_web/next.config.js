const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/emo',
  assetPrefix: '/emo',
  experimental: {
    optimizePackageImports: ['bootstrap'],
    allowedDevOrigins: ['localhost:8000', '127.0.0.1:8000']
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    unoptimized: true
  },
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../..'),
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
