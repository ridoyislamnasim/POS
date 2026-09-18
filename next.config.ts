import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tanstack/react-query", "@tanstack/query-core"],
  serverExternalPackages: [],
};

export default nextConfig;
