import type { NextConfig } from "next";

function supabaseImagePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    return [
      {
        protocol: "https" as const,
        hostname: new URL(url).hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Standalone utile en Docker ; sur Vercel le builder natif suffit
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  outputFileTracingIncludes: {
    "/**": ["./prisma/**"],
  },
  images: {
    // Logos partenaires souvent en SVG — l'optimizer renvoie 400 sans ceci
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [...supabaseImagePattern()],
  },
};

export default nextConfig;
