
/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline.html',
  },
});

const nextConfig = {
  output: 'export',
  // Your existing Next.js config options here
  // For example:
  // images: {
  //   unoptimized: true,
  // },
};

export default pwaConfig(nextConfig);
