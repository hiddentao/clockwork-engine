import { beforeEach, describe, expect, it } from "bun:test"
import { GameEngine } from "../../src/GameEngine"
import { Loader } from "../../src/Loader"
import { AssetLoader, AssetType } from "../../src/assets/AssetLoader"
import { HeadlessLoader } from "../../src/loaders/HeadlessLoader"
import { MemoryPlatformLayer } from "../../src/platform/memory"
import type { GameConfig } from "../../src/types"

// Mock loader with data
class MockLoader extends Loader {
  private data: Map<string, string> = new Map()

  setData(id: string, data: string): void {
    this.data.set(id, data)
  }

  async fetchData(id: string): Promise<string> {
    return this.data.get(id) || ""
  }
}

// Test game engine
class TestGameEngine extends GameEngine {
  public setupCalled = false
  public assetsAvailableInSetup = false

  async setup(_config: GameConfig): Promise<void> {
    this.setupCalled = true

    // Check if assets are available in setup()
    if (this.assetLoader) {
      const spritesheet = this.assetLoader.getSpritesheet("test")
      this.assetsAvailableInSetup = spritesheet !== undefined
    }
  }
}

describe("GameEngine + AssetLoader Integration", () => {
  let loader: MockLoader
  let platform: MemoryPlatformLayer

  beforeEach(() => {
    loader = new MockLoader()
    platform = new MemoryPlatformLayer()
  })

  describe("reset() with assetLoader", () => {
    it("should preload assets before calling setup()", async () => {
      // Setup mock data
      loader.setData("sprites/test.png", "")
      loader.setData("sprites/test.json", JSON.stringify({ frames: {} }))

      // Create asset loader and register assets
      const assetLoader = new AssetLoader(
        loader,
        platform.rendering,
        platform.audio,
      )
      assetLoader.register("test", AssetType.SPRITESHEET)

      // Create engine with asset loader
      const engine = new TestGameEngine({ loader, platform, assetLoader })

      await engine.reset({})

      // Verify setup was called
      expect(engine.setupCalled).toBe(true)

      // Verify assets were available in setup()
      expect(engine.assetsAvailableInSetup).toBe(true)
    })

    it("should work without assetLoader (backward compatible)", async () => {
      // Create engine without asset loader
      const engine = new TestGameEngine({ loader, platform })

      await engine.reset({})

      // Verify setup was still called
      expect(engine.setupCalled).toBe(true)
    })

    it("should track preload progress", async () => {
      loader.setData("sprites/player.png", "")
      loader.setData("sprites/player.json", JSON.stringify({ frames: {} }))
      loader.setData("images/logo.png", "")

      const progressUpdates: Array<{ loaded: number; total: number }> = []

      // Custom asset loader that tracks progress
      class TrackingAssetLoader extends AssetLoader {
        async preloadAssets(
          onProgress?: (loaded: number, total: number) => void,
        ): Promise<void> {
          await super.preloadAssets((loaded, total) => {
            progressUpdates.push({ loaded, total })
            onProgress?.(loaded, total)
          })
        }
      }

      const assetLoader = new TrackingAssetLoader(
        loader,
        platform.rendering,
        platform.audio,
      )
      assetLoader.register("player", AssetType.SPRITESHEET)
      assetLoader.register("logo", AssetType.STATIC_IMAGE)

      const engine = new TestGameEngine({ loader, platform, assetLoader })

      await engine.reset({})

      // Verify progress was tracked
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1].total).toBe(2)
      expect(progressUpdates[progressUpdates.length - 1].loaded).toBe(2)
    })
  })

  describe("Headless replay with AssetLoader", () => {
    it("should work with HeadlessLoader for replay", async () => {
      const headlessLoader = new HeadlessLoader(new MockLoader())
      const assetLoader = new AssetLoader(
        headlessLoader,
        platform.rendering,
        platform.audio,
      )

      assetLoader.register("player", AssetType.SPRITESHEET)
      assetLoader.register("logo", AssetType.STATIC_IMAGE)
      assetLoader.register("jump", AssetType.SOUND)

      const engine = new TestGameEngine({
        loader: headlessLoader,
        platform,
        assetLoader,
      })

      await engine.reset({})

      // Verify setup was called even with empty assets
      expect(engine.setupCalled).toBe(true)

      // Assets "loaded" but with empty data
      expect(assetLoader.getSpritesheet("player")).toBeDefined()
      expect(assetLoader.getStaticImage("logo")).toBeDefined()
    })
  })

  describe("Multiple reset() calls", () => {
    it("should reload assets on each reset()", async () => {
      loader.setData("sprites/test.png", "")
      loader.setData("sprites/test.json", JSON.stringify({ frames: {} }))

      const assetLoader = new AssetLoader(
        loader,
        platform.rendering,
        platform.audio,
      )
      assetLoader.register("test", AssetType.SPRITESHEET)

      const engine = new TestGameEngine({ loader, platform, assetLoader })

      // First reset
      await engine.reset({})
      expect(engine.setupCalled).toBe(true)

      // Reset the flag
      engine.setupCalled = false

      // Second reset
      await engine.reset({})
      expect(engine.setupCalled).toBe(true)

      // Assets should still be available
      expect(assetLoader.getSpritesheet("test")).toBeDefined()
    })
  })

  describe("Error handling", () => {
    it("should handle asset loading errors gracefully", async () => {
      // Loader that throws errors
      class ErrorLoader extends Loader {
        async fetchData(_id: string): Promise<string> {
          throw new Error("Network error")
        }
      }

      const errorLoader = new ErrorLoader()
      const assetLoader = new AssetLoader(
        errorLoader,
        platform.rendering,
        platform.audio,
      )
      assetLoader.register("test", AssetType.SPRITESHEET)

      const engine = new TestGameEngine({
        loader: errorLoader,
        platform,
        assetLoader,
      })

      // Should propagate error
      await expect(engine.reset({})).rejects.toThrow("Network error")
    })
  })
})
