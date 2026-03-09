import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint is run separately in dev. Skip during Vercel build to avoid
    // dependency issues with unrs-resolver on older npm environments.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type checking is done separately via tsc. Skip during build for speed.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
