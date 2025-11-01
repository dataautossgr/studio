/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // This is a workaround for the error:
  // "Page "/sales/invoice/[id]/page" is missing "generateStaticParams()", which is required with "output: export" config."
  // By setting dynamic aPI to "force-static", we are telling Next.js to not try to generate
  // static pages for dynamic routes at build time.
  // Instead, they will be rendered on the client side.
  // This is the desired behavior for our app.
  // See: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic
  dynamic: 'force-static',
  
  // The following is needed to disable the warning about the above config.
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
