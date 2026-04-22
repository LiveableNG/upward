import type { NextConfig } from 'next'

const isStaticExport = process.env['NEXT_OUTPUT'] === 'export'

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: 'export' as const } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

export default nextConfig
