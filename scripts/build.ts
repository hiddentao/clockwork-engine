#!/usr/bin/env bun
/**
 * Unified Build Script
 *
 * Builds the clockwork-engine for both Node.js and browser environments:
 * 1. TypeScript compilation (for Node.js/NPM)
 * 2. Browser bundles (development + production)
 */

import * as path from "path"
import { $ } from "bun"

const ROOT_DIR = path.resolve(import.meta.dir, "..")
const DIST_DIR = path.join(ROOT_DIR, "dist")

console.log("🏗️  Building clockwork-engine...\n")

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
  naming: "clockwork-engine.js",
  target: "browser",
  format: "esm",
  minify: false,
  sourcemap: "external",
  splitting: false,
})

if (!devBuild.success) {
  console.error("❌ Development bundle failed:")
  for (const log of devBuild.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log("   ✅ clockwork-engine.js")
console.log("   ✅ clockwork-engine.js.map")

// Production Bundle (minified, with sourcemap)
console.log("   🗜️  Building production bundle...")
const prodBuild = await Bun.build({
  entrypoints: [entrypoint],
  outdir: DIST_DIR,
  naming: "clockwork-engine.min.js",
  target: "browser",
  format: "esm",
  minify: true,
  sourcemap: "external",
  splitting: false,
})

if (!prodBuild.success) {
  console.error("❌ Production bundle failed:")
  for (const log of prodBuild.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log("   ✅ clockwork-engine.min.js")
console.log("   ✅ clockwork-engine.min.js.map")

// Show bundle sizes
console.log("\n📊 Bundle sizes:")
const devStats = await Bun.file(
  path.join(DIST_DIR, "clockwork-engine.js"),
).stat()
const prodStats = await Bun.file(
  path.join(DIST_DIR, "clockwork-engine.min.js"),
).stat()

console.log(`   Development: ${(devStats.size / 1024).toFixed(1)} KB`)
console.log(`   Production:  ${(prodStats.size / 1024).toFixed(1)} KB`)
console.log(
  `   Reduction:   ${(100 - (prodStats.size / devStats.size) * 100).toFixed(1)}%`,
)

console.log("\n✨ Build complete!")
