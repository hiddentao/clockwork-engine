import type { AnyGameEvent } from "./types"

export interface GameEventSource {
  /**
   * Get the next events for the current tick
   * @param totalTicks The current total ticks in the game
   * @returns Array of events to process, or empty array if no events are ready
   */
  getNextEvents(totalTicks: number): AnyGameEvent[]

  /**
   * Check if there are more events available
   * @returns True if more events are available
   */
  hasMoreEvents(): boolean

  /**
   * Reset the event source to its initial state
   */
  reset(): void
}
