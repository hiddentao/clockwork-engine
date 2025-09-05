import type { GameEngine } from "./GameEngine"
import { RecordedEventSource } from "./RecordedEventSource"
import type { AnyGameEvent, GameRecording } from "./types"

export class ReplayManager {
  private engine: GameEngine
  private isReplaying: boolean = false

  // Timestamp-based progress tracking
  private recordingStartTime: number = 0
  private recordingEndTime: number = 0
  private replayStartTime: number = 0

  constructor(engine: GameEngine) {
    this.engine = engine
  }

  /**
   * Start replaying a recorded game session
   * @param recording The game recording to replay
   */
  replay(recording: GameRecording): void {
    if (this.isReplaying) {
      throw new Error("Already replaying. Stop current replay first.")
    }

    this.isReplaying = true

    // Store timing information for progress calculation
    const events = recording.events as AnyGameEvent[]
    this.recordingStartTime =
      events.length > 0 ? events[0].timestamp : Date.now()
    this.recordingEndTime =
      events.length > 0 ? events[events.length - 1].timestamp : Date.now()
    this.replayStartTime = Date.now()

    // 1. Initialize engine with recording seed
    this.engine.reset(recording.seed)

    // 2. Enable fractional frame updates for deterministic replay
    this.engine.setFractionalFrameDelta(0.1)

    // 3. Set input source to recorded events
    const recordedSource = new RecordedEventSource(events)
    this.engine.getEventManager().setSource(recordedSource)

    // 4. Start engine
    this.engine.start()
  }

  /**
   * Stop the current replay
   */
  stopReplay(): void {
    if (!this.isReplaying) {
      return
    }

    this.isReplaying = false

    // Disable fractional frame updates
    this.engine.setFractionalFrameDelta(0)

    // Pause the engine
    if (this.engine.getState() === "PLAYING") {
      this.engine.pause()
    }
  }

  /**
   * Check if currently replaying
   */
  isCurrentlyReplaying(): boolean {
    return this.isReplaying
  }

  /**
   * Get replay progress information based on timestamps
   */
  getReplayProgress(): {
    isReplaying: boolean
    progress: number
    hasMoreEvents: boolean
  } {
    if (!this.isReplaying) {
      return { isReplaying: false, progress: 0, hasMoreEvents: false }
    }

    const eventManager = this.engine.getEventManager()
    const source = eventManager.getSource()
    const hasMoreEvents = source.hasMoreEvents()

    // Calculate progress based on elapsed time vs recording duration
    const recordingDuration = this.recordingEndTime - this.recordingStartTime
    const elapsedTime = Date.now() - this.replayStartTime

    let progress = 0
    if (recordingDuration > 0) {
      progress = Math.min(1, elapsedTime / recordingDuration)
    }

    return {
      isReplaying: true,
      progress,
      hasMoreEvents,
    }
  }
}
