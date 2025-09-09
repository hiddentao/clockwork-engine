import type { GameEngine } from "./GameEngine"
import { RecordedEventSource } from "./RecordedEventSource"
import { REPLAY_CONSTANTS } from "./constants"
import type { AnyGameEvent, GameRecording } from "./types"
import { GameState } from "./types"

export class ReplayManager {
  protected engine: GameEngine
  protected isReplaying: boolean = false
  protected deltaFramesIndex: number = 0
  protected recording: GameRecording | null = null
  protected currentReplayFrame: number = 0
  protected accumulatedFrames: number = 0

  constructor(engine: GameEngine) {
    this.engine = engine
  }

  /**
   * Start replaying a recorded game session with full validation
   * Validates recording structure, resets engine state, and begins deterministic replay
   * @param recording Complete game recording with events, deltaFrames, and metadata
   * @throws Error if already replaying or recording is invalid
   */
  replay(recording: GameRecording): void {
    if (this.isReplaying) {
      throw new Error("Already replaying. Stop current replay first.")
    }

    // Ensure recording integrity before replay begins
    this.validateRecording(recording)

    this.isReplaying = true
    this.recording = recording
    this.deltaFramesIndex = 0
    this.currentReplayFrame = 0
    this.accumulatedFrames = 0

    // Initialize engine with deterministic seed
    this.engine.reset(recording.seed)

    // Configure event source for recorded input
    const recordedSource = new RecordedEventSource(
      recording.events as AnyGameEvent[],
    )
    this.engine.getEventManager().setSource(recordedSource)

    // Begin game execution
    this.engine.start()
  }

  /**
   * Stop the current replay and pause the engine
   * Preserves current frame position for inspection
   */
  stopReplay(): void {
    if (!this.isReplaying) {
      return
    }

    this.isReplaying = false

    // Pause engine to preserve final state
    if (this.engine.getState() === GameState.PLAYING) {
      this.engine.pause()
    }

    // Reset playback state (preserve currentReplayFrame for inspection)
    this.deltaFramesIndex = 0
    this.accumulatedFrames = 0
  }

  /**
   * Check if currently replaying a recording
   * @returns True if replay is active, false otherwise
   */
  isCurrentlyReplaying(): boolean {
    return this.isReplaying
  }

  /**
   * Get the current frame number during replay
   * @returns Current replay frame position
   */
  getCurrentFrame(): number {
    return this.currentReplayFrame
  }

  /**
   * Update method to be called by game loop during replay
   * Accumulates incoming frames and processes recorded frames deterministically
   * Maintains frame-accurate timing with floating-point tolerance
   * @param deltaFrames Number of frames elapsed since last update
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
        this.recording.deltaFrames[this.deltaFramesIndex] -
          REPLAY_CONSTANTS.FLOATING_POINT_TOLERANCE
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
   * Get comprehensive replay progress information
   * Provides completion percentage and remaining frame status
   * @returns Object containing replay state, progress (0-1), and frame availability
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

  /**
   * Validate recording structure to ensure it's safe and complete for replay
   * @param recording The recording to validate
   */
  protected validateRecording(recording: GameRecording): void {
    if (!recording) {
      throw new Error("Invalid recording: recording is null or undefined")
    }

    // Validate seed
    if (!recording.seed || typeof recording.seed !== "string") {
      throw new Error("Invalid recording: missing or invalid seed")
    }

    // Validate events array
    if (!Array.isArray(recording.events)) {
      throw new Error("Invalid recording: events must be an array")
    }

    // Validate deltaFrames array
    if (!Array.isArray(recording.deltaFrames)) {
      throw new Error("Invalid recording: deltaFrames must be an array")
    }

    // Validate totalFrames
    if (
      typeof recording.totalFrames !== "number" ||
      recording.totalFrames < 0
    ) {
      throw new Error(
        "Invalid recording: totalFrames must be a non-negative number",
      )
    }

    // Validate that all deltaFrames are positive numbers
    for (let i = 0; i < recording.deltaFrames.length; i++) {
      const deltaFrame = recording.deltaFrames[i]
      if (typeof deltaFrame !== "number" || deltaFrame <= 0) {
        throw new Error(
          `Invalid recording: deltaFrames[${i}] must be a positive number, got ${deltaFrame}`,
        )
      }
    }

    // Validate events structure
    for (let i = 0; i < recording.events.length; i++) {
      const event = recording.events[i]
      if (!event || typeof event !== "object") {
        throw new Error(`Invalid recording: events[${i}] must be an object`)
      }

      if (!event.type || typeof event.type !== "string") {
        throw new Error(`Invalid recording: events[${i}].type must be a string`)
      }

      if (typeof event.frame !== "number" || event.frame < 0) {
        throw new Error(
          `Invalid recording: events[${i}].frame must be a non-negative number`,
        )
      }
    }
  }
}
