import type { GameEngine } from "./GameEngine"
import { RecordedEventSource } from "./RecordedEventSource"
import type { AnyGameEvent, GameRecording } from "./types"
import { GameState } from "./types"

export class ReplayManager {
  protected __engine: GameEngine
  protected engine: GameEngine
  protected isReplaying: boolean = false
  protected deltaTicksIndex: number = 0
  protected recording: GameRecording | null = null
  protected currentReplayTick: number = 0
  protected accumulatedTicks: number = 0

  constructor(engine: GameEngine) {
    this.__engine = engine
    this.engine = this.createProxyEngine()
  }

  /**
   * Create the proxy GameEngine that intercepts update() calls during replay
   * The proxy implements the replay logic and calls the real engine with recorded deltaFrames
   */
  protected createProxyEngine(): GameEngine {
    const replayManager = this

    return new Proxy(this.__engine, {
      get(target, prop, receiver) {
        if (
          prop === "update" &&
          replayManager.isReplaying &&
          replayManager.recording
        ) {
          // Intercept update() calls during replay
          return function (deltaTicks: number) {
            // Only process ticks when engine is in PLAYING state
            if (target.getState() !== GameState.PLAYING) {
              return
            }

            // Accumulate incoming ticks
            replayManager.accumulatedTicks += deltaTicks

            // Process recorded ticks while we have enough accumulated ticks
            while (
              replayManager.isReplaying &&
              target.getState() === GameState.PLAYING &&
              replayManager.deltaTicksIndex <
                replayManager.recording!.deltaTicks.length &&
              replayManager.accumulatedTicks >=
                replayManager.recording!.deltaTicks[
                  replayManager.deltaTicksIndex
                ]
            ) {
              const recordedDeltaTicks =
                replayManager.recording!.deltaTicks[
                  replayManager.deltaTicksIndex
                ]
              replayManager.deltaTicksIndex++

              // Subtract processed ticks from accumulator
              replayManager.accumulatedTicks -= recordedDeltaTicks

              // Update the real engine with the recorded deltaTicks
              target.update(recordedDeltaTicks)

              // Track current tick
              replayManager.currentReplayTick += recordedDeltaTicks
            }

            // Check if replay is complete after processing
            if (
              replayManager.isReplaying &&
              replayManager.deltaTicksIndex >=
                replayManager.recording!.deltaTicks.length
            ) {
              replayManager._endReplay()
            }
          }
        }

        // For all other methods, pass through to the real engine
        return Reflect.get(target, prop, receiver)
      },
    }) as GameEngine
  }

  /**
   * Get the proxy GameEngine (same as this.engine)
   */
  getReplayEngine(): GameEngine {
    return this.engine
  }

  /**
   * Start replaying a recorded game session with full validation
   * Validates recording structure, resets engine state, and begins deterministic replay
   * @param recording Complete game recording with events, deltaFrames, and metadata
   * @throws Error if already replaying or recording is invalid
   */
  async replay(recording: GameRecording): Promise<void> {
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

    // Initialize engine with game configuration
    await this.__engine.reset(recording.gameConfig)

    // Configure event source for recorded input
    const recordedSource = new RecordedEventSource(
      recording.events as AnyGameEvent[],
    )
    this.__engine.getEventManager().setSource(recordedSource)

    // Begin game execution
    this.__engine.start()
  }

  /**
   * Stop the current replay and end the engine
   * Preserves current frame position for inspection
   */
  protected _endReplay(): void {
    if (!this.isReplaying) {
      return
    }

    this.isReplaying = false

    // End engine to mark game session as complete
    if (this.__engine.getState() === GameState.PLAYING) {
      this.__engine.end()
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
      progress: Math.min(1, progress),
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

    // Validate gameConfig
    if (!recording.gameConfig || typeof recording.gameConfig !== "object") {
      throw new Error("Invalid recording: missing or invalid gameConfig")
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

      if (typeof event.tick !== "number" || event.tick < 0) {
        throw new Error(
          `Invalid recording: events[${i}].tick must be a non-negative number`,
        )
      }
    }
  }
}
