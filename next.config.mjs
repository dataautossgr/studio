/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  // This is a workaround for the `generateStaticParams` error in Electron.
  // It tells Next.js not to fail the build if `generateStaticParams` is missing.
  // The pages will be rendered on the client side.
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Adding a fallback for dynamic routes.
  // This helps with client-side routing in a static export.
  trailingSlash: true,
};

export default nextConfig;
