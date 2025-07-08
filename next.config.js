const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Properly handle static assets
  poweredByHeader: false,
  reactStrictMode: true,
  // swcMinify is deprecated in Next.js 15
  // swcMinify: true,
  output: 'standalone',
  // Configure asset loading - uncomment if needed for localhost
  // assetPrefix: process.env.NODE_ENV === 'development' ? 'http://localhost:3003' : undefined,
  // Remove distDir if you're deploying to a hosting service that expects the .next folder
  // distDir: '.next',
  // Ignore ESLint errors during build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Same for TypeScript errors
    ignoreBuildErrors: true,
  },
}

module.exports = withBundleAnalyzer(nextConfig)
