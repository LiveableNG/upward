import type { NextConfig } from 'next'

const isStaticExport = process.env['NEXT_OUTPUT'] === 'export'

const nextConfig: NextConfig = {
  // Production only: gateway proxies /_upward_pm/* to this app.
  assetPrefix: process.env.NODE_ENV === 'production' && !isStaticExport ? '/_upward_pm' : undefined,
  ...(isStaticExport ? { output: 'export' as const } : {}),
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (isStaticExport) return []
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
    const rules: { source: string; destination: string }[] = []

    if (apiUrl.startsWith('http')) {
      rules.push({
        source: '/api/v1/:path*',
        destination: `${apiUrl}/:path*`,
      })
    }
    
    // Gateway-style aliases
    rules.push({ source: '/pm-login', destination: '/login' })
    rules.push({ source: '/pm-signup', destination: '/signup' })
    rules.push({ source: '/pm-forgot-password', destination: '/forgot-password' })

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
