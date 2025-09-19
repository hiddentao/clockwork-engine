import type { IGameLoop } from "./IGameLoop"
import { TIMER_CONSTANTS } from "./lib/internals"

interface TimerCallback {
  id: number
  callback: () => void
  targetTick: number
  interval?: number // For repeating timers
  isActive: boolean
}

export class Timer implements IGameLoop {
  protected timers: Map<number, TimerCallback> = new Map()
  protected nextId: number = 1
  protected currentTick: number = 0
  protected updateStartTick: number = 0
  protected isUpdating: boolean = false

  /**
   * Schedule a one-time callback to execute after the specified number of ticks
   * @param callback Callback to execute
   * @param ticks Number of ticks to wait before execution
   * @returns Timer ID that can be used to cancel the timer
   */
  setTimeout(callback: () => void, ticks: number): number {
    const id = this.nextId++
    // Use updateStartTick if we're currently updating, otherwise use currentTick
    const baseTick = this.isUpdating ? this.updateStartTick : this.currentTick
    this.timers.set(id, {
      id,
      callback,
      targetTick: baseTick + ticks,
      isActive: true,
    })
    return id
  }

  /**
   * Schedule a repeating callback to execute every specified number of ticks
   * @param callback Callback to execute
   * @param ticks Number of ticks between executions
   * @returns Timer ID that can be used to cancel the timer
   */
  setInterval(callback: () => void, ticks: number): number {
    const id = this.nextId++
    // Use updateStartTick if we're currently updating, otherwise use currentTick
    const baseTick = this.isUpdating ? this.updateStartTick : this.currentTick
    this.timers.set(id, {
      id,
      callback,
      targetTick: baseTick + ticks,
      interval: ticks,
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
  update(_deltaTicks: number, totalTicks: number): void {
    this.updateStartTick = this.currentTick
    this.currentTick = totalTicks
    this.isUpdating = true

    // Process timers until no more are ready to execute
    let hasExecutions = true
    let maxIterations = TIMER_CONSTANTS.MAX_ITERATIONS
    let iterations = 0

    while (hasExecutions && iterations < maxIterations) {
      hasExecutions = false
      iterations++

      const readyTimers: TimerCallback[] = []

      // Collect all timers ready for execution, sorted by targetTick for deterministic order
      for (const timer of this.timers.values()) {
        if (timer.isActive && this.currentTick >= timer.targetTick) {
          readyTimers.push(timer)
        }
      }

      // Sort timers by target tick, then by ID for deterministic execution order
      readyTimers.sort((a, b) => {
        if (a.targetTick !== b.targetTick) {
          return a.targetTick - b.targetTick
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
              timer.targetTick = this.currentTick + 1
              hasExecutions = false // Prevent infinite loop for zero intervals
            } else {
              // Reschedule repeating timer
              timer.targetTick += timer.interval
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
   * Clears all timers and resets the tick counter
   */
  reset(): void {
    this.timers.clear()
    this.currentTick = 0
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
    targetTick: number
    ticksRemaining: number
    isRepeating: boolean
    isActive: boolean
  }> {
    return Array.from(this.timers.values()).map((timer) => ({
      id: timer.id,
      targetTick: timer.targetTick,
      ticksRemaining: Math.max(0, timer.targetTick - this.currentTick),
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
