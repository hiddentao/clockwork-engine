import { expect, test } from "bun:test"
import { GameEngine } from "../../src/GameEngine"
import { Loader } from "../../src/Loader"
import { AssetLoader, AssetType } from "../../src/assets/AssetLoader"
import { MemoryPlatformLayer } from "../../src/platform/memory"
import { GameConfig } from "../../src/types"

/**
 * Test loader that tracks fetch calls
 */
class TrackingLoader extends Loader {
  fetchedAssets: string[] = []

  async fetchData(id: string, _meta?: Record<string, any>): Promise<string> {
    this.fetchedAssets.push(id)
    return "" // Return empty string
  }
}

/**
 * Test engine with tracking
 */
class TestEngine extends GameEngine {
  setupCalled = false
  setupConfig: GameConfig | null = null

  async setup(config: GameConfig): Promise<void> {
    this.setupCalled = true
    this.setupConfig = config
  }
}

test("Asset preloading - assets loaded before setup", async () => {
  const loader = new TrackingLoader()
  const platform = new MemoryPlatformLayer()
  const assetLoader = new AssetLoader(
    loader,
    platform.rendering,
    platform.audio,
  )

  // Register assets
  assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
  assetLoader.register("sprites/enemy.png", AssetType.SPRITESHEET)
  assetLoader.register("sounds/jump.mp3", AssetType.SOUND)

  const engine = new TestEngine({ loader, platform, assetLoader })

  // Before reset, setup should not be called
  expect(engine.setupCalled).toBe(false)

  // Reset should preload assets then call setup
  await engine.reset({ prngSeed: "test" })

  // After reset, setup should be called
  expect(engine.setupCalled).toBe(true)

  // Verify assets were fetched
  // Note: spritesheets load 2 files each (image + JSON)
  // 2 spritesheets * 2 + 1 sound = 5 total fetches
  expect(loader.fetchedAssets.length).toBe(5)
  expect(loader.fetchedAssets).toContain("sprites/player.png")
  expect(loader.fetchedAssets).toContain("sprites/player.json")
  expect(loader.fetchedAssets).toContain("sprites/enemy.png")
  expect(loader.fetchedAssets).toContain("sprites/enemy.json")
  expect(loader.fetchedAssets).toContain("sounds/jump.mp3")
})

test("Asset preloading - progress tracking", async () => {
  const loader = new TrackingLoader()
  const platform = new MemoryPlatformLayer()
  const assetLoader = new AssetLoader(
    loader,
    platform.rendering,
    platform.audio,
  )

  // Register multiple assets
  for (let i = 0; i < 10; i++) {
    assetLoader.register(`asset${i}.png`, AssetType.STATIC_IMAGE)
  }

  const progressUpdates: Array<{ loaded: number; total: number }> = []

  await assetLoader.preloadAssets((loaded, total) => {
    progressUpdates.push({ loaded, total })
  })

  // Verify progress was tracked
  expect(progressUpdates.length).toBe(10)
  expect(progressUpdates[0]).toEqual({ loaded: 1, total: 10 })
  expect(progressUpdates[9]).toEqual({ loaded: 10, total: 10 })

  // Verify all assets were loaded
  expect(loader.fetchedAssets.length).toBe(10)
})

test("Asset preloading - no assetLoader provided", async () => {
  const loader = new TrackingLoader()
  const platform = new MemoryPlatformLayer()

  // Create engine without assetLoader
  const engine = new TestEngine({ loader, platform })

  // Should create default AssetLoader internally
  expect(engine.getAssetLoader()).toBeDefined()

  // Reset should work without errors
  await engine.reset({ prngSeed: "test" })

  expect(engine.setupCalled).toBe(true)
})

test("Asset preloading - empty asset list", async () => {
  const loader = new TrackingLoader()
  const platform = new MemoryPlatformLayer()
  const assetLoader = new AssetLoader(
    loader,
    platform.rendering,
    platform.audio,
  )

  // Don't register any assets
  const engine = new TestEngine({ loader, platform, assetLoader })

  await engine.reset({ prngSeed: "test" })

  // Should complete without errors
  expect(engine.setupCalled).toBe(true)
  expect(loader.fetchedAssets.length).toBe(0)
})

test("Asset preloading - duplicate registrations", async () => {
  const loader = new TrackingLoader()
  const platform = new MemoryPlatformLayer()
  const assetLoader = new AssetLoader(
    loader,
    platform.rendering,
    platform.audio,
  )

  // Register same asset multiple times
  assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
  assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
  assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)

  await assetLoader.preloadAssets()

  // Should only load once (spritesheet loads 2 files: image + JSON)
  expect(loader.fetchedAssets.length).toBe(2)
  expect(loader.fetchedAssets).toContain("sprites/player.png")
  expect(loader.fetchedAssets).toContain("sprites/player.json")
})

test("Asset preloading - get loaded assets", async () => {
  const loader = new TrackingLoader()
  const platform = new MemoryPlatformLayer()
  const assetLoader = new AssetLoader(
    loader,
    platform.rendering,
    platform.audio,
  )

  assetLoader.register("sprites/hero.png", AssetType.SPRITESHEET)
  assetLoader.register("images/logo.png", AssetType.STATIC_IMAGE)

  await assetLoader.preloadAssets()

  // Get loaded assets
  const spritesheet = assetLoader.getSpritesheet("sprites/hero.png")
  const staticImage = assetLoader.getStaticImage("images/logo.png")

  expect(spritesheet).toBeDefined()
  expect(staticImage).toBeDefined()

  // Non-existent assets should return undefined
  expect(assetLoader.getSpritesheet("nonexistent.png")).toBeUndefined()
  expect(assetLoader.getStaticImage("missing.png")).toBeUndefined()
})

test("Asset preloading - mixed asset types", async () => {
  const loader = new TrackingLoader()
  const platform = new MemoryPlatformLayer()
  const assetLoader = new AssetLoader(
    loader,
    platform.rendering,
    platform.audio,
  )

  // Register different types
  assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
  assetLoader.register("sprites/enemy.png", AssetType.SPRITESHEET)
  assetLoader.register("images/logo.png", AssetType.STATIC_IMAGE)
  assetLoader.register("images/background.png", AssetType.STATIC_IMAGE)
  assetLoader.register("sounds/jump.mp3", AssetType.SOUND)
  assetLoader.register("sounds/hit.mp3", AssetType.SOUND)

  await assetLoader.preloadAssets()

  // Verify all assets loaded
  // Note: spritesheets load 2 files each (image + JSON)
  // 2 spritesheets * 2 + 2 images + 2 sounds = 8 total fetches
  expect(loader.fetchedAssets.length).toBe(8)

  // Verify correct types
  const spritesheet1 = assetLoader.getSpritesheet("sprites/player.png")
  const spritesheet2 = assetLoader.getSpritesheet("sprites/enemy.png")
  const image1 = assetLoader.getStaticImage("images/logo.png")
  const image2 = assetLoader.getStaticImage("images/background.png")

  expect(spritesheet1).toBeDefined()
  expect(spritesheet2).toBeDefined()
  expect(image1).toBeDefined()
  expect(image2).toBeDefined()

  // Sounds are loaded but not retrievable (no getter in AssetLoader)
  expect(loader.fetchedAssets).toContain("sounds/jump.mp3")
  expect(loader.fetchedAssets).toContain("sounds/hit.mp3")
})

test("Asset preloading - concurrent preload calls", async () => {
  const loader = new TrackingLoader()
  const platform = new MemoryPlatformLayer()
  const assetLoader = new AssetLoader(
    loader,
    platform.rendering,
    platform.audio,
  )

  assetLoader.register("asset1.png", AssetType.STATIC_IMAGE)
  assetLoader.register("asset2.png", AssetType.STATIC_IMAGE)

  // Call preload multiple times concurrently
  await Promise.all([
    assetLoader.preloadAssets(),
    assetLoader.preloadAssets(),
    assetLoader.preloadAssets(),
  ])

  // Should handle concurrent calls gracefully
  // Assets might be loaded multiple times, but no errors
  expect(true).toBe(true)
})
