import type { GameEventSource } from "./EventSource"
import type { GameEngine } from "./GameEngine"
import type { GameRecorder } from "./GameRecorder"
import type { IGameLoop } from "./IGameLoop"
import type { AnyGameEvent, ObjectUpdateEvent, UserInputEvent } from "./types"
import { GameEventType } from "./types"

export class GameEventManager implements IGameLoop {
  private source: GameEventSource
  private engine: GameEngine
  private recorder?: GameRecorder

  constructor(source: GameEventSource, engine: GameEngine) {
    this.source = source
    this.engine = engine
  }

  /**
   * Set the game recorder for this event manager
   */
  setRecorder(recorder: GameRecorder): void {
    this.recorder = recorder
  }

  /**
   * Process events for the current frame
   */
  update(_deltaFrames: number, totalFrames: number): void {
    // Get all events that are ready for this frame
    const events = this.source.getNextEvents(totalFrames)

    // Process each event
    for (const event of events) {
      this.processEvent(event)

      // Record the event using the GameRecorder
      if (this.recorder) {
        this.recorder.recordEvent(event)
      }
    }
  }

  /**
   * Set a new event source
   * @param source The new event source to use
   */
  setSource(source: GameEventSource): void {
    this.source = source
  }

  /**
   * Get the current event source
   */
  getSource(): GameEventSource {
    return this.source
  }

  /**
   * Reset the event manager
   */
  reset(): void {
    this.source.reset()
  }

  /**
   * Process a single game event
   */
  private processEvent(event: AnyGameEvent): void {
    try {
      switch (event.type) {
        case GameEventType.USER_INPUT:
          this.processUserInput(event as UserInputEvent)
          break

        case GameEventType.OBJECT_UPDATE:
          this.processObjectUpdate(event as ObjectUpdateEvent)
          break

        default:
          console.warn(`Unknown event type: ${(event as AnyGameEvent).type}`)
      }
    } catch (error) {
      console.error(`Error processing event:`, event, error)
    }
  }

  /**
   * Process a user input event
   * This is where you would typically dispatch input events to game systems
   */
  private processUserInput(event: UserInputEvent): void {
    // This is a placeholder implementation
    // In a real game, you would route input events to the appropriate handlers
    // For example: keyboard handlers, mouse handlers, etc.

    if (this.onUserInput) {
      this.onUserInput(event)
    }
  }

  /**
   * Process an object update event
   * Finds the target object and calls the specified method with parameters
   */
  private processObjectUpdate(event: ObjectUpdateEvent): void {
    const group = this.engine.getGameObjectGroup(event.objectType)
    if (!group) {
      console.warn(`No group found for object type: ${event.objectType}`)
      return
    }

    const obj = group.getById(event.objectId)
    if (!obj) {
      console.warn(
        `Object not found: ${event.objectId} of type ${event.objectType}`,
      )
      return
    }

    const method = obj[event.method as keyof typeof obj]
    if (typeof method !== "function") {
      console.warn(
        `Method not found: ${event.method} on object ${event.objectId}`,
      )
      return
    }
    // Call the method with the provided parameters
    ;(method as (...args: any[]) => any).apply(obj, event.params)
  }

  /**
   * Optional callback for handling user input events
   * Can be set by the game implementation to handle input
   */
  public onUserInput?: (event: UserInputEvent) => void

  /**
   * Check if there are more events to process
   */
  hasMoreEvents(): boolean {
    return this.source.hasMoreEvents()
  }

  /**
   * Get information about the current event source
   */
  getSourceInfo(): { type: string; hasMore: boolean } {
    return {
      type: this.source.constructor.name,
      hasMore: this.source.hasMoreEvents(),
    }
  }
}
