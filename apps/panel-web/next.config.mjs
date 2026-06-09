/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@siagrd/ui'],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
