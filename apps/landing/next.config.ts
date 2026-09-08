import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@novahost/shared` ships raw .ts from the workspace; Next must transpile it.
  transpilePackages: ["@novahost/shared"],
};

export default nextConfig;
