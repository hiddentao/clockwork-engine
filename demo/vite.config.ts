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
      "@engine": path.resolve(__dirname, "../packages/engine/src"),
      "@clockwork-engine/core": path.resolve(
        __dirname,
        "../packages/engine/src/index.ts",
      ),
    },
  },
})
