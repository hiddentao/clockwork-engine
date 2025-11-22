/**
 * Run all benchmarks and generate a comprehensive report
 */

import { execSync } from "child_process"
import { writeFileSync } from "fs"

const BENCHMARKS = [
  "platform-overhead.bench.ts",
  "collision-detection.bench.ts",
  "serialization.bench.ts",
]

async function runAllBenchmarks() {
  console.log("=".repeat(60))
  console.log("Clockwork Engine Performance Benchmarks")
  console.log("=".repeat(60))
  console.log("")

  const results: string[] = []
  results.push("# Clockwork Engine Performance Benchmarks\n")
  results.push(`**Generated**: ${new Date().toISOString()}\n`)
  results.push(`**Platform**: ${process.platform} ${process.arch}\n`)
  results.push(`**Node**: ${process.version}\n`)
  results.push(`**Bun**: ${Bun.version}\n`)
  results.push("\n")

  for (const benchmark of BENCHMARKS) {
    console.log(`\nRunning ${benchmark}...`)
    console.log("-".repeat(60))

    try {
      const output = execSync(`bun run tests/benchmarks/${benchmark}`, {
        encoding: "utf-8",
        cwd: process.cwd(),
      })

      console.log(output)
      results.push(output)
      results.push("\n")
    } catch (error: any) {
      console.error(`Error running ${benchmark}:`, error.message)
      results.push(`\n**Error in ${benchmark}**: ${error.message}\n\n`)
    }
  }

  // Write results to file
  const reportPath = "tests/benchmarks/RESULTS.md"
  writeFileSync(reportPath, results.join("\n"))

  console.log("\n" + "=".repeat(60))
  console.log(`Benchmark report saved to: ${reportPath}`)
  console.log("=".repeat(60))
}

// Run if executed directly
if (import.meta.main) {
  runAllBenchmarks()
}
