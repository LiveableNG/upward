import type { NextConfig } from 'next'

const isStaticExport = process.env['NEXT_OUTPUT'] === 'export'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://upward-dev.vercel.app/api/v1'

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: 'export' as const } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async rewrites() {
    if (isStaticExport) return []
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig

