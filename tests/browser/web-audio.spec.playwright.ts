import { expect, test } from "@playwright/test"
import { AudioContextState } from "../../src/platform/AudioLayer"

/**
 * Setup code for creating audio layer
 */
function getAudioSetup() {
  return `
    const { WebAudioLayer } = await import("/dist/clockwork-engine.js")
    const audio = new WebAudioLayer()
    await audio.initialize()
  `
}

/**
 * Helper to create test audio buffer (440Hz sine wave)
 */
const CREATE_TEST_BUFFER = `
  function createTestBuffer(audio, frequency = 440, duration = 0.1, sampleRate = 48000) {
    const buffer = audio.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5
    }
    return buffer
  }
`

test.describe("WebAudioLayer (Browser with Web Audio API)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/tests/browser/test-page.html")
  })

  test("should initialize AudioContext", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}

      return {
        initialized: audio !== null,
        state: audio.getState(),
      }
    })()`,
    )

    expect(result.initialized).toBe(true)
    expect([AudioContextState.RUNNING, AudioContextState.SUSPENDED]).toContain(
      result.state,
    )
  })

  test("should handle context state transitions", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}

      const initialState = audio.getState()

      if (initialState === "suspended") {
        await audio.resumeContext()
      }

      const resumedState = audio.getState()

      return {
        initialState,
        resumedState,
      }
    })()`,
    )

    expect([AudioContextState.RUNNING, AudioContextState.SUSPENDED]).toContain(
      result.initialState,
    )
    expect(result.resumedState).toBe(AudioContextState.RUNNING)
  })

  test("should load sound from ArrayBuffer", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}
      ${CREATE_TEST_BUFFER}

      const buffer = createTestBuffer(audio)
      const sampleData = buffer.getChannelData(0).slice(0, 10)

      const arrayBuffer = new ArrayBuffer(sampleData.length * 4)
      const view = new Float32Array(arrayBuffer)
      view.set(sampleData)

      await audio.loadSound("test-sound", arrayBuffer)

      return {
        loaded: true,
        bufferLength: sampleData.length,
      }
    })()`,
    )

    expect(result.loaded).toBe(true)
    expect(result.bufferLength).toBe(10)
  })

  test("should create procedural audio buffer", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}

      const buffer = audio.createBuffer(1, 48000, 48000)
      const channelData = buffer.getChannelData(0)

      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / 48000)
      }

      audio.loadSoundFromBuffer("procedural-beep", buffer)

      return {
        channels: buffer.numberOfChannels,
        length: buffer.length,
        sampleRate: buffer.sampleRate,
        duration: buffer.duration,
      }
    })()`,
    )

    expect(result.channels).toBe(1)
    expect(result.length).toBe(48000)
    expect(result.sampleRate).toBe(48000)
    expect(result.duration).toBeCloseTo(1.0, 2)
  })

  test("should play and stop sound", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}
      ${CREATE_TEST_BUFFER}

      const buffer = createTestBuffer(audio)
      audio.loadSoundFromBuffer("test-tone", buffer)

      await audio.resumeContext()

      audio.playSound("test-tone", 0.5, false)

      await new Promise(resolve => setTimeout(resolve, 50))

      audio.stopSound("test-tone")

      return {
        played: true,
        state: audio.getState(),
      }
    })()`,
    )

    expect(result.played).toBe(true)
    expect(result.state).toBe(AudioContextState.RUNNING)
  })

  test("should handle looping sounds", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}
      ${CREATE_TEST_BUFFER}

      const buffer = createTestBuffer(audio, 440, 0.05)
      audio.loadSoundFromBuffer("loop-tone", buffer)

      await audio.resumeContext()

      audio.playSound("loop-tone", 0.3, true)

      await new Promise(resolve => setTimeout(resolve, 50))

      audio.stopSound("loop-tone")

      return {
        completed: true,
      }
    })()`,
    )

    expect(result.completed).toBe(true)
  })

  test("should stop all sounds", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}
      ${CREATE_TEST_BUFFER}

      const buffer = createTestBuffer(audio, 440, 0.1)
      audio.loadSoundFromBuffer("tone1", buffer)
      audio.loadSoundFromBuffer("tone2", buffer)
      audio.loadSoundFromBuffer("tone3", buffer)

      await audio.resumeContext()

      audio.playSound("tone1", 0.3, false)
      audio.playSound("tone2", 0.3, false)
      audio.playSound("tone3", 0.3, true)

      await new Promise(resolve => setTimeout(resolve, 20))

      audio.stopAll()

      return {
        stoppedAll: true,
      }
    })()`,
    )

    expect(result.stoppedAll).toBe(true)
  })

  test("should handle missing sound gracefully", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}

      await audio.resumeContext()

      audio.playSound("nonexistent-sound", 1.0, false)

      audio.stopSound("nonexistent-sound")

      return {
        noError: true,
      }
    })()`,
    )

    expect(result.noError).toBe(true)
  })

  test("should cleanup properly", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}
      ${CREATE_TEST_BUFFER}

      const buffer = createTestBuffer(audio)
      audio.loadSoundFromBuffer("cleanup-test", buffer)

      await audio.resumeContext()
      audio.playSound("cleanup-test", 0.5, true)

      await new Promise(resolve => setTimeout(resolve, 20))

      audio.destroy()

      return {
        destroyed: true,
      }
    })()`,
    )

    expect(result.destroyed).toBe(true)
  })
})
