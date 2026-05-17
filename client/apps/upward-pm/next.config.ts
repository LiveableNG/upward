import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: (process.env.NODE_ENV === 'production') ? '/_upward_pm' : undefined,
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    // Only rewrite if it's an absolute URL (not already proxied or relative)
    if (apiUrl.startsWith('http')) {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${apiUrl}/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
