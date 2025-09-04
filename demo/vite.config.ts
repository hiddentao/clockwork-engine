import { defineConfig } from "vite"

export default defineConfig({
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
