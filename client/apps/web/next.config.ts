import type { NextConfig } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://upward-api.vercel.app/api/v1'

const nextConfig: NextConfig = {
  transpilePackages: ['@upward/shared-types'],
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
