import { defineConfig } from "vite"

export default defineConfig({
  base: "./",
  plugins: [],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      "@engine": "../src",
    },
  },
})
