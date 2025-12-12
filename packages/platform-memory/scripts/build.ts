#!/usr/bin/env bun
/**
 * Build Script for @clockwork-engine/platform-memory
 *
 * Simple TypeScript compilation for the headless memory platform.
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

console.log("✨ Build complete!")
