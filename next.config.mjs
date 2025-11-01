/** @type {import('next').NextConfig} */
const nextConfig = {
  // The 'output: export' was causing issues with dynamic routes in Electron.
  // By removing it, we revert to Next.js's standard server-based rendering,
  // which handles dynamic pages correctly without needing generateStaticParams.
  // Electron will now load the app from the Next.js development server.
};

export default nextConfig;
