import type { GameEngine } from "./GameEngine"
import { RecordedEventSource } from "./RecordedEventSource"
import { TARGET_TPS } from "./lib/internals"
import type { AnyGameEvent, GameRecording } from "./types"
import { GameState } from "./types"

export class ReplayManager {
  protected engine: GameEngine
  protected isReplaying: boolean = false
  protected deltaTicksIndex: number = 0
  protected recording: GameRecording | null = null
  protected currentReplayTick: number = 0
  protected accumulatedTicks: number = 0
  private intervalId: NodeJS.Timeout | null = null
  private replaySpeed: number = 1

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
    this.deltaTicksIndex = 0
    this.currentReplayTick = 0
    this.accumulatedTicks = 0

    // Initialize engine with deterministic seed
    this.engine.reset(recording.seed)

    // Configure event source for recorded input
    const recordedSource = new RecordedEventSource(
      recording.events as AnyGameEvent[],
    )
    this.engine.getEventManager().setSource(recordedSource)

    // Begin game execution
    this.engine.start()

    // Start the replay loop
    this.startReplayLoop()
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

    // Stop the replay loop
    this.stopReplayLoop()

    // Pause engine to preserve final state
    if (this.engine.getState() === GameState.PLAYING) {
      this.engine.pause()
    }

    // Reset playback state (preserve currentReplayTick for inspection)
    this.deltaTicksIndex = 0
    this.accumulatedTicks = 0
  }

  /**
   * Check if currently replaying a recording
   * @returns True if replay is active, false otherwise
   */
  isCurrentlyReplaying(): boolean {
    return this.isReplaying
  }

  /**
   * Get the current tick number during replay
   * @returns Current replay tick position
   */
  getCurrentTick(): number {
    return this.currentReplayTick
  }

  /**
   * Set the replay speed and restart the replay loop if currently replaying
   * @param speed Replay speed multiplier (1 = normal, 2 = 2x speed, etc.)
   */
  setReplaySpeed(speed: number): void {
    this.replaySpeed = speed
    if (this.isReplaying) {
      this.stopReplayLoop()
      this.startReplayLoop()
    }
  }

  /**
   * Update method called internally during replay
   * Accumulates incoming ticks and processes recorded ticks deterministically
   * @param deltaTicks Number of ticks elapsed since last update
   */
  update(deltaTicks: number): void {
    if (!this.isReplaying || !this.recording) {
      return
    }

    // Accumulate incoming ticks
    this.accumulatedTicks += deltaTicks

    // Process recorded ticks while we have enough accumulated ticks
    while (
      this.isReplaying && // Check again in case stopReplay was called
      this.deltaTicksIndex < this.recording.deltaTicks.length &&
      this.accumulatedTicks >= this.recording.deltaTicks[this.deltaTicksIndex]
    ) {
      const recordedDeltaTicks = this.recording.deltaTicks[this.deltaTicksIndex]
      this.deltaTicksIndex++

      // Subtract processed ticks from accumulator
      this.accumulatedTicks -= recordedDeltaTicks

      // Update the engine with the recorded deltaTicks
      this.engine.update(recordedDeltaTicks)

      // Track current tick
      this.currentReplayTick += recordedDeltaTicks
    }

    // Check if replay is complete after processing
    if (
      this.isReplaying &&
      this.deltaTicksIndex >= this.recording.deltaTicks.length
    ) {
      this.stopReplay()
    }
  }

  /**
   * Start the setInterval-based replay loop
   */
  private startReplayLoop(): void {
    const intervalMs = 1000 / this.replaySpeed
    this.intervalId = setInterval(() => {
      this.runReplayLoop()
    }, intervalMs)
  }

  /**
   * Stop the setInterval-based replay loop
   */
  private stopReplayLoop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Run one iteration of the replay loop
   * Processes recorded ticks up to TARGET_TPS worth per iteration
   */
  private runReplayLoop(): void {
    if (!this.isReplaying || !this.recording) {
      return
    }

    let ticksProcessedThisIteration = 0

    // Process recorded ticks while we haven't exceeded TARGET_TPS for this iteration
    while (
      this.isReplaying &&
      this.deltaTicksIndex < this.recording.deltaTicks.length &&
      ticksProcessedThisIteration < TARGET_TPS
    ) {
      const recordedDeltaTicks = this.recording.deltaTicks[this.deltaTicksIndex]

      // Check if adding this delta would exceed our target
      if (ticksProcessedThisIteration + recordedDeltaTicks > TARGET_TPS) {
        break
      }

      this.deltaTicksIndex++
      ticksProcessedThisIteration += recordedDeltaTicks

      // Update the engine with the recorded deltaTicks
      this.engine.update(recordedDeltaTicks)

      // Track current tick
      this.currentReplayTick += recordedDeltaTicks
    }

    // Check if replay is complete after processing
    if (
      this.isReplaying &&
      this.deltaTicksIndex >= this.recording.deltaTicks.length
    ) {
      this.stopReplay()
    }
  }

  /**
   * Get comprehensive replay progress information
   * Provides completion percentage and remaining tick status
   * @returns Object containing replay state, progress (0-1), and tick availability
   */
  getReplayProgress(): {
    isReplaying: boolean
    progress: number
    hasMoreTicks: boolean
  } {
    if (!this.recording) {
      return { isReplaying: false, progress: 0, hasMoreTicks: false }
    }

    const totalTicks = this.recording.totalTicks
    const progress = totalTicks > 0 ? this.currentReplayTick / totalTicks : 0
    // If replay is active, check deltaTicksIndex; if stopped, check if replay was completed
    const hasMoreTicks = this.isReplaying
      ? this.deltaTicksIndex < this.recording.deltaTicks.length
      : progress < 1.0

    return {
      isReplaying: this.isReplaying,
      progress: Math.min(1, progress), // Clamp to 1.0 maximum
      hasMoreTicks,
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

    // Validate deltaTicks array
    if (!Array.isArray(recording.deltaTicks)) {
      throw new Error("Invalid recording: deltaTicks must be an array")
    }

    // Validate totalTicks
    if (typeof recording.totalTicks !== "number" || recording.totalTicks < 0) {
      throw new Error(
        "Invalid recording: totalTicks must be a non-negative number",
      )
    }

    // Validate that all deltaTicks are positive numbers
    for (let i = 0; i < recording.deltaTicks.length; i++) {
      const deltaTick = recording.deltaTicks[i]
      if (typeof deltaTick !== "number" || deltaTick <= 0) {
        throw new Error(
          `Invalid recording: deltaTicks[${i}] must be a positive number, got ${deltaTick}`,
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
