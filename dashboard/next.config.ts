import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
