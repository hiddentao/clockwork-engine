import type { GameEventManager } from "./GameEventManager"
import type { AnyGameEvent, GameRecording } from "./types"

export class GameRecorder {
  protected recording: GameRecording | null = null
  protected isRecording: boolean = false
  protected eventManager: GameEventManager | null = null
  protected deltaTicks: number[] = []
  protected totalTicks: number = 0

  /**
   * Start recording a game session
   * Begins recording from the current event manager
   */
  startRecording(
    eventManager: GameEventManager,
    seed: string,
    descriptionOrMetadata?: string | Record<string, any>,
    additionalMetadata?: Record<string, any>,
  ): void {
    let metadata: any = {
      createdAt: Date.now(),
      version: "1.0.0",
    }

    if (typeof descriptionOrMetadata === "string") {
      // Backward compatible: description string
      if (descriptionOrMetadata) {
        metadata.description = descriptionOrMetadata
      }
      // Merge additional metadata if provided
      if (additionalMetadata) {
        metadata = { ...metadata, ...additionalMetadata }
      }
    } else if (descriptionOrMetadata) {
      // New usage: metadata object
      metadata = {
        ...metadata,
        ...descriptionOrMetadata,
        // Ensure createdAt is always set
        createdAt: descriptionOrMetadata.createdAt || Date.now(),
      }
    }

    this.recording = {
      seed,
      events: [],
      deltaTicks: [],
      totalTicks: 0,
      metadata,
    }
    this.deltaTicks = []
    this.totalTicks = 0

    this.eventManager = eventManager
    this.eventManager.setRecorder(this)
    this.isRecording = true
  }

  /**
   * Record any game event
   * Only records if currently recording
   */
  recordEvent(event: AnyGameEvent): void {
    if (this.isRecording && this.recording) {
      this.recording.events.push({ ...event })
    }
  }

  /**
   * Record tick update with deltaTicks and totalTicks
   * Only records if currently recording
   */
  recordFrameUpdate(deltaTicks: number, totalTicks: number): void {
    if (this.isRecording && this.recording) {
      this.deltaTicks.push(deltaTicks)
      this.totalTicks = totalTicks
    }
  }

  /**
   * Stop recording
   * Recording data remains available via getCurrentRecording()
   */
  stopRecording(): void {
    if (!this.isRecording || !this.recording) {
      return
    }

    // Copy tick data to the recording
    this.recording.deltaTicks = [...this.deltaTicks]
    this.recording.totalTicks = this.totalTicks

    if (this.eventManager) {
      this.eventManager.setRecorder(undefined)
      this.eventManager = null
    }

    this.isRecording = false
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  /**
   * Get the current recording (without stopping it)
   * Useful for inspecting recording state
   */
  getCurrentRecording(): GameRecording | null {
    return this.recording ? { ...this.recording } : null
  }

  /**
   * Reset the recorder, clearing any existing recording
   */
  reset(): void {
    this.recording = null
    this.isRecording = false
    this.deltaTicks = []
    this.totalTicks = 0
    if (this.eventManager) {
      this.eventManager.setRecorder(undefined)
      this.eventManager = null
    }
  }
}
