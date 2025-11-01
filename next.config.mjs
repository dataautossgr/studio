/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
        unoptimized: true,
    },
    experimental: {
        allowedDevOrigins: ["*.cloudworkstations.dev"],
    },
};

export default nextConfig;
