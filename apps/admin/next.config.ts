import type { NextConfig } from 'next'

const apiBaseUrl = (process.env.ADMIN_API_BASE_URL?.trim() || 'http://localhost:3001').replace(
  /\/$/u,
  '',
)

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        destination: `${apiBaseUrl}/api/:path*`,
        source: '/api/:path*',
      },
    ]
  },
  transpilePackages: ['@blog/api-client', '@blog/api-types', '@blog/schemas', '@blog/ui'],
}

export default nextConfig
