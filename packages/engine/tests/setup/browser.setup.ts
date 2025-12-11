/**
 * Browser test setup for Web platform tests
 *
 * Configures happy-dom for DOM/WebGL/WebAudio testing
 */

import { Window } from "happy-dom"

/**
 * Setup a browser-like environment for testing
 */
export function setupBrowserEnvironment() {
  const window = new Window()
  const document = window.document

  // Make window and document globally available
  global.window = window as any
  global.document = document as any
  global.HTMLElement = window.HTMLElement as any
  global.HTMLDivElement = window.HTMLDivElement as any
  global.HTMLCanvasElement = window.HTMLCanvasElement as any
  global.MouseEvent = window.MouseEvent as any
  global.KeyboardEvent = window.KeyboardEvent as any

  // Web Audio API mocks (basic stubs for testing)
  global.AudioContext = class AudioContext {
    state = "running"
    destination = {}

    createBufferSource() {
      return {
        buffer: null,
        loop: false,
        connect: () => {
          // No-op mock
        },
        start: () => {
          // No-op mock
        },
        stop: () => {
          // No-op mock
        },
        onended: null,
      }
    }

    createGain() {
      return {
        gain: { value: 1 },
        connect: () => {
          // No-op mock
        },
      }
    }

    createBuffer(channels: number, length: number, sampleRate: number) {
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: () => new Float32Array(length),
      }
    }

    async decodeAudioData(_arrayBuffer: ArrayBuffer) {
      // Return mock audio buffer
      return this.createBuffer(2, 44100, 44100)
    }

    async resume() {
      // No-op mock
    }
    async close() {
      // No-op mock
    }
  } as any

  return { window, document }
}

/**
 * Cleanup browser environment after tests
 */
export function cleanupBrowserEnvironment() {
  delete (global as any).window
  delete (global as any).document
  delete (global as any).HTMLElement
  delete (global as any).HTMLDivElement
  delete (global as any).HTMLCanvasElement
  delete (global as any).MouseEvent
  delete (global as any).KeyboardEvent
  delete (global as any).AudioContext
}
