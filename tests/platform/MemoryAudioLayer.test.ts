import { beforeEach, describe, expect, it } from "bun:test"
import { AudioContextState } from "../../src/platform/AudioLayer"
import { MemoryAudioLayer } from "../../src/platform/memory/MemoryAudioLayer"

describe("MemoryAudioLayer", () => {
  let audio: MemoryAudioLayer

  beforeEach(() => {
    audio = new MemoryAudioLayer()
  })

  describe("Lifecycle", () => {
    it("should initialize without errors", async () => {
      await expect(audio.initialize()).resolves.toBeUndefined()
    })

    it("should destroy without errors", () => {
      expect(() => audio.destroy()).not.toThrow()
    })
  })

  describe("Loading", () => {
    it("should load sound from string data", async () => {
      await expect(
        audio.loadSound("test", "data:audio/wav;base64,abc"),
      ).resolves.toBeUndefined()
    })

    it("should load sound from ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(100)
      await expect(audio.loadSound("test", buffer)).resolves.toBeUndefined()
    })

    it("should handle empty string data", async () => {
      await expect(audio.loadSound("test", "")).resolves.toBeUndefined()
    })
  })

  describe("Procedural Audio", () => {
    it("should create audio buffer", () => {
      const buffer = audio.createBuffer(2, 44100, 44100)

      expect(buffer.numberOfChannels).toBe(2)
      expect(buffer.length).toBe(44100)
      expect(buffer.sampleRate).toBe(44100)
      expect(buffer.duration).toBe(1) // 44100 / 44100 = 1 second
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
      await audio.loadSound("test", "")
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
  })

  describe("Context Management", () => {
    it("should resume context without errors", async () => {
      await expect(audio.resumeContext()).resolves.toBeUndefined()
    })

    it("should return running state", () => {
      expect(audio.getState()).toBe(AudioContextState.RUNNING)
    })

    it("should return closed state after destroy", () => {
      audio.destroy()
      expect(audio.getState()).toBe(AudioContextState.CLOSED)
    })
  })

  describe("State Tracking", () => {
    it("should track loaded sounds", async () => {
      await audio.loadSound("sound1", "")
      await audio.loadSound("sound2", "")

      expect(audio.hasSound("sound1")).toBe(true)
      expect(audio.hasSound("sound2")).toBe(true)
      expect(audio.hasSound("nonexistent")).toBe(false)
    })

    it("should track playing sounds", () => {
      audio.playSound("test", 1.0, true)

      expect(audio.isPlaying("test")).toBe(true)
      expect(audio.isPlaying("nonexistent")).toBe(false)
    })

    it("should track that sound stopped playing", () => {
      audio.playSound("test", 1.0, true)
      audio.stopSound("test")

      expect(audio.isPlaying("test")).toBe(false)
    })

    it("should track that all sounds stopped", () => {
      audio.playSound("sound1", 1.0, true)
      audio.playSound("sound2", 1.0, true)
      audio.stopAll()

      expect(audio.isPlaying("sound1")).toBe(false)
      expect(audio.isPlaying("sound2")).toBe(false)
    })
  })

  describe("AudioContextState enum", () => {
    it("should have correct string values", () => {
      expect(AudioContextState.SUSPENDED).toBe(AudioContextState.SUSPENDED)
      expect(AudioContextState.RUNNING).toBe(AudioContextState.RUNNING)
      expect(AudioContextState.CLOSED).toBe(AudioContextState.CLOSED)
    })

    it("should return all valid AudioContextState enum values", () => {
      const state: AudioContextState = audio.getState()
      expect(Object.values(AudioContextState).includes(state)).toBe(true)
    })

    it("should be usable in type guards", () => {
      const state: AudioContextState = AudioContextState.RUNNING
      expect(Object.values(AudioContextState).includes(state)).toBe(true)
    })
  })
})
