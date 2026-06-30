import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js to compile our shared TS package (it ships raw TypeScript)
  transpilePackages: ["@bookflow/db"],
};

export default nextConfig;