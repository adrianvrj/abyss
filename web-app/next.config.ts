import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/patch-notes/items",
        destination: "/patch-notes/1",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'play.abyssgame.fun',
    }],
  },
  reactCompiler: true,
  // Empty turbopack config to silence the webpack warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    config.output = {
      ...config.output,
      webassemblyModuleFilename: isServer
        ? "./../static/wasm/[modulehash].wasm"
        : "static/wasm/[modulehash].wasm",
    };
    return config;
  },
};

export default nextConfig;
