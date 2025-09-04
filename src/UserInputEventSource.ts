import type { GameEventSource } from "./EventSource"
import type { AnyGameEvent, UserInputEvent } from "./types"
import { GameEventType } from "./types"

export class UserInputEventSource implements GameEventSource {
  private dataQueue: Array<{ data: any; timestamp: number }> = []

  /**
   * Queue input data to be processed
   * @param data The input data to queue
   */
  queueInput(data: any): void {
    this.dataQueue.push({ data, timestamp: Date.now() })
  }

  /**
   * Get all events for the current frame
   * Transforms queued data into game events with the current frame
   * Clears the queue after returning events
   */
  getNextEvents(totalFrames: number): AnyGameEvent[] {
    if (this.dataQueue.length === 0) {
      return []
    }

    // Transform all queued data into events with current frame
    const events: UserInputEvent[] = this.dataQueue.map((item) => ({
      type: GameEventType.USER_INPUT,
      frame: totalFrames,
      timestamp: item.timestamp,
      inputType: "direction",
      params: [item.data],
    }))

    // Clear the queue
    this.dataQueue = []

    return events
  }

  /**
   * Check if there are more events available
   */
  hasMoreEvents(): boolean {
    return this.dataQueue.length > 0
  }

  /**
   * Reset the event source by clearing the queue
   */
  reset(): void {
    this.dataQueue.length = 0
  }

  /**
   * Get the number of queued data items
   */
  getQueueLength(): number {
    return this.dataQueue.length
  }

  /**
   * Get all queued data (read-only)
   */
  getQueuedData(): readonly any[] {
    return this.dataQueue.map((item) => item.data)
  }

  /**
   * Remove all data matching a predicate
   * @param predicate Function to test each data item
   * @returns Number of items removed
   */
  removeData(predicate: (data: any) => boolean): number {
    const originalLength = this.dataQueue.length
    this.dataQueue = this.dataQueue.filter((item) => !predicate(item.data))
    return originalLength - this.dataQueue.length
  }

  /**
   * Clear all data from the queue
   */
  clear(): void {
    this.dataQueue.length = 0
  }
}
