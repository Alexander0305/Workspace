import type { NextConfig } from "next";

/**
 * Bundle Analysis
 * ───────────────
 * To analyze the production bundle, install @next/bundle-analyzer and run:
 *
 *   npm install -D @next/bundle-analyzer
 *   ANALYZE=true bun run build
 *
 * Then wrap the config:
 *   const withBundleAnalyzer = require('@next/bundle-analyzer')({
 *     enabled: process.env.ANALYZE === 'true',
 *   })
 *   export default withBundleAnalyzer(nextConfig)
 *
 * Note: Since this file uses TypeScript/ESM, you'll need to use dynamic
 * import or switch to next.config.mjs for the require() syntax.
 */

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:; font-src 'self' https:; frame-ancestors 'none';" },
]

const nextConfig: NextConfig = {
  // Only use standalone output for production builds
  ...(process.env.NODE_ENV === 'production' ? { output: "standalone" as const } : {}),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
