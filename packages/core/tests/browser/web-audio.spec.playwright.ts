import { expect, test } from "@playwright/test"
import { AudioContextState } from "../../src/platform"

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
        await audio.tryResumeOnce()
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

      await audio.tryResumeOnce()

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

      await audio.tryResumeOnce()

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

      await audio.tryResumeOnce()

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

      await audio.tryResumeOnce()

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

      await audio.tryResumeOnce()
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

test.describe("WebAudioLayer Autoplay Policy Fix", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/tests/browser/test-page.html")
  })

  test("should only attempt resume once with tryResumeOnce()", async ({
    page,
  }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}

      let resumeCallCount = 0
      const originalResume = audio.context ? audio.context.resume.bind(audio.context) : null

      if (audio.context && originalResume) {
        audio.context.resume = async function() {
          resumeCallCount++
          return originalResume.apply(this, arguments)
        }
      }

      await audio.tryResumeOnce()
      await audio.tryResumeOnce()
      await audio.tryResumeOnce()

      return {
        resumeCallCount,
        state: audio.getState(),
      }
    })()`,
    )

    expect(result.resumeCallCount).toBeLessThanOrEqual(1)
  })

  test("should integrate WebInputLayer with audio resume on click", async ({
    page,
  }) => {
    const result = await page.evaluate(
      `(async () => {
      const { WebAudioLayer, WebInputLayer } = await import("/dist/clockwork-engine.js")

      const testContainer = document.createElement("div")
      document.body.appendChild(testContainer)

      const audio = new WebAudioLayer()
      await audio.initialize()

      const input = new WebInputLayer(testContainer, audio)

      const initialState = audio.getState()

      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      })
      testContainer.dispatchEvent(clickEvent)

      await new Promise(resolve => setTimeout(resolve, 100))

      const stateAfterClick = audio.getState()

      input.removeAllListeners()
      document.body.removeChild(testContainer)

      return {
        initialState,
        stateAfterClick,
      }
    })()`,
    )

    expect(result.stateAfterClick).toBe(AudioContextState.RUNNING)
  })

  test("should integrate WebInputLayer with audio resume on keydown", async ({
    page,
  }) => {
    const result = await page.evaluate(
      `(async () => {
      const { WebAudioLayer, WebInputLayer } = await import("/dist/clockwork-engine.js")

      const testContainer = document.createElement("div")
      document.body.appendChild(testContainer)

      const audio = new WebAudioLayer()
      await audio.initialize()

      const input = new WebInputLayer(testContainer, audio)

      const initialState = audio.getState()

      const keyEvent = new KeyboardEvent("keydown", {
        key: "ArrowUp",
        code: "ArrowUp",
        bubbles: true,
      })
      window.dispatchEvent(keyEvent)

      await new Promise(resolve => setTimeout(resolve, 100))

      const stateAfterKey = audio.getState()

      input.removeAllListeners()
      document.body.removeChild(testContainer)

      return {
        initialState,
        stateAfterKey,
      }
    })()`,
    )

    expect(result.stateAfterKey).toBe(AudioContextState.RUNNING)
  })

  test("should not resume multiple times with multiple clicks", async ({
    page,
  }) => {
    const result = await page.evaluate(
      `(async () => {
      const { WebAudioLayer, WebInputLayer } = await import("/dist/clockwork-engine.js")

      const testContainer = document.createElement("div")
      document.body.appendChild(testContainer)

      const audio = new WebAudioLayer()
      await audio.initialize()

      let resumeCallCount = 0
      const originalResume = audio.context ? audio.context.resume.bind(audio.context) : null

      if (audio.context && originalResume) {
        audio.context.resume = async function() {
          resumeCallCount++
          return originalResume.apply(this, arguments)
        }
      }

      const input = new WebInputLayer(testContainer, audio)

      for (let i = 0; i < 5; i++) {
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          clientX: 50 + i * 10,
          clientY: 50 + i * 10,
        })
        testContainer.dispatchEvent(clickEvent)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      input.removeAllListeners()
      document.body.removeChild(testContainer)

      return {
        resumeCallCount,
        state: audio.getState(),
      }
    })()`,
    )

    expect(result.resumeCallCount).toBeLessThanOrEqual(1)
    expect(result.state).toBe(AudioContextState.RUNNING)
  })

  test("should allow audio playback after user interaction", async ({
    page,
  }) => {
    const result = await page.evaluate(
      `(async () => {
      const { WebAudioLayer, WebInputLayer } = await import("/dist/clockwork-engine.js")
      ${CREATE_TEST_BUFFER}

      const testContainer = document.createElement("div")
      document.body.appendChild(testContainer)

      const audio = new WebAudioLayer()
      await audio.initialize()

      const buffer = createTestBuffer(audio, 440, 0.05)
      audio.loadSoundFromBuffer("test-sound", buffer)

      const input = new WebInputLayer(testContainer, audio)

      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      })
      testContainer.dispatchEvent(clickEvent)

      await new Promise(resolve => setTimeout(resolve, 100))

      let playbackSuccessful = false
      try {
        audio.playSound("test-sound", 0.5, false)
        playbackSuccessful = true
      } catch (error) {
        playbackSuccessful = false
      }

      await new Promise(resolve => setTimeout(resolve, 100))

      audio.stopAll()
      input.removeAllListeners()
      document.body.removeChild(testContainer)

      return {
        playbackSuccessful,
        state: audio.getState(),
      }
    })()`,
    )

    expect(result.playbackSuccessful).toBe(true)
    expect(result.state).toBe(AudioContextState.RUNNING)
  })
})

test.describe("WebAudioLayer Data URL Loading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/tests/browser/test-page.html")
  })

  test("should load sound from base64 data URL", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}
      ${CREATE_TEST_BUFFER}

      const buffer = createTestBuffer(audio, 440, 0.1)
      const channelData = buffer.getChannelData(0)

      const wavHeader = new ArrayBuffer(44)
      const view = new DataView(wavHeader)
      const sampleRate = 48000
      const numChannels = 1
      const bitsPerSample = 16
      const dataSize = channelData.length * 2

      view.setUint32(0, 0x52494646, false)
      view.setUint32(4, 36 + dataSize, true)
      view.setUint32(8, 0x57415645, false)
      view.setUint32(12, 0x666d7420, false)
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, numChannels, true)
      view.setUint32(24, sampleRate, true)
      view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true)
      view.setUint16(32, numChannels * bitsPerSample / 8, true)
      view.setUint16(34, bitsPerSample, true)
      view.setUint32(36, 0x64617461, false)
      view.setUint32(40, dataSize, true)

      const samples = new Int16Array(channelData.length)
      for (let i = 0; i < channelData.length; i++) {
        samples[i] = Math.max(-32768, Math.min(32767, Math.floor(channelData[i] * 32767)))
      }

      const wavBuffer = new Uint8Array(44 + samples.byteLength)
      wavBuffer.set(new Uint8Array(wavHeader), 0)
      wavBuffer.set(new Uint8Array(samples.buffer), 44)

      let binary = ''
      for (let i = 0; i < wavBuffer.length; i++) {
        binary += String.fromCharCode(wavBuffer[i])
      }
      const base64 = btoa(binary)
      const dataUrl = 'data:audio/wav;base64,' + base64

      await audio.loadSound("data-url-sound", dataUrl)

      return {
        loaded: true,
        dataUrlLength: dataUrl.length,
      }
    })()`,
    )

    expect(result.loaded).toBe(true)
    expect(result.dataUrlLength).toBeGreaterThan(100)
  })

  test("should play sound loaded from data URL", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}
      ${CREATE_TEST_BUFFER}

      const buffer = createTestBuffer(audio, 440, 0.05)
      const channelData = buffer.getChannelData(0)

      const wavHeader = new ArrayBuffer(44)
      const view = new DataView(wavHeader)
      const sampleRate = 48000
      const numChannels = 1
      const bitsPerSample = 16
      const dataSize = channelData.length * 2

      view.setUint32(0, 0x52494646, false)
      view.setUint32(4, 36 + dataSize, true)
      view.setUint32(8, 0x57415645, false)
      view.setUint32(12, 0x666d7420, false)
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, numChannels, true)
      view.setUint32(24, sampleRate, true)
      view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true)
      view.setUint16(32, numChannels * bitsPerSample / 8, true)
      view.setUint16(34, bitsPerSample, true)
      view.setUint32(36, 0x64617461, false)
      view.setUint32(40, dataSize, true)

      const samples = new Int16Array(channelData.length)
      for (let i = 0; i < channelData.length; i++) {
        samples[i] = Math.max(-32768, Math.min(32767, Math.floor(channelData[i] * 32767)))
      }

      const wavBuffer = new Uint8Array(44 + samples.byteLength)
      wavBuffer.set(new Uint8Array(wavHeader), 0)
      wavBuffer.set(new Uint8Array(samples.buffer), 44)

      let binary = ''
      for (let i = 0; i < wavBuffer.length; i++) {
        binary += String.fromCharCode(wavBuffer[i])
      }
      const base64 = btoa(binary)
      const dataUrl = 'data:audio/wav;base64,' + base64

      await audio.loadSound("playable-data-url", dataUrl)
      await audio.tryResumeOnce()

      let playbackSuccessful = false
      try {
        audio.playSound("playable-data-url", 0.5, false)
        playbackSuccessful = true
      } catch (error) {
        playbackSuccessful = false
      }

      await new Promise(resolve => setTimeout(resolve, 100))
      audio.stopSound("playable-data-url")

      return {
        playbackSuccessful,
        state: audio.getState(),
      }
    })()`,
    )

    expect(result.playbackSuccessful).toBe(true)
    expect(result.state).toBe(AudioContextState.RUNNING)
  })

  test("should handle empty data URL content", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}

      const dataUrl = 'data:audio/wav;base64,'

      let noError = true
      try {
        await audio.loadSound("empty-data-url", dataUrl)
      } catch (error) {
        noError = false
      }

      return {
        noError,
        state: audio.getState(),
      }
    })()`,
    )

    expect(result.noError).toBe(true)
  })

  test("should handle data URL with plain text mime type", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getAudioSetup()}

      const dataUrl = 'data:text/plain;base64,' + btoa('not audio data')

      let noError = true
      try {
        await audio.loadSound("text-data-url", dataUrl)
      } catch (error) {
        noError = false
      }

      return {
        noError,
        state: audio.getState(),
      }
    })()`,
    )

    expect(result.noError).toBe(true)
  })
})
