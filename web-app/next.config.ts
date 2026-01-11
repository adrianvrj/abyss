import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'play.abyssgame.fun',
    }],

  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
