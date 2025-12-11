import { beforeEach, describe, expect, it } from "bun:test"
import { HeadlessLoader } from "../../src/loaders/HeadlessLoader"
import { MockLoader } from "../fixtures/MockLoader"

describe("HeadlessLoader", () => {
  let wrappedLoader: MockLoader
  let loader: HeadlessLoader

  beforeEach(() => {
    wrappedLoader = new MockLoader()
    loader = new HeadlessLoader(wrappedLoader)
  })

  describe("fetchData() without requiredForValidation", () => {
    it("should return empty string for any id", async () => {
      wrappedLoader.setMockData("test-asset", "actual-data")
      const result = await loader.fetchData("test-asset")
      expect(result).toBe("")
    })

    it("should return empty string with options but no requiredForValidation", async () => {
      wrappedLoader.setMockData("test-asset", "actual-data", "image")
      const result = await loader.fetchData("test-asset", { type: "image" })
      expect(result).toBe("")
    })

    it("should return empty string when requiredForValidation is false", async () => {
      wrappedLoader.setMockData("test-asset", "actual-data")
      const result = await loader.fetchData("test-asset", {
        requiredForValidation: false,
      })
      expect(result).toBe("")
    })

    it("should not call wrapped loader for non-essential data", async () => {
      wrappedLoader.setMockData("test-asset", "actual-data")
      await loader.fetchData("test-asset")
      expect(wrappedLoader.getFetchCallCount()).toBe(0)
    })
  })

  describe("fetchData() with requiredForValidation", () => {
    it("should forward to wrapped loader when requiredForValidation is true", async () => {
      wrappedLoader.setMockData("map-data", "map-content")
      const result = await loader.fetchData("map-data", {
        requiredForValidation: true,
      })
      expect(result).toBe("map-content")
    })

    it("should forward options to wrapped loader", async () => {
      wrappedLoader.setMockData("config", "config-content", "game")
      const result = await loader.fetchData("config", {
        requiredForValidation: true,
        type: "game",
      })
      expect(result).toBe("config-content")
    })

    it("should call wrapped loader for replay-essential data", async () => {
      wrappedLoader.setMockData("essential", "data")
      await loader.fetchData("essential", { requiredForValidation: true })
      expect(wrappedLoader.getFetchCallCount()).toBe(1)
    })

    it("should propagate errors from wrapped loader", async () => {
      wrappedLoader.setFailureIds("missing")
      await expect(
        loader.fetchData("missing", { requiredForValidation: true }),
      ).rejects.toThrow("Mock error for id: missing")
    })
  })

  describe("mixed usage scenarios", () => {
    it("should handle mixed essential and non-essential calls", async () => {
      wrappedLoader.setMockData("essential-map", "map-data")
      wrappedLoader.setMockData("cosmetic-sprite", "sprite-data")

      const mapResult = await loader.fetchData("essential-map", {
        requiredForValidation: true,
      })
      const spriteResult = await loader.fetchData("cosmetic-sprite", {
        requiredForValidation: false,
      })

      expect(mapResult).toBe("map-data")
      expect(spriteResult).toBe("")
      expect(wrappedLoader.getFetchCallCount()).toBe(1)
    })

    it("should work for typical replay validation scenario", async () => {
      wrappedLoader.setMockData("level", '{"width":100,"height":100}', "map")
      wrappedLoader.setMockData("player", "sprite-data", "image")
      wrappedLoader.setMockData("music", "audio-data", "sound")

      const levelData = await loader.fetchData("level", {
        requiredForValidation: true,
        type: "map",
      })
      const playerSprite = await loader.fetchData("player", { type: "image" })
      const bgMusic = await loader.fetchData("music", { type: "sound" })

      expect(JSON.parse(levelData)).toEqual({ width: 100, height: 100 })
      expect(playerSprite).toBe("")
      expect(bgMusic).toBe("")
    })
  })
})
