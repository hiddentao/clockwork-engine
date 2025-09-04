import type { GameEventManager } from "./GameEventManager"
import type { AnyGameEvent, GameRecording } from "./types"

export class GameRecorder {
  private recording: GameRecording | null = null
  private isRecording: boolean = false
  private eventManager: GameEventManager | null = null

  /**
   * Start recording a game session
   * Begins recording from the current event manager
   */
  startRecording(
    eventManager: GameEventManager,
    seed: string,
    description?: string,
  ): void {
    this.recording = {
      seed,
      events: [],
      metadata: {
        createdAt: Date.now(),
        description,
        version: "1.0.0",
      },
    }

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
   * Stop recording
   * Recording data remains available via getCurrentRecording()
   */
  stopRecording(): void {
    if (!this.isRecording || !this.recording) {
      return
    }

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
    if (this.eventManager) {
      this.eventManager.setRecorder(undefined)
      this.eventManager = null
    }
  }
}
