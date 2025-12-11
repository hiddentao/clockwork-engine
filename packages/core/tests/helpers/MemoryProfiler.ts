export interface MemorySnapshot {
  timestamp: number
  used: number
  total: number
  external: number
  heapUsed: number
  heapTotal: number
  rss: number
}

export interface MemoryProfileResult {
  snapshots: MemorySnapshot[]
  peakMemory: number
  memoryGrowth: number
  averageMemory: number
  hasLeaks: boolean
  leakIndicators: string[]
}

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = []
  private initialSnapshot: MemorySnapshot | null = null
  private isRunning = false

  start(): void {
    if (this.isRunning) {
      throw new Error("Memory profiler is already running")
    }

    this.isRunning = true
    this.snapshots = []
    this.takeSnapshot() // Initial snapshot
    this.initialSnapshot = this.snapshots[0]
  }

  takeSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage()
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      external: memUsage.external,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
    }

    if (this.isRunning) {
      this.snapshots.push(snapshot)
    }

    return snapshot
  }

  stop(): MemoryProfileResult {
    if (!this.isRunning) {
      throw new Error("Memory profiler is not running")
    }

    this.isRunning = false
    this.takeSnapshot() // Final snapshot

    return this.analyze()
  }

  forceGC(): void {
    if (global.gc) {
      global.gc()
    } else {
      console.warn("Garbage collection not exposed. Run with --expose-gc flag.")
    }
  }

  async profileAsync<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; profile: MemoryProfileResult }> {
    this.start()

    try {
      // Take additional snapshots during operation to ensure we have enough data
      this.takeSnapshot()

      const result = await operation()

      // Take another snapshot after operation but before GC
      this.takeSnapshot()

      // Force GC before final measurement
      this.forceGC()
      await new Promise((resolve) => setTimeout(resolve, 100)) // Wait for GC

      const profile = this.stop()
      return { result, profile }
    } catch (error) {
      if (this.isRunning) {
        this.stop()
      }
      throw error
    }
  }

  profile<T>(operation: () => T): { result: T; profile: MemoryProfileResult } {
    this.start()

    try {
      // Take additional snapshots during operation to ensure we have enough data
      this.takeSnapshot()

      const result = operation()

      // Take another snapshot after operation but before GC
      this.takeSnapshot()

      // Force GC before final measurement
      this.forceGC()

      const profile = this.stop()
      return { result, profile }
    } catch (error) {
      if (this.isRunning) {
        this.stop()
      }
      throw error
    }
  }

  private analyze(): MemoryProfileResult {
    if (this.snapshots.length < 2) {
      throw new Error("Need at least 2 snapshots to analyze memory usage")
    }

    const firstSnapshot = this.snapshots[0]
    const lastSnapshot = this.snapshots[this.snapshots.length - 1]

    const peakMemory = Math.max(...this.snapshots.map((s) => s.heapUsed))
    const memoryGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed
    const averageMemory =
      this.snapshots.reduce((sum, s) => sum + s.heapUsed, 0) /
      this.snapshots.length

    const leakIndicators = this.detectLeakIndicators()
    const hasLeaks = leakIndicators.length > 0

    return {
      snapshots: [...this.snapshots],
      peakMemory,
      memoryGrowth,
      averageMemory,
      hasLeaks,
      leakIndicators,
    }
  }

  private detectLeakIndicators(): string[] {
    const indicators: string[] = []

    if (this.snapshots.length < 3) {
      return indicators
    }

    const firstSnapshot = this.snapshots[0]
    const lastSnapshot = this.snapshots[this.snapshots.length - 1]
    const midSnapshot = this.snapshots[Math.floor(this.snapshots.length / 2)]

    // Check for consistent memory growth
    const growthThreshold = 1024 * 1024 // 1MB
    const totalGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed

    if (totalGrowth > growthThreshold) {
      const midGrowth = midSnapshot.heapUsed - firstSnapshot.heapUsed
      const lateGrowth = lastSnapshot.heapUsed - midSnapshot.heapUsed

      if (midGrowth > 0 && lateGrowth > 0) {
        indicators.push(
          `Consistent memory growth: ${this.formatBytes(totalGrowth)}`,
        )
      }
    }

    // Check for memory spikes
    const averageMemory =
      this.snapshots.reduce((sum, s) => sum + s.heapUsed, 0) /
      this.snapshots.length
    const maxMemory = Math.max(...this.snapshots.map((s) => s.heapUsed))

    if (maxMemory > averageMemory * 1.5) {
      indicators.push(
        `Memory spike detected: peak ${this.formatBytes(maxMemory)} vs average ${this.formatBytes(averageMemory)}`,
      )
    }

    // Check for external memory growth
    const externalGrowth = lastSnapshot.external - firstSnapshot.external
    if (externalGrowth > growthThreshold) {
      indicators.push(
        `External memory growth: ${this.formatBytes(externalGrowth)}`,
      )
    }

    // Check heap growth without GC
    const heapGrowth = lastSnapshot.heapTotal - firstSnapshot.heapTotal
    if (heapGrowth > growthThreshold * 2) {
      indicators.push(`Heap size growth: ${this.formatBytes(heapGrowth)}`)
    }

    return indicators
  }

  assertNoLeaks(maxGrowth = 1024 * 1024): void {
    if (!this.isRunning && this.snapshots.length >= 2) {
      const result = this.analyze()

      if (result.hasLeaks) {
        throw new Error(
          `Memory leaks detected:\n${result.leakIndicators.join("\n")}`,
        )
      }

      if (result.memoryGrowth > maxGrowth) {
        throw new Error(
          `Memory growth exceeds threshold: ${this.formatBytes(result.memoryGrowth)} > ${this.formatBytes(maxGrowth)}`,
        )
      }
    }
  }

  formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"

    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  getMemoryUsageString(snapshot: MemorySnapshot): string {
    return [
      `Heap: ${this.formatBytes(snapshot.heapUsed)}/${this.formatBytes(snapshot.heapTotal)}`,
      `External: ${this.formatBytes(snapshot.external)}`,
      `RSS: ${this.formatBytes(snapshot.rss)}`,
    ].join(", ")
  }

  logMemoryUsage(prefix = ""): void {
    const snapshot = this.takeSnapshot()
    console.log(`${prefix}Memory: ${this.getMemoryUsageString(snapshot)}`)
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots]
  }

  getCurrentMemoryUsage(): MemorySnapshot {
    return this.takeSnapshot()
  }

  clear(): void {
    this.snapshots = []
    this.initialSnapshot = null
    this.isRunning = false
  }
}
