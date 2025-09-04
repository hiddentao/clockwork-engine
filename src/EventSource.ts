import type { AnyGameEvent } from "./types"

export interface GameEventSource {
  /**
   * Get the next events for the current frame
   * @param totalFrames The current total frames in the game
   * @returns Array of events to process, or empty array if no events are ready
   */
  getNextEvents(totalFrames: number): AnyGameEvent[]

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
