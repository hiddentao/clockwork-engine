import { beforeEach, describe, expect, it } from "bun:test"
import { Loader } from "../../src/Loader"
import { Spritesheet } from "../../src/assets/Spritesheet"
import { HeadlessLoader } from "../../src/loaders/HeadlessLoader"
import { MemoryPlatformLayer } from "../../src/platform/memory"

// Mock loader that returns JSON spritesheet data
class MockSpritesheetLoader extends Loader {
  private data: Map<string, string> = new Map()

  setData(id: string, data: string): void {
    this.data.set(id, data)
  }

  async fetchData(id: string): Promise<string> {
    return this.data.get(id) || ""
  }
}

describe("Spritesheet", () => {
  let loader: MockSpritesheetLoader
  let platform: MemoryPlatformLayer

  beforeEach(() => {
    loader = new MockSpritesheetLoader()
    platform = new MemoryPlatformLayer()
  })

  describe("load()", () => {
    it("should load spritesheet with image and JSON data", async () => {
      // Set up mock data
      loader.setData("player.png", "") // Empty for headless
      loader.setData(
        "player.json",
        JSON.stringify({
          frames: {
            player_idle_0: { x: 0, y: 0, w: 32, h: 32 },
            player_walk_0: { x: 32, y: 0, w: 32, h: 32 },
          },
        }),
      )

      const spritesheet = await Spritesheet.load(
        loader,
        platform.rendering,
        "player.png",
        "player.json",
      )

      expect(spritesheet).toBeDefined()
    })

    it("should load spritesheet with inferred JSON path", async () => {
      // Set up mock data
      loader.setData("player.png", "")
      loader.setData(
        "player.png.json",
        JSON.stringify({
          frames: {
            player_idle_0: { x: 0, y: 0, w: 32, h: 32 },
          },
        }),
      )

      const spritesheet = await Spritesheet.load(
        loader,
        platform.rendering,
        "player.png",
      )

      expect(spritesheet).toBeDefined()
    })

    it("should work with empty data (headless mode)", async () => {
      const headlessLoader = new HeadlessLoader()

      const spritesheet = await Spritesheet.load(
        headlessLoader,
        platform.rendering,
        "player.png",
        "player.json",
      )

      expect(spritesheet).toBeDefined()
    })
  })

  describe("getTexture()", () => {
    it("should get texture by frame name", async () => {
      loader.setData("player.png", "")
      loader.setData(
        "player.json",
        JSON.stringify({
          frames: {
            player_idle_0: { x: 0, y: 0, w: 32, h: 32 },
            player_walk_0: { x: 32, y: 0, w: 32, h: 32 },
          },
        }),
      )

      const spritesheet = await Spritesheet.load(
        loader,
        platform.rendering,
        "player.png",
        "player.json",
      )

      const texture = spritesheet.getTexture("player_idle_0")
      expect(texture).toBeDefined()
    })

    it("should return undefined for non-existent frame", async () => {
      loader.setData("player.png", "")
      loader.setData(
        "player.json",
        JSON.stringify({
          frames: {
            player_idle_0: { x: 0, y: 0, w: 32, h: 32 },
          },
        }),
      )

      const spritesheet = await Spritesheet.load(
        loader,
        platform.rendering,
        "player.png",
        "player.json",
      )

      const texture = spritesheet.getTexture("non_existent")
      expect(texture).toBeUndefined()
    })
  })

  describe("getAnimationFrames()", () => {
    it("should get animation frames by prefix", async () => {
      loader.setData("player.png", "")
      loader.setData(
        "player.json",
        JSON.stringify({
          frames: {
            player_walk_0: { x: 0, y: 0, w: 32, h: 32 },
            player_walk_1: { x: 32, y: 0, w: 32, h: 32 },
            player_walk_2: { x: 64, y: 0, w: 32, h: 32 },
            player_idle_0: { x: 96, y: 0, w: 32, h: 32 },
          },
        }),
      )

      const spritesheet = await Spritesheet.load(
        loader,
        platform.rendering,
        "player.png",
        "player.json",
      )

      const frames = spritesheet.getAnimationFrames("player_walk_")
      expect(frames).toHaveLength(3)
    })

    it("should return empty array if no frames match", async () => {
      loader.setData("player.png", "")
      loader.setData(
        "player.json",
        JSON.stringify({
          frames: {
            player_idle_0: { x: 0, y: 0, w: 32, h: 32 },
          },
        }),
      )

      const spritesheet = await Spritesheet.load(
        loader,
        platform.rendering,
        "player.png",
        "player.json",
      )

      const frames = spritesheet.getAnimationFrames("player_walk_")
      expect(frames).toHaveLength(0)
    })

    it("should handle non-sequential frame numbering", async () => {
      loader.setData("player.png", "")
      loader.setData(
        "player.json",
        JSON.stringify({
          frames: {
            player_walk_0: { x: 0, y: 0, w: 32, h: 32 },
            player_walk_1: { x: 32, y: 0, w: 32, h: 32 },
            // Missing player_walk_2 - should stop here
            player_walk_3: { x: 96, y: 0, w: 32, h: 32 },
          },
        }),
      )

      const spritesheet = await Spritesheet.load(
        loader,
        platform.rendering,
        "player.png",
        "player.json",
      )

      const frames = spritesheet.getAnimationFrames("player_walk_")
      // Should only get 0 and 1, stops at missing 2
      expect(frames).toHaveLength(2)
    })
  })

  describe("Headless mode", () => {
    it("should work with HeadlessLoader", async () => {
      const headlessLoader = new HeadlessLoader()

      const spritesheet = await Spritesheet.load(
        headlessLoader,
        platform.rendering,
        "player.png",
        "player.json",
      )

      expect(spritesheet).toBeDefined()

      // In headless mode, getTexture returns null/undefined since no actual frames exist
      const texture = spritesheet.getTexture("any_frame")
      expect(texture).toBeUndefined()
    })
  })
})
