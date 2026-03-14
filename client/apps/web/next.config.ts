import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@upward/shared-types'],
}

export default nextConfig
