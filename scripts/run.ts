#!/usr/bin/env bun
/**
 * Monorepo package runner utility
 *
 * Usage:
 *   bun run scripts/run.ts <command> [options]
 *
 * Commands:
 *   <script>              Run npm script in each package (e.g., build, lint)
 *   "<shell command>"     Run arbitrary shell command in each package
 *   sync-versions         Sync all package versions to match core
 *
 * Options:
 *   --include, -i <pkgs>  Only run on specified packages (space-separated)
 *   --exclude, -e <pkgs>  Skip specified packages (space-separated)
 *
 * Examples:
 *   bun run scripts/run.ts build --exclude demo
 *   bun run scripts/run.ts "bun publish" --exclude demo
 *   bun run scripts/run.ts sync-versions
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { $ } from "bun"

const ROOT = join(import.meta.dir, "..")

interface PackageInfo {
  name: string
  path: string
  packageJson: any
}

function getPackages(): PackageInfo[] {
  const packages: PackageInfo[] = []

  const packagesDir = join(ROOT, "packages")
  if (existsSync(packagesDir)) {
    for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
      if (dir.isDirectory()) {
        const pkgPath = join(packagesDir, dir.name)
        const pkgJsonPath = join(pkgPath, "package.json")
        if (existsSync(pkgJsonPath)) {
          packages.push({
            name: dir.name,
            path: pkgPath,
            packageJson: JSON.parse(readFileSync(pkgJsonPath, "utf-8")),
          })
        }
      }
    }
  }

  const demoPath = join(ROOT, "demo")
  const demoPkgJsonPath = join(demoPath, "package.json")
  if (existsSync(demoPkgJsonPath)) {
    packages.push({
      name: "demo",
      path: demoPath,
      packageJson: JSON.parse(readFileSync(demoPkgJsonPath, "utf-8")),
    })
  }

  // Sort packages: core first (other packages depend on it), then alphabetically
  return packages.sort((a, b) => {
    if (a.name === "core") return -1
    if (b.name === "core") return 1
    return a.name.localeCompare(b.name)
  })
}

function parseArgs(args: string[]): {
  command: string
  include: string[]
  exclude: string[]
} {
  const result = { command: "", include: [] as string[], exclude: [] as string[] }
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (arg === "--include" || arg === "-i") {
      i++
      while (i < args.length && !args[i].startsWith("-")) {
        result.include.push(args[i])
        i++
      }
    } else if (arg === "--exclude" || arg === "-e") {
      i++
      while (i < args.length && !args[i].startsWith("-")) {
        result.exclude.push(args[i])
        i++
      }
    } else if (!result.command) {
      result.command = arg
      i++
    } else {
      i++
    }
  }

  return result
}

function filterPackages(
  packages: PackageInfo[],
  include: string[],
  exclude: string[],
): PackageInfo[] {
  let filtered = packages

  if (include.length > 0) {
    filtered = filtered.filter((pkg) => include.includes(pkg.name))
  }

  if (exclude.length > 0) {
    filtered = filtered.filter((pkg) => !exclude.includes(pkg.name))
  }

  return filtered
}

async function runCommand(pkg: PackageInfo, command: string): Promise<boolean> {
  console.log(`\n📦 ${pkg.name}`)
  console.log(`   Running: ${command}`)

  try {
    const hasScript = pkg.packageJson.scripts?.[command]

    if (hasScript) {
      await $`bun run --cwd ${pkg.path} ${command}`.quiet()
    } else {
      await $`cd ${pkg.path} && ${command}`.quiet()
    }

    console.log(`   ✓ Success`)
    return true
  } catch (error: any) {
    console.error(`   ✗ Failed: ${error.message || error}`)
    return false
  }
}

async function syncVersions(packages: PackageInfo[]): Promise<boolean> {
  const corePackage = packages.find((pkg) => pkg.name === "core")
  if (!corePackage) {
    console.error("Error: core package not found")
    return false
  }

  const version = corePackage.packageJson.version
  console.log(`\n🔄 Syncing all packages to version ${version}`)

  for (const pkg of packages) {
    if (pkg.name === "demo") continue

    const pkgJsonPath = join(pkg.path, "package.json")
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"))

    if (pkgJson.version !== version) {
      console.log(`   ${pkg.name}: ${pkgJson.version} → ${version}`)
      pkgJson.version = version
      writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n")
    } else {
      console.log(`   ${pkg.name}: already at ${version}`)
    }
  }

  console.log(`\n✓ Version sync complete`)
  return true
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log("Usage: bun run scripts/run.ts <command> [--include|-i <pkgs>] [--exclude|-e <pkgs>]")
    console.log("\nCommands:")
    console.log("  <script>           Run npm script in each package")
    console.log('  "<shell command>"  Run arbitrary shell command')
    console.log("  sync-versions      Sync all package versions to match core")
    process.exit(1)
  }

  const { command, include, exclude } = parseArgs(args)
  const allPackages = getPackages()
  const packages = filterPackages(allPackages, include, exclude)

  if (packages.length === 0) {
    console.log("No packages matched the filter criteria")
    process.exit(0)
  }

  console.log(`Running "${command}" on ${packages.length} package(s): ${packages.map((p) => p.name).join(", ")}`)

  if (command === "sync-versions") {
    const success = await syncVersions(allPackages)
    process.exit(success ? 0 : 1)
  }

  let allSuccess = true
  for (const pkg of packages) {
    const success = await runCommand(pkg, command)
    if (!success) {
      allSuccess = false
      break
    }
  }

  process.exit(allSuccess ? 0 : 1)
}

main()
