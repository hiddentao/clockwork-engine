#!/usr/bin/env bun
/**
 * Release script for the monorepo
 *
 * Usage:
 *   bun run scripts/release.ts              # auto version bump based on commits
 *   bun run scripts/release.ts patch        # patch release (x.x.X)
 *   bun run scripts/release.ts minor        # minor release (x.X.0)
 *   bun run scripts/release.ts major        # major release (X.0.0)
 *   bun run scripts/release.ts --dry-run    # dry run (no publish, no push)
 */

import { $ } from "bun"
import { join } from "node:path"
import * as readline from "node:readline"

const ROOT = join(import.meta.dir, "..")

type ReleaseType = "patch" | "minor" | "major" | null

function parseArgs(args: string[]): { releaseType: ReleaseType; dryRun: boolean } {
  let releaseType: ReleaseType = null
  let dryRun = false

  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true
    } else if (arg === "patch" || arg === "minor" || arg === "major") {
      releaseType = arg
    }
  }

  return { releaseType, dryRun }
}

async function run(cmd: string, description: string): Promise<void> {
  console.log(`\n▶ ${description}`)
  console.log(`  $ ${cmd}`)
  await $`cd ${ROOT} && ${{ raw: cmd }}`
}

async function promptForToken(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question("\n🔑 Enter npm token: ", (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  const args = process.argv.slice(2)
  const { releaseType, dryRun } = parseArgs(args)

  console.log("🚀 Starting release process")
  if (dryRun) {
    console.log("   (dry run mode - no publish, no push)")
  }
  if (releaseType) {
    console.log(`   Release type: ${releaseType}`)
  }

  // Step 1: Run commit-and-tag-version (bumps core version)
  const releaseAsArg = releaseType ? ` --release-as ${releaseType}` : ""
  const dryRunArg = dryRun ? " --dry-run" : ""
  await run(`commit-and-tag-version${releaseAsArg}${dryRunArg}`, "Bumping version and updating changelog")

  if (dryRun) {
    console.log("\n✓ Dry run complete. No changes were made.")
    return
  }

  // Step 2: Sync versions across all packages (now reads updated core version)
  await run("bun run scripts/run.ts sync-versions", "Syncing package versions")

  // Step 3: Stage all changes (including synced versions)
  await run("git add -A", "Staging all changes")

  // Step 4: Amend the version commit to include synced versions
  await run("git commit --amend --no-edit", "Amending commit with synced versions")

  // Step 5: Push with tags
  await run("git push --follow-tags origin main", "Pushing to origin with tags")

  // Step 6: Publish all packages
  const token = await promptForToken()
  console.log("\n▶ Publishing packages to npm")
  console.log('  $ NPM_TOKEN=*** bun run scripts/run.ts "npm publish" --exclude demo')
  await $`cd ${ROOT} && NPM_TOKEN=${token} bun run scripts/run.ts "npm publish" --exclude demo`

  console.log("\n✓ Release complete!")
}

main().catch((error) => {
  console.error("\n✗ Release failed:", error.message || error)
  process.exit(1)
})
