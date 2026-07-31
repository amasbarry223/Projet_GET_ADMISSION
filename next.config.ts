import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone utile en Docker ; sur Vercel le builder natif suffit
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  outputFileTracingIncludes: {
    "/**": ["./prisma/**"],
  },
};

export default nextConfig;
