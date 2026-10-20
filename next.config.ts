import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

const localAddresses = Object.values(networkInterfaces()).flatMap(addresses =>
  (addresses || []).filter(address => address.family === 'IPv4' && !address.internal).map(address => address.address),
);

const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: localAddresses,
  serverExternalPackages: ['ffmpeg-static', 'sharp', 'pg'],
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ] }, { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }];
  },
};
export default config;
