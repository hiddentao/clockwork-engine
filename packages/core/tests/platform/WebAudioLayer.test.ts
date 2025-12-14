import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { WebAudioLayer } from "@clockwork-engine/platform-web-pixi"
import { AudioContextState } from "../../src/platform"
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
      expect(audio.getState()).toBe(AudioContextState.RUNNING)
    })

    it("should destroy without errors", () => {
      expect(() => audio.destroy()).not.toThrow()
    })

    it("should change state to closed after destroy", async () => {
      await audio.initialize()
      audio.destroy()
      expect(audio.getState()).toBe(AudioContextState.CLOSED)
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
      await expect(audio.tryResumeOnce()).resolves.toBeUndefined()
    })

    it("should return running state", () => {
      expect(audio.getState()).toBe(AudioContextState.RUNNING)
    })

    it("should return closed state after destroy", () => {
      audio.destroy()
      expect(audio.getState()).toBe(AudioContextState.CLOSED)
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

    it("should load sound from data URL string", async () => {
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(100)))
      const dataUrl = `data:audio/wav;base64,${base64Data}`
      await expect(
        audio.loadSound("test-url", dataUrl),
      ).resolves.toBeUndefined()
    })

    it("should handle empty data URL content", async () => {
      const dataUrl = "data:audio/wav;base64,"
      await expect(
        audio.loadSound("test-empty", dataUrl),
      ).resolves.toBeUndefined()
    })
  })

  describe("Error Handling", () => {
    it("should handle operations before initialization", () => {
      expect(() => audio.getState()).not.toThrow()
      expect(audio.getState()).toBe(AudioContextState.SUSPENDED)
    })

    it("should handle destroy before initialization", () => {
      expect(() => audio.destroy()).not.toThrow()
    })

    it("should handle playSound before initialization", () => {
      expect(() => audio.playSound("test")).not.toThrow()
    })
  })

  describe("Recording", () => {
    beforeEach(async () => {
      await audio.initialize()
    })

    it("should return null stream before recording enabled", () => {
      expect(audio.getRecordingStream()).toBeNull()
    })

    it("should enable recording without errors", () => {
      expect(() => audio.enableRecording()).not.toThrow()
    })

    it("should return MediaStream when recording enabled", () => {
      audio.enableRecording()
      const stream = audio.getRecordingStream()
      expect(stream).not.toBeNull()
    })

    it("should be idempotent when enabling recording multiple times", () => {
      audio.enableRecording()
      const stream1 = audio.getRecordingStream()
      audio.enableRecording()
      const stream2 = audio.getRecordingStream()
      expect(stream1).toBe(stream2)
    })

    it("should disable recording without errors", () => {
      audio.enableRecording()
      expect(() => audio.disableRecording()).not.toThrow()
    })

    it("should return null stream after recording disabled", () => {
      audio.enableRecording()
      expect(audio.getRecordingStream()).not.toBeNull()
      audio.disableRecording()
      expect(audio.getRecordingStream()).toBeNull()
    })

    it("should be idempotent when disabling recording multiple times", () => {
      audio.enableRecording()
      audio.disableRecording()
      expect(() => audio.disableRecording()).not.toThrow()
      expect(audio.getRecordingStream()).toBeNull()
    })

    it("should handle enable/disable cycle multiple times", () => {
      for (let i = 0; i < 3; i++) {
        audio.enableRecording()
        expect(audio.getRecordingStream()).not.toBeNull()
        audio.disableRecording()
        expect(audio.getRecordingStream()).toBeNull()
      }
    })

    it("should disable recording on destroy", () => {
      audio.enableRecording()
      expect(audio.getRecordingStream()).not.toBeNull()
      audio.destroy()
      expect(audio.getRecordingStream()).toBeNull()
    })

    it("should handle enableRecording before initialization", () => {
      const uninitAudio = new WebAudioLayer()
      expect(() => uninitAudio.enableRecording()).not.toThrow()
      expect(uninitAudio.getRecordingStream()).toBeNull()
    })

    it("should handle disableRecording before initialization", () => {
      const uninitAudio = new WebAudioLayer()
      expect(() => uninitAudio.disableRecording()).not.toThrow()
    })
  })
})
