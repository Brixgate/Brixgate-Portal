// Brixgate Portal — Next.js configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output — bundles server + deps into .next/standalone for EC2 deployment.
  // Zip: .next/standalone/ + .next/static/ (→ standalone/.next/static) + public/ (→ standalone/public)
  // Run with: node .next/standalone/server.js
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        // Profile images and uploads served from the Brixgate API / storage
        protocol: 'https',
        hostname: 'api.brixgate.com',
        pathname: '/**',
      },
      {
        // Supabase storage (if assets are hosted there)
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Only allow this app to be framed by brixgate.com properties
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
