import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { WebAudioLayer } from "../../src/platform/web/WebAudioLayer"
import {
  cleanupBrowserEnvironment,
  setupBrowserEnvironment,
} from "../setup/browser.setup"

describe("WebAudioLayer", () => {
  let audio: WebAudioLayer

  beforeEach(() => {
    setupBrowserEnvironment()
    audio = new WebAudioLayer()
  })

  afterEach(() => {
    audio.destroy()
    cleanupBrowserEnvironment()
  })

  describe("Lifecycle", () => {
    it("should initialize without errors", async () => {
      await expect(audio.initialize()).resolves.toBeUndefined()
    })

    it("should create AudioContext after initialization", async () => {
      await audio.initialize()
      expect(audio.getState()).toBe("running")
    })

    it("should destroy without errors", () => {
      expect(() => audio.destroy()).not.toThrow()
    })

    it("should change state to closed after destroy", async () => {
      await audio.initialize()
      audio.destroy()
      expect(audio.getState()).toBe("closed")
    })
  })

  describe("Procedural Audio", () => {
    beforeEach(async () => {
      await audio.initialize()
    })

    it("should create audio buffer", () => {
      const buffer = audio.createBuffer(2, 44100, 44100)

      expect(buffer.numberOfChannels).toBe(2)
      expect(buffer.length).toBe(44100)
      expect(buffer.sampleRate).toBe(44100)
      expect(buffer.duration).toBe(1)
    })

    it("should return Float32Array from getChannelData", () => {
      const buffer = audio.createBuffer(2, 100, 44100)
      const channelData = buffer.getChannelData(0)

      expect(channelData).toBeInstanceOf(Float32Array)
      expect(channelData.length).toBe(100)
    })

    it("should load sound from buffer", () => {
      const buffer = audio.createBuffer(1, 1000, 44100)
      expect(() => audio.loadSoundFromBuffer("beep", buffer)).not.toThrow()
    })
  })

  describe("Playback", () => {
    beforeEach(async () => {
      await audio.initialize()
      const buffer = audio.createBuffer(1, 1000, 44100)
      audio.loadSoundFromBuffer("test", buffer)
    })

    it("should play sound without errors", () => {
      expect(() => audio.playSound("test")).not.toThrow()
    })

    it("should play sound with volume", () => {
      expect(() => audio.playSound("test", 0.5)).not.toThrow()
    })

    it("should play looping sound", () => {
      expect(() => audio.playSound("test", 1.0, true)).not.toThrow()
    })

    it("should stop sound without errors", () => {
      audio.playSound("test", 1.0, true)
      expect(() => audio.stopSound("test")).not.toThrow()
    })

    it("should stop all sounds without errors", () => {
      audio.playSound("test")
      expect(() => audio.stopAll()).not.toThrow()
    })

    it("should handle playing non-existent sound", () => {
      expect(() => audio.playSound("nonexistent")).not.toThrow()
    })

    it("should handle stopping non-existent sound", () => {
      expect(() => audio.stopSound("nonexistent")).not.toThrow()
    })

    it("should handle multiple plays of same sound", () => {
      expect(() => {
        audio.playSound("test")
        audio.playSound("test")
        audio.playSound("test")
      }).not.toThrow()
    })
  })

  describe("Context Management", () => {
    beforeEach(async () => {
      await audio.initialize()
    })

    it("should resume context without errors", async () => {
      await expect(audio.resumeContext()).resolves.toBeUndefined()
    })

    it("should return running state", () => {
      expect(audio.getState()).toBe("running")
    })

    it("should return closed state after destroy", () => {
      audio.destroy()
      expect(audio.getState()).toBe("closed")
    })
  })

  describe("Loading from Data", () => {
    beforeEach(async () => {
      await audio.initialize()
    })

    it("should load sound from ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(100)
      await expect(audio.loadSound("test", buffer)).resolves.toBeUndefined()
    })

    it("should handle empty ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(0)
      await expect(audio.loadSound("test", buffer)).resolves.toBeUndefined()
    })
  })

  describe("Error Handling", () => {
    it("should handle operations before initialization", () => {
      expect(() => audio.getState()).not.toThrow()
      expect(audio.getState()).toBe("suspended")
    })

    it("should handle destroy before initialization", () => {
      expect(() => audio.destroy()).not.toThrow()
    })

    it("should handle playSound before initialization", () => {
      expect(() => audio.playSound("test")).not.toThrow()
    })
  })
})
