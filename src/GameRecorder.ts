import type { GameEngine } from "./GameEngine"
import type { AnyGameEvent, GameRecording } from "./types"

export class GameRecorder {
  private recording: GameRecording | null = null
  private isRecording: boolean = false

  /**
   * Start recording a game session
   * Begins recording from the current engine state
   */
  startRecording(engine: GameEngine, description?: string): void {
    this.recording = {
      seed: engine.getSeed(),
      events: [],
      metadata: {
        createdAt: Date.now(),
        description,
        version: "1.0.0",
      },
    }

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
   * Stop recording and return the recorded session
   * @returns The recorded game session, or null if not recording
   */
  stopRecording(): GameRecording | null {
    if (!this.isRecording || !this.recording) {
      return null
    }

    this.isRecording = false
    const finalRecording = { ...this.recording }
    this.recording = null

    return finalRecording
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
   * Get the number of events recorded so far
   */
  getEventCount(): number {
    return this.recording ? this.recording.events.length : 0
  }

  /**
   * Cancel the current recording without returning data
   */
  cancelRecording(): void {
    this.isRecording = false
    this.recording = null
  }
}
