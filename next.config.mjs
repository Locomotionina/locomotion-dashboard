/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['43.163.113.38', 'localhost', '127.0.0.1'],
    },
  },
};

export default nextConfig;
