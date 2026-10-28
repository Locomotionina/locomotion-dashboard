/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable x-powered-by header for security hardening
  poweredByHeader: false,

  // Mengizinkan cross-origin requests saat mode dev dari jaringan lokal (LAN) maupun IP publik
  allowedDevOrigins: [
    '43.163.113.38',
    '43.163.113.38:3000',
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    '10.3.0.9',
    '10.3.0.9:3000',
    '172.17.0.1',
    '172.17.0.1:3000',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        '43.163.113.38',
        '43.163.113.38:3000',
        'localhost',
        'localhost:3000',
        '127.0.0.1',
        '127.0.0.1:3000',
        '10.3.0.9',
        '10.3.0.9:3000',
        '172.17.0.1',
        '172.17.0.1:3000',
        '*.vercel.app',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
