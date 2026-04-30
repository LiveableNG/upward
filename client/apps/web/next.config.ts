import type { NextConfig } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://upward-pay.vercel.app'

const nextConfig: NextConfig = {
  transpilePackages: ['@upward/shared-types'],
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/login',
        destination: `${APP_URL}/login`,
      },
      {
        source: '/signup',
        destination: `${APP_URL}/signup`,
      },
      {
        source: '/dashboard/:path*',
        destination: `${APP_URL}/dashboard/:path*`,
      },
      {
        source: '/profile/:path*',
        destination: `${APP_URL}/profile/:path*`,
      },
      {
        source: '/pay/:path*',
        destination: `${APP_URL}/pay/:path*`,
      },
      {
        source: '/invite/:path*',
        destination: `${APP_URL}/invite/:path*`,
      },
      {
        source: '/complete-profile/:path*',
        destination: `${APP_URL}/complete-profile/:path*`,
      },
      {
        source: '/forgot-password',
        destination: `${APP_URL}/forgot-password`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${APP_URL}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
