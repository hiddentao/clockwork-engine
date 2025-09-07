import type { IGameLoop } from "./IGameLoop"
import { TIMER_CONSTANTS } from "./constants"

interface TimerCallback {
  id: number
  callback: () => void
  targetFrame: number
  interval?: number // For repeating timers
  isActive: boolean
}

export class Timer implements IGameLoop {
  private timers: Map<number, TimerCallback> = new Map()
  private nextId: number = 1
  private currentFrame: number = 0
  private updateStartFrame: number = 0
  private isUpdating: boolean = false

  /**
   * Schedule a one-time callback to execute after the specified number of frames
   * @param callback Callback to execute
   * @param frames Number of frames to wait before execution
   * @returns Timer ID that can be used to cancel the timer
   */
  setTimeout(callback: () => void, frames: number): number {
    const id = this.nextId++
    // Use updateStartFrame if we're currently updating, otherwise use currentFrame
    const baseFrame = this.isUpdating
      ? this.updateStartFrame
      : this.currentFrame
    this.timers.set(id, {
      id,
      callback,
      targetFrame: baseFrame + frames,
      isActive: true,
    })
    return id
  }

  /**
   * Schedule a repeating callback to execute every specified number of frames
   * @param callback Callback to execute
   * @param frames Number of frames between executions
   * @returns Timer ID that can be used to cancel the timer
   */
  setInterval(callback: () => void, frames: number): number {
    const id = this.nextId++
    // Use updateStartFrame if we're currently updating, otherwise use currentFrame
    const baseFrame = this.isUpdating
      ? this.updateStartFrame
      : this.currentFrame
    this.timers.set(id, {
      id,
      callback,
      targetFrame: baseFrame + frames,
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
  clearTimer(id: number): boolean {
    return this.timers.delete(id)
  }

  /**
   * Update the timer system - called by GameEngine
   * Executes all ready timers with proper error handling
   */
  update(_deltaFrames: number, totalFrames: number): void {
    this.updateStartFrame = this.currentFrame
    this.currentFrame = totalFrames
    this.isUpdating = true

    // Process timers until no more are ready to execute
    let hasExecutions = true
    let maxIterations = TIMER_CONSTANTS.MAX_ITERATIONS
    let iterations = 0

    while (hasExecutions && iterations < maxIterations) {
      hasExecutions = false
      iterations++

      const readyTimers: TimerCallback[] = []

      // Collect all timers ready for execution, sorted by targetFrame for deterministic order
      for (const timer of this.timers.values()) {
        if (timer.isActive && this.currentFrame >= timer.targetFrame) {
          readyTimers.push(timer)
        }
      }

      // Sort timers by target frame, then by ID for deterministic execution order
      readyTimers.sort((a, b) => {
        if (a.targetFrame !== b.targetFrame) {
          return a.targetFrame - b.targetFrame
        }
        return a.id - b.id
      })

      if (readyTimers.length > 0) {
        hasExecutions = true

        // Execute all ready timers with error handling
        for (const timer of readyTimers) {
          try {
            timer.callback()
          } catch (error) {
            console.error(`Timer ${timer.id} failed:`, error)
            // Don't rethrow - we don't want one timer failure to break others
          }
        }

        // Reschedule or remove timers after execution
        for (const timer of readyTimers) {
          if (timer.interval !== undefined && timer.isActive) {
            // For repeating timers, handle different interval cases
            if (timer.interval === 0) {
              // Zero interval - execute once per update, don't loop infinitely
              timer.targetFrame = this.currentFrame + 1
              hasExecutions = false // Prevent infinite loop for zero intervals
            } else {
              // Reschedule repeating timer
              timer.targetFrame += timer.interval
            }
          } else {
            // Remove one-time timer
            this.timers.delete(timer.id)
          }
        }
      }
    }

    this.isUpdating = false
  }

  /**
   * Reset the timer system
   * Clears all timers and resets the frame counter
   */
  reset(): void {
    this.timers.clear()
    this.currentFrame = 0
    // Don't reset nextId - tests expect it to keep incrementing across resets
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
    id: number
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
  pauseTimer(id: number): boolean {
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
  resumeTimer(id: number): boolean {
    const timer = this.timers.get(id)
    if (timer) {
      timer.isActive = true
      return true
    }
    return false
  }

  /**
   * Get the total number of timers (including inactive ones)
   */
  getTotalTimerCount(): number {
    return this.timers.size
  }
}
