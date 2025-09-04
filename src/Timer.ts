import type { IGameLoop } from "./IGameLoop"

interface TimerCallback {
  id: string
  callback: () => Promise<void>
  targetFrame: number
  interval?: number // For repeating timers
  isActive: boolean
}

export class Timer implements IGameLoop {
  private timers: Map<string, TimerCallback> = new Map()
  private nextId: number = 0
  private currentFrame: number = 0

  /**
   * Schedule a one-time callback to execute after the specified number of frames
   * @param callback Async callback to execute
   * @param frames Number of frames to wait before execution
   * @returns Timer ID that can be used to cancel the timer
   */
  setTimeout(callback: () => Promise<void>, frames: number): string {
    const id = `timer_${this.nextId++}`
    this.timers.set(id, {
      id,
      callback,
      targetFrame: this.currentFrame + frames,
      isActive: true,
    })
    return id
  }

  /**
   * Schedule a repeating callback to execute every specified number of frames
   * @param callback Async callback to execute
   * @param frames Number of frames between executions
   * @returns Timer ID that can be used to cancel the timer
   */
  setInterval(callback: () => Promise<void>, frames: number): string {
    const id = `timer_${this.nextId++}`
    this.timers.set(id, {
      id,
      callback,
      targetFrame: this.currentFrame + frames,
      interval: frames,
      isActive: true,
    })
    return id
  }

  /**
   * Cancel a timer
   * @param id Timer ID returned from setTimeout or setInterval
   * @returns True if timer was found and cancelled
   */
  clearTimer(id: string): boolean {
    return this.timers.delete(id)
  }

  /**
   * Update the timer system - called by GameEngine
   * Executes all ready timers in parallel with proper error handling
   */
  async update(_deltaFrames: number, totalFrames: number): Promise<void> {
    this.currentFrame = totalFrames

    const readyTimers: TimerCallback[] = []

    // Collect all timers ready for execution
    for (const timer of this.timers.values()) {
      if (timer.isActive && this.currentFrame >= timer.targetFrame) {
        readyTimers.push(timer)
      }
    }

    // Execute all ready timers in parallel with error handling
    if (readyTimers.length > 0) {
      const promises = readyTimers.map(async (timer) => {
        try {
          await timer.callback()
        } catch (error) {
          console.error(`Timer ${timer.id} failed:`, error)
          // Don't rethrow - we don't want one timer failure to break others
        }
      })

      // Wait for all timers to complete
      await Promise.all(promises)

      // Reschedule or remove timers after execution
      for (const timer of readyTimers) {
        if (timer.interval && timer.isActive) {
          // Reschedule repeating timer
          timer.targetFrame = this.currentFrame + timer.interval
        } else {
          // Remove one-time timer
          this.timers.delete(timer.id)
        }
      }
    }
  }

  /**
   * Reset the timer system
   * Clears all timers and resets the frame counter
   */
  reset(): void {
    this.timers.clear()
    this.currentFrame = 0
    this.nextId = 0
  }

  /**
   * Get the current frame number
   */
  getCurrentFrame(): number {
    return this.currentFrame
  }

  /**
   * Get the number of active timers
   */
  getActiveTimerCount(): number {
    return Array.from(this.timers.values()).filter((timer) => timer.isActive)
      .length
  }

  /**
   * Get information about all active timers
   */
  getTimerInfo(): Array<{
    id: string
    targetFrame: number
    framesRemaining: number
    isRepeating: boolean
    isActive: boolean
  }> {
    return Array.from(this.timers.values()).map((timer) => ({
      id: timer.id,
      targetFrame: timer.targetFrame,
      framesRemaining: Math.max(0, timer.targetFrame - this.currentFrame),
      isRepeating: timer.interval !== undefined,
      isActive: timer.isActive,
    }))
  }

  /**
   * Pause a specific timer
   * @param id Timer ID
   * @returns True if timer was found and paused
   */
  pauseTimer(id: string): boolean {
    const timer = this.timers.get(id)
    if (timer) {
      timer.isActive = false
      return true
    }
    return false
  }

  /**
   * Resume a paused timer
   * @param id Timer ID
   * @returns True if timer was found and resumed
   */
  resumeTimer(id: string): boolean {
    const timer = this.timers.get(id)
    if (timer) {
      timer.isActive = true
      return true
    }
    return false
  }

  /**
   * Clear all timers
   */
  clearAllTimers(): void {
    this.timers.clear()
  }

  /**
   * Get the total number of timers (including inactive ones)
   */
  getTotalTimerCount(): number {
    return this.timers.size
  }
}
