/**
 * Memory Audio Layer
 *
 * Headless audio implementation that tracks state without actual audio playback.
 * Used for testing, replay validation, and server-side game logic.
 */

import type { AudioBuffer, AudioContextState, AudioLayer } from "../AudioLayer"

export class MemoryAudioLayer implements AudioLayer {
  private sounds = new Map<string, string | ArrayBuffer>()
  private playingSounds = new Set<string>()
  private state: AudioContextState = "running"

  // Lifecycle
  async initialize(): Promise<void> {
    this.state = "running"
  }

  destroy(): void {
    this.state = "closed"
    this.sounds.clear()
    this.playingSounds.clear()
  }

  // Loading
  async loadSound(id: string, data: string | ArrayBuffer): Promise<void> {
    this.sounds.set(id, data)
  }

  // Procedural audio generation
  createBuffer(
    channels: number,
    length: number,
    sampleRate: number,
  ): AudioBuffer {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: (_channel: number) => new Float32Array(length),
    }
  }

  loadSoundFromBuffer(id: string, _buffer: AudioBuffer): void {
    // Store a reference (in real implementation this would be the buffer)
    this.sounds.set(id, `buffer:${id}`)
  }

  // Playback
  playSound(id: string, _volume = 1.0, loop = false): void {
    // No-op for memory layer, but track playing state
    if (loop) {
      this.playingSounds.add(id)
    }
  }

  stopSound(id: string): void {
    this.playingSounds.delete(id)
  }

  stopAll(): void {
    this.playingSounds.clear()
  }

  // Context management
  async resumeContext(): Promise<void> {
    if (this.state === "suspended") {
      this.state = "running"
    }
  }

  getState(): AudioContextState {
    return this.state
  }

  // Test helpers (not part of AudioLayer interface)
  hasSound(id: string): boolean {
    return this.sounds.has(id)
  }

  isPlaying(id: string): boolean {
    return this.playingSounds.has(id)
  }
}
