import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Gives `next dev` the same D1 / R2 bindings as Cloudflare (local copies in .wrangler/).
initOpenNextCloudflareForDev();

const dev = process.env.NODE_ENV !== 'production';

// Next.js needs inline scripts (and eval in dev). A nonce-based policy is the
// next step once we move to the hosted build.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  `connect-src 'self'${dev ? ' ws:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: { unoptimized: true },
  // Keep Prisma's CLI, dev tools and other databases' engines out of the
  // Cloudflare bundle: the app only needs the generated SQLite (D1) client.
  outputFileTracingExcludes: {
    '*': [
      'node_modules/prisma/**',
      'node_modules/@prisma/dev/**',
      'node_modules/@prisma/engines/**',
      'node_modules/@electric-sql/**',
      'node_modules/@prisma/client/runtime/*.wasm',
      'node_modules/@prisma/client/runtime/*.wasm-base64.*',
      // Not used: Next's social-image renderer (fonts, resvg, yoga).
      'node_modules/next/dist/compiled/@vercel/og/**',
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
