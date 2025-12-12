import type { AudioLayer } from "@clockwork-engine/core"

/**
 * Generates a pleasant eating sound (ascending tone)
 */
export function generateEatSound(audioLayer: AudioLayer): void {
  const sampleRate = 44100
  const duration = 0.15
  const length = Math.floor(sampleRate * duration)

  const buffer = audioLayer.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Ascending frequency sweep from 400Hz to 800Hz
    const freq = 400 + 400 * (i / length)
    // Exponential decay envelope
    const envelope = Math.exp(-t * 8)
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3
  }

  audioLayer.loadSoundFromBuffer("eat", buffer)
}

/**
 * Generates an explosion sound (noise-based with frequency decay)
 */
export function generateExplosionSound(audioLayer: AudioLayer): void {
  const sampleRate = 44100
  const duration = 0.5
  const length = Math.floor(sampleRate * duration)

  const buffer = audioLayer.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // White noise
    const noise = Math.random() * 2 - 1
    // Low frequency rumble
    const rumble = Math.sin(2 * Math.PI * 60 * t)
    // Sharp attack, exponential decay
    const envelope = Math.exp(-t * 4)
    data[i] = (noise * 0.7 + rumble * 0.3) * envelope * 0.5
  }

  audioLayer.loadSoundFromBuffer("explosion", buffer)
}

/**
 * Generates a thud sound (low frequency impact)
 */
export function generateThudSound(audioLayer: AudioLayer): void {
  const sampleRate = 44100
  const duration = 0.2
  const length = Math.floor(sampleRate * duration)

  const buffer = audioLayer.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    // Low frequency tone descending from 150Hz to 50Hz
    const freq = 150 - 100 * (i / length)
    // Sharp attack, fast decay
    const envelope = Math.exp(-t * 12)
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4
  }

  audioLayer.loadSoundFromBuffer("thud", buffer)
}
