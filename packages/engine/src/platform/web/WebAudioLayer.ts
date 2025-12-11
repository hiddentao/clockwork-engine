/**
 * Web Audio Layer
 *
 * Web Audio API-based audio implementation.
 */

import { AudioContextState } from "../AudioLayer"
import type { AudioBuffer, AudioLayer } from "../AudioLayer"

export class WebAudioLayer implements AudioLayer {
  private context: AudioContext | null = null
  private buffers = new Map<string, AudioBuffer>()
  private activeSources = new Map<string, AudioBufferSourceNode[]>()
  private isClosed = false
  private hasResumed = false

  private async resumeWithTimeout(maxWaitMs = 2000): Promise<void> {
    if (!this.context) {
      return
    }

    await this.context.resume()

    const startTime = Date.now()
    while (
      this.context.state === AudioContextState.SUSPENDED &&
      Date.now() - startTime < maxWaitMs
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  async initialize(): Promise<void> {
    if (this.context) {
      return
    }
    this.context = new AudioContext()
  }

  destroy(): void {
    if (!this.context) {
      this.isClosed = true
      return
    }

    this.stopAll()
    this.context.close()
    this.context = null
    this.buffers.clear()
    this.activeSources.clear()
    this.isClosed = true
  }

  async loadSound(id: string, data: string | ArrayBuffer): Promise<void> {
    if (!this.context) {
      return
    }

    if (typeof data === "string") {
      const response = await fetch(data)
      data = await response.arrayBuffer()
    }

    if (data.byteLength === 0) {
      const emptyBuffer = this.createBuffer(1, 1, 44100)
      this.buffers.set(id, emptyBuffer)
      return
    }

    try {
      const audioBuffer = await this.context.decodeAudioData(data)
      this.buffers.set(id, audioBuffer as AudioBuffer)
    } catch (error) {
      console.warn(`Failed to decode audio data for ${id}:`, error)
    }
  }

  createBuffer(
    channels: number,
    length: number,
    sampleRate: number,
  ): AudioBuffer {
    if (!this.context) {
      throw new Error("AudioContext not initialized")
    }
    return this.context.createBuffer(
      channels,
      length,
      sampleRate,
    ) as AudioBuffer
  }

  loadSoundFromBuffer(id: string, buffer: AudioBuffer): void {
    this.buffers.set(id, buffer)
  }

  playSound(id: string, volume = 1.0, loop = false): void {
    if (!this.context) {
      return
    }

    const buffer = this.buffers.get(id)
    if (!buffer) {
      return
    }

    const source = this.context.createBufferSource()
    source.buffer = buffer as any
    source.loop = loop

    const gainNode = this.context.createGain()
    gainNode.gain.value = volume

    source.connect(gainNode)
    gainNode.connect(this.context.destination)

    source.start()

    if (!this.activeSources.has(id)) {
      this.activeSources.set(id, [])
    }
    this.activeSources.get(id)!.push(source)

    source.onended = () => {
      const sources = this.activeSources.get(id)
      if (sources) {
        const index = sources.indexOf(source)
        if (index !== -1) {
          sources.splice(index, 1)
        }
      }
    }
  }

  stopSound(id: string): void {
    const sources = this.activeSources.get(id)
    if (!sources) {
      return
    }

    for (const source of sources) {
      try {
        source.stop()
      } catch {
        // Ignore errors from already stopped sources
      }
    }

    this.activeSources.delete(id)
  }

  stopAll(): void {
    for (const id of this.activeSources.keys()) {
      this.stopSound(id)
    }
  }

  async tryResumeOnce(): Promise<void> {
    if (this.hasResumed) {
      return
    }
    this.hasResumed = true
    await this.resumeWithTimeout()
  }

  getState(): AudioContextState {
    if (this.isClosed) {
      return AudioContextState.CLOSED
    }
    if (!this.context) {
      return AudioContextState.SUSPENDED
    }
    return this.context.state as AudioContextState
  }
}
