#!/usr/bin/env bun
/**
 * Build Script for @clockwork-engine/platform-memory
 *
 * Builds the package for both Node.js and browser environments:
 * 1. TypeScript compilation (for Node.js/NPM)
 * 2. Browser bundles (development + production)
 */

import * as path from "path"
import { $ } from "bun"

const ROOT_DIR = path.resolve(import.meta.dir, "..")
const DIST_DIR = path.join(ROOT_DIR, "dist")

console.log("🏗️  Building @clockwork-engine/platform-memory...\n")

// Step 1: Clean
console.log("🧹 Cleaning dist/...")
await $`rm -rf ${DIST_DIR}`
await $`rm -f ${path.join(ROOT_DIR, "tsconfig.tsbuildinfo")}`

// Step 2: TypeScript Compilation
console.log("📦 Compiling TypeScript...")
await $`tsc`
console.log("✅ TypeScript compilation complete\n")

// Step 3: Browser Bundles
console.log("🌐 Creating browser bundles...")

const entrypoint = path.join(ROOT_DIR, "src", "index.ts")

// Development Bundle (readable, with sourcemap)
console.log("   📝 Building development bundle...")
const devBuild = await Bun.build({
  entrypoints: [entrypoint],
  outdir: DIST_DIR,
  naming: "platform-memory.js",
  target: "browser",
  format: "esm",
  minify: false,
  sourcemap: "external",
})

if (!devBuild.success) {
  console.error("❌ Development bundle failed:")
  for (const log of devBuild.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log("   ✅ platform-memory.js")
console.log("   ✅ platform-memory.js.map")

// Production Bundle (minified, with sourcemap)
console.log("   🗜️  Building production bundle...")
const prodBuild = await Bun.build({
  entrypoints: [entrypoint],
  outdir: DIST_DIR,
  naming: "platform-memory.min.js",
  target: "browser",
  format: "esm",
  minify: true,
  sourcemap: "external",
})

if (!prodBuild.success) {
  console.error("❌ Production bundle failed:")
  for (const log of prodBuild.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log("   ✅ platform-memory.min.js")
console.log("   ✅ platform-memory.min.js.map")

// Show bundle sizes
console.log("\n📊 Bundle sizes:")
const devStats = await Bun.file(
  path.join(DIST_DIR, "platform-memory.js"),
).stat()
const prodStats = await Bun.file(
  path.join(DIST_DIR, "platform-memory.min.js"),
).stat()

console.log(`   Development: ${(devStats.size / 1024).toFixed(1)} KB`)
console.log(`   Production:  ${(prodStats.size / 1024).toFixed(1)} KB`)
console.log(
  `   Reduction:   ${(100 - (prodStats.size / devStats.size) * 100).toFixed(1)}%`,
)

console.log("\n✨ Build complete!")
