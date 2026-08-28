import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Per Capacitor: genera file statici in /out
  // Commenta 'output: "export"' per il dev server normale
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true, // Necessario per static export
  },
};

export default nextConfig;
