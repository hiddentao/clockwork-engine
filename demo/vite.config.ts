import path from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  base: "./",
  plugins: [],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      "@engine": path.resolve(__dirname, "../packages/core/src"),
      "@clockwork-engine/core": path.resolve(
        __dirname,
        "../packages/core/src/index.ts",
      ),
      "@clockwork-engine/platform-memory": path.resolve(
        __dirname,
        "../packages/platform-memory/src/index.ts",
      ),
      "@clockwork-engine/platform-web-pixi": path.resolve(
        __dirname,
        "../packages/platform-web-pixi/src/index.ts",
      ),
    },
  },
})
