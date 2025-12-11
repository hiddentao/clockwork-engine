export class MockTicker {
  private callbacks: ((deltaTicks: number) => Promise<void> | void)[] = []
  private tickCount: number = 0

  add(callback: (deltaTicks: number) => Promise<void> | void): void {
    this.callbacks.push(callback)
  }

  remove(callback: (deltaTicks: number) => Promise<void> | void): void {
    const index = this.callbacks.indexOf(callback)
    if (index >= 0) {
      this.callbacks.splice(index, 1)
    }
  }

  async tick(deltaTicks: number = 1): Promise<void> {
    for (const callback of this.callbacks) {
      await callback(deltaTicks)
    }
    this.tickCount += deltaTicks
  }

  async runTicks(
    totalTicks: number,
    deltaTicksPerTick: number = 1,
  ): Promise<void> {
    let remaining = totalTicks
    while (remaining > 0) {
      const ticksToRun = Math.min(deltaTicksPerTick, remaining)
      await this.tick(ticksToRun)
      remaining -= ticksToRun
    }
  }

  // Legacy method for backwards compatibility
  async runFrames(
    totalTicks: number,
    deltaTicksPerTick: number = 1,
  ): Promise<void> {
    return this.runTicks(totalTicks, deltaTicksPerTick)
  }

  async runWithDeltaSequence(deltaTicks: number[]): Promise<void> {
    for (const delta of deltaTicks) {
      await this.tick(delta)
    }
  }

  getTickCount(): number {
    return this.tickCount
  }

  // Legacy method for backwards compatibility
  getFrameCount(): number {
    return this.tickCount
  }

  reset(): void {
    this.tickCount = 0
    this.callbacks = []
  }

  clear(): void {
    this.callbacks = []
  }
}
