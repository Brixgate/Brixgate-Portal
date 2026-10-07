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
        protocol: 'https',
        hostname: 'api.brixgate.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dev.api.brixgate.com',
        pathname: '/**',
      },
      {
        // Supabase storage
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
      {
        // Any other Supabase storage patterns
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
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
