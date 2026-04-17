import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/",
        destination: "/cutting-mat",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
