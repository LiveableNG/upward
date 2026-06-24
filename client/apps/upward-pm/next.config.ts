import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Production only: gateway proxies /_upward_pm/* to this app.
  assetPrefix: process.env.NODE_ENV === 'production' ? '/_upward_pm' : undefined,
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
    const rules: { source: string; destination: string }[] = []

    if (apiUrl.startsWith('http')) {
      rules.push({
        source: '/api/v1/:path*',
        destination: `${apiUrl}/:path*`,
      })
    }

    // Dev fallback: tolerate stale/cached HTML that still references prefixed asset URLs
    if (process.env.NODE_ENV !== 'production') {
      rules.push({
        source: '/_upward_pm/_next/:path*',
        destination: '/_next/:path*',
      })
    }

    return rules
  },
}

export default nextConfig
