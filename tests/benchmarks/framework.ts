/**
 * Simple benchmark framework for performance testing
 */

export interface BenchmarkResult {
  name: string
  opsPerSecond: number
  timePerOp: number
  iterations: number
  totalTime: number
}

export interface BenchmarkOptions {
  /** Minimum time to run benchmark (ms) */
  minTime?: number
  /** Maximum iterations */
  maxIterations?: number
  /** Warmup iterations before measurement */
  warmup?: number
}

const DEFAULT_OPTIONS: Required<BenchmarkOptions> = {
  minTime: 1000, // 1 second
  maxIterations: 1000000,
  warmup: 100,
}

/**
 * Run a benchmark function and measure performance
 */
export async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  options: BenchmarkOptions = {},
): Promise<BenchmarkResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Warmup phase
  for (let i = 0; i < opts.warmup; i++) {
    await fn()
  }

  // Measurement phase
  const startTime = performance.now()
  let iterations = 0
  let elapsed = 0

  while (elapsed < opts.minTime && iterations < opts.maxIterations) {
    await fn()
    iterations++
    elapsed = performance.now() - startTime
  }

  const totalTime = performance.now() - startTime
  const timePerOp = totalTime / iterations
  const opsPerSecond = (iterations / totalTime) * 1000

  return {
    name,
    opsPerSecond,
    timePerOp,
    iterations,
    totalTime,
  }
}

/**
 * Run multiple benchmarks and return results
 */
export async function suite(
  name: string,
  benchmarks: Array<{ name: string; fn: () => void | Promise<void> }>,
  options?: BenchmarkOptions,
): Promise<{
  suiteName: string
  results: BenchmarkResult[]
}> {
  const results: BenchmarkResult[] = []

  for (const bench of benchmarks) {
    const result = await benchmark(bench.name, bench.fn, options)
    results.push(result)
  }

  return {
    suiteName: name,
    results,
  }
}

/**
 * Format benchmark results as markdown table
 */
export function formatResults(results: BenchmarkResult[]): string {
  const lines = [
    "| Benchmark | Ops/sec | Time/op (ms) | Iterations | Total Time (ms) |",
    "|-----------|---------|--------------|------------|-----------------|",
  ]

  for (const result of results) {
    lines.push(
      `| ${result.name} | ${formatNumber(result.opsPerSecond)} | ${formatNumber(result.timePerOp, 6)} | ${formatNumber(result.iterations, 0)} | ${formatNumber(result.totalTime, 2)} |`,
    )
  }

  return lines.join("\n")
}

/**
 * Format suite results with title
 */
export function formatSuite(suite: {
  suiteName: string
  results: BenchmarkResult[]
}): string {
  return `## ${suite.suiteName}\n\n${formatResults(suite.results)}`
}

/**
 * Format number with commas and decimal places
 */
function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Compare two benchmark results and show percentage difference
 */
export function compare(
  baseline: BenchmarkResult,
  current: BenchmarkResult,
): {
  faster: boolean
  percentDifference: number
  message: string
} {
  const diff =
    ((current.opsPerSecond - baseline.opsPerSecond) / baseline.opsPerSecond) *
    100
  const faster = diff > 0

  const message = faster
    ? `${Math.abs(diff).toFixed(2)}% faster`
    : `${Math.abs(diff).toFixed(2)}% slower`

  return {
    faster,
    percentDifference: diff,
    message,
  }
}
