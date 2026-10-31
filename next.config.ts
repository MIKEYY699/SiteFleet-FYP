import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.18.217'],
  // No images.remotePatterns: the app only uses local images. Add specific hosts
  // here if remote images are ever needed, rather than allowing every domain.
};

export default nextConfig;