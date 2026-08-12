import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@blog/api-client', '@blog/api-types', '@blog/ui'],
}

export default nextConfig
