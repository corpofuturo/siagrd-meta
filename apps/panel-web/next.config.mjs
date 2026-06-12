/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@siagrd/ui'],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
