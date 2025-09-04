import type { GameEventSource } from "./EventSource"
import type { AnyGameEvent } from "./types"

export class RecordedEventSource implements GameEventSource {
  private events: AnyGameEvent[]
  private currentIndex: number = 0

  constructor(events: AnyGameEvent[]) {
    // Clone the events array to prevent external modifications
    this.events = events.map((event) => ({ ...event }))
    this.currentIndex = 0
  }

  /**
   * Get events for the current frame
   * Returns all events that are due for this frame or earlier
   */
  getNextEvents(totalFrames: number): AnyGameEvent[] {
    const readyEvents: AnyGameEvent[] = []

    while (this.currentIndex < this.events.length) {
      const event = this.events[this.currentIndex]

      // Only return events that are due for the current frame or earlier
      if (event.frame <= totalFrames) {
        readyEvents.push(event)
        this.currentIndex++
      } else {
        break
      }
    }

    return readyEvents
  }

  /**
   * Check if there are more events available
   */
  hasMoreEvents(): boolean {
    return this.currentIndex < this.events.length
  }

  /**
   * Reset the event source to the beginning of the recording
   */
  reset(): void {
    this.currentIndex = 0
  }

}
