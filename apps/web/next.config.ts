import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@magz/core", "@magz/database"],
  serverExternalPackages: ["@prisma/client", "bcryptjs"]
};

export default nextConfig;
