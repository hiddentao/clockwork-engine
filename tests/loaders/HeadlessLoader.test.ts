import { beforeEach, describe, expect, it } from "bun:test"
import { HeadlessLoader } from "../../src/loaders/HeadlessLoader"

describe("HeadlessLoader", () => {
  let loader: HeadlessLoader

  beforeEach(() => {
    loader = new HeadlessLoader()
  })

  describe("fetchData()", () => {
    it("should return empty string for any id", async () => {
      const result = await loader.fetchData("test-asset")
      expect(result).toBe("")
    })

    it("should return empty string with metadata", async () => {
      const result = await loader.fetchData("test-asset", { type: "image" })
      expect(result).toBe("")
    })

    it("should return empty string for sprites", async () => {
      const result = await loader.fetchData("sprites/player.png")
      expect(result).toBe("")
    })

    it("should return empty string for JSON data", async () => {
      const result = await loader.fetchData("sprites/player.json")
      expect(result).toBe("")
    })

    it("should return empty string for sounds", async () => {
      const result = await loader.fetchData("sounds/jump.mp3")
      expect(result).toBe("")
    })

    it("should return empty string for images", async () => {
      const result = await loader.fetchData("images/logo.png")
      expect(result).toBe("")
    })

    it("should handle multiple calls consistently", async () => {
      const result1 = await loader.fetchData("asset1")
      const result2 = await loader.fetchData("asset2")
      const result3 = await loader.fetchData("asset3")

      expect(result1).toBe("")
      expect(result2).toBe("")
      expect(result3).toBe("")
    })

    it("should work with empty id string", async () => {
      const result = await loader.fetchData("")
      expect(result).toBe("")
    })

    it("should work without metadata parameter", async () => {
      const result = await loader.fetchData("test")
      expect(result).toBe("")
    })
  })

  describe("Integration with MemoryPlatformLayer", () => {
    it("should enable headless operations", async () => {
      // HeadlessLoader returns empty strings which MemoryPlatformLayer handles gracefully
      const imageData = await loader.fetchData("sprites/player.png")
      const jsonData = await loader.fetchData("sprites/player.json")
      const soundData = await loader.fetchData("sounds/jump.mp3")

      expect(imageData).toBe("")
      expect(jsonData).toBe("")
      expect(soundData).toBe("")

      // MemoryPlatformLayer should handle these empty strings without errors
      // (tested in MemoryPlatformLayer tests)
    })
  })
})
