/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Handle rewrites for proper routing behind proxy
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
