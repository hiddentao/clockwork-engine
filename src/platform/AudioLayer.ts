/**
 * Audio Layer Interface
 *
 * Platform-agnostic audio abstraction that wraps audio engines
 * like Web Audio API or provides headless implementations.
 */

/**
 * Audio context state (matches Web Audio API states)
 */
export type AudioContextState = "suspended" | "running" | "closed"

/**
 * AudioBuffer interface (compatible with Web Audio API AudioBuffer)
 */
export interface AudioBuffer {
  readonly numberOfChannels: number
  readonly length: number
  readonly sampleRate: number
  readonly duration: number
  getChannelData(channel: number): Float32Array
}

/**
 * Main audio layer interface
 */
export interface AudioLayer {
  // Lifecycle
  initialize(): Promise<void>
  destroy(): void

  // Loading
  loadSound(id: string, data: string | ArrayBuffer): Promise<void>

  // Procedural audio generation
  createBuffer(
    channels: number,
    length: number,
    sampleRate: number,
  ): AudioBuffer
  loadSoundFromBuffer(id: string, buffer: AudioBuffer): void

  // Playback
  playSound(id: string, volume?: number, loop?: boolean): void
  stopSound(id: string): void
  stopAll(): void

  // Context management
  resumeContext(): Promise<void>
  getState(): AudioContextState
}
