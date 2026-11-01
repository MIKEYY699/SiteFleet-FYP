import type { NextConfig } from 'next';

const securityHeaders = [
  // Don't let other sites embed the app in an iframe (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop browsers guessing content types.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Send only the origin to other sites, never full URLs (which contain record IDs).
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app doesn't use these browser features.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  poweredByHeader: false,
  // LAN hosts allowed to open the dev server (e.g. testing on a phone). Set in .env.
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean),
  // No images.remotePatterns: the app only uses local images. Add specific hosts
  // here if remote images are ever needed, rather than allowing every domain.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
