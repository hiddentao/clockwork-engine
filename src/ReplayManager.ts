import type { GameEngine } from "./GameEngine"
import { RecordedEventSource } from "./RecordedEventSource"
import type { AnyGameEvent, GameRecording } from "./types"
import { GameState } from "./types"

export class ReplayManager {
  private engine: GameEngine
  private isReplaying: boolean = false
  private deltaFramesIndex: number = 0
  private recording: GameRecording | null = null
  private currentReplayFrame: number = 0
  private accumulatedFrames: number = 0

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

    // Handle corrupted recordings gracefully - let RecordedEventSource deal with null events
    // The test expects this specific error, so don't prevent it here

    this.isReplaying = true
    this.recording = recording
    this.deltaFramesIndex = 0
    this.currentReplayFrame = 0
    this.accumulatedFrames = 0

    // 1. Initialize engine with recording seed
    this.engine.reset(recording.seed)

    // 2. Set input source to recorded events
    const recordedSource = new RecordedEventSource(
      recording.events as AnyGameEvent[],
    )
    this.engine.getEventManager().setSource(recordedSource)

    // 3. Start engine
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

    // Pause the engine when replay stops
    if (this.engine.getState() === GameState.PLAYING) {
      this.engine.pause()
    }

    // Reset playback state (preserve currentReplayFrame for inspection)
    this.deltaFramesIndex = 0
    this.accumulatedFrames = 0
  }

  /**
   * Check if currently replaying
   */
  isCurrentlyReplaying(): boolean {
    return this.isReplaying
  }

  /**
   * Get the current frame number during replay
   */
  getCurrentFrame(): number {
    return this.currentReplayFrame
  }

  /**
   * Update method to be called by PIXI ticker during replay
   * Accumulates deltaFrames and processes recorded frames when ready
   */
  update(deltaFrames: number): void {
    if (!this.isReplaying || !this.recording) {
      return
    }

    // Accumulate incoming frames
    this.accumulatedFrames += deltaFrames

    // Process recorded frames while we have enough accumulated frames
    while (
      this.isReplaying && // Check again in case stopReplay was called
      this.deltaFramesIndex < this.recording.deltaFrames.length &&
      this.accumulatedFrames >=
        this.recording.deltaFrames[this.deltaFramesIndex] - 1e-10 // Add tolerance for floating point precision
    ) {
      const recordedDeltaFrames =
        this.recording.deltaFrames[this.deltaFramesIndex]
      this.deltaFramesIndex++

      // Subtract processed frames from accumulator
      this.accumulatedFrames -= recordedDeltaFrames

      // Update the engine with the recorded deltaFrames
      this.engine.update(recordedDeltaFrames)

      // Track current frame
      this.currentReplayFrame += recordedDeltaFrames
    }

    // Check if replay is complete after processing (moved from beginning)
    if (
      this.isReplaying &&
      this.deltaFramesIndex >= this.recording.deltaFrames.length
    ) {
      this.stopReplay()
    }
  }

  /**
   * Get replay progress information based on current frame vs total frames
   */
  getReplayProgress(): {
    isReplaying: boolean
    progress: number
    hasMoreFrames: boolean
  } {
    if (!this.recording) {
      return { isReplaying: false, progress: 0, hasMoreFrames: false }
    }

    const totalFrames = this.recording.totalFrames
    const progress = totalFrames > 0 ? this.currentReplayFrame / totalFrames : 0
    // If replay is active, check deltaFramesIndex; if stopped, check if replay was completed
    const hasMoreFrames = this.isReplaying
      ? this.deltaFramesIndex < this.recording.deltaFrames.length
      : progress < 1.0

    return {
      isReplaying: this.isReplaying,
      progress: Math.min(1, progress), // Clamp to 1.0 maximum
      hasMoreFrames,
    }
  }
}
