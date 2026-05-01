import type { NextConfig } from 'next'

const isStaticExport = process.env['NEXT_OUTPUT'] === 'export'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://upward-dev.vercel.app/api/v1'

const nextConfig: NextConfig = {
  assetPrefix: (process.env.NODE_ENV === 'production' && !isStaticExport) ? '/_upward_pay' : undefined,
  ...(isStaticExport ? { output: 'export' as const } : {}),
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
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

