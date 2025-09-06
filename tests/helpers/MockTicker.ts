export class MockTicker {
  private callbacks: ((deltaFrames: number) => Promise<void> | void)[] = []
  private frameCount: number = 0

  add(callback: (deltaFrames: number) => Promise<void> | void): void {
    this.callbacks.push(callback)
  }

  remove(callback: (deltaFrames: number) => Promise<void> | void): void {
    const index = this.callbacks.indexOf(callback)
    if (index >= 0) {
      this.callbacks.splice(index, 1)
    }
  }

  async tick(deltaFrames: number = 1): Promise<void> {
    for (const callback of this.callbacks) {
      await callback(deltaFrames)
    }
    this.frameCount += deltaFrames
  }

  async runFrames(
    totalFrames: number,
    deltaFramesPerTick: number = 1,
  ): Promise<void> {
    let remaining = totalFrames
    while (remaining > 0) {
      const framesToRun = Math.min(deltaFramesPerTick, remaining)
      await this.tick(framesToRun)
      remaining -= framesToRun
    }
  }

  async runWithDeltaSequence(deltaFrames: number[]): Promise<void> {
    for (const delta of deltaFrames) {
      await this.tick(delta)
    }
  }

  getFrameCount(): number {
    return this.frameCount
  }

  reset(): void {
    this.frameCount = 0
    this.callbacks = []
  }

  clear(): void {
    this.callbacks = []
  }
}
