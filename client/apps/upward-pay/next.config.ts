import type { NextConfig } from 'next'

const isStaticExport = process.env['NEXT_OUTPUT'] === 'export'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://upward-api.vercel.app/api/v1'
const PM_URL = process.env.NEXT_PUBLIC_PM_URL || 'http://localhost:3002'

const nextConfig: NextConfig = {
  // Production only: gateway (localhost:3000 / Vercel) proxies /_upward_pay/* to this app.
  // In dev, access pay directly on :3001 with standard /_next/* asset paths.
  assetPrefix:
    process.env.NODE_ENV === 'production' && !isStaticExport ? '/_upward_pay' : undefined,
  ...(isStaticExport ? { output: 'export' as const } : {}),
  images: {
    unoptimized: true,
  },
  async headers() {
    const devNoStore =
      process.env.NODE_ENV !== 'production'
        ? [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }]
        : []

    return [
      {
        source: '/_next/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }, ...devNoStore],
      },
      {
        source: '/_upward_pay/_next/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }, ...devNoStore],
      },
    ]
  },
  async rewrites() {
    if (isStaticExport) return []
    const rules: { source: string; destination: string }[] = [
      {
        source: '/api/v1/:path*',
        destination: `${API_URL}/:path*`,
      },
    ]
    // Dev fallback: tolerate stale/cached HTML that still references prefixed asset URLs
    if (process.env.NODE_ENV !== 'production') {
      rules.push({
        source: '/_upward_pay/_next/:path*',
        destination: '/_next/:path*',
      })
    }
    return rules
  },
  async redirects() {
    if (isStaticExport) return []
    return [
      {
        source: '/pm-login',
        destination: `${PM_URL}/pm-login`,
        permanent: false,
      },
      {
        source: '/pm-signup',
        destination: `${PM_URL}/pm-signup`,
        permanent: false,
      },
    ]
  },
}

export default nextConfig
