import type { NextConfig } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://upward-dev.vercel.app'

const nextConfig: NextConfig = {
  transpilePackages: ['@upward/shared-types'],
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${APP_URL}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
