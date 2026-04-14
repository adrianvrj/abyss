import { fileURLToPath } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";
import tsconfigPaths from "vite-tsconfig-paths";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    tsconfigPaths(),
    mkcert(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    https: {},
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    exclude: ["@dojoengine/torii-wasm"],
  },
  ssr: {
    noExternal: [
      "@cartridge/arcade",
      "@cartridge/connector",
      "@cartridge/controller",
      "@cartridge/penpal",
      "@cartridge/presets",
      "@dojoengine/sdk",
      "@dojoengine/torii-wasm",
      "@starknet-react/chains",
      "@starknet-react/core",
    ],
  },
});
