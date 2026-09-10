import path from "node:path";
import type { NextConfig } from "next";

const reactQuery = path.resolve(process.cwd(), "node_modules/@tanstack/react-query");
const queryCore = path.resolve(process.cwd(), "node_modules/@tanstack/query-core");

const nextConfig: NextConfig = {
  transpilePackages: ["@tanstack/react-query", "@tanstack/query-core"],
  serverExternalPackages: [],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tanstack/react-query": reactQuery,
      "@tanstack/query-core": queryCore,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      "@tanstack/react-query": reactQuery,
      "@tanstack/query-core": queryCore,
    },
  },
};

export default nextConfig;
