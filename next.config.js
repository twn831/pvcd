/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudflarestorage.com",
      },
    ],
  },
  // Cloudflare Pages configuration
  output: "standalone",
};

module.exports = nextConfig;
