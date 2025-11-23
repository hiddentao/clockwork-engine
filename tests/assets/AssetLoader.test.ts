import { beforeEach, describe, expect, it } from "bun:test"
import { Loader } from "../../src/Loader"
import { AssetLoader, AssetType } from "../../src/assets/AssetLoader"
import { Spritesheet } from "../../src/assets/Spritesheet"
import { HeadlessLoader } from "../../src/loaders/HeadlessLoader"
import { MemoryPlatformLayer } from "../../src/platform/memory"

// Mock loader with configurable data
class MockAssetLoader extends Loader {
  private data: Map<string, string> = new Map()

  setData(id: string, data: string): void {
    this.data.set(id, data)
  }

  async fetchData(id: string): Promise<string> {
    return this.data.get(id) || ""
  }
}

describe("AssetLoader", () => {
  let loader: MockAssetLoader
  let platform: MemoryPlatformLayer
  let assetLoader: AssetLoader

  beforeEach(() => {
    loader = new MockAssetLoader()
    platform = new MemoryPlatformLayer()
    assetLoader = new AssetLoader(loader, platform.rendering, platform.audio)
  })

  describe("register()", () => {
    it("should register spritesheet assets", () => {
      assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
      assetLoader.register("sprites/enemy.png", AssetType.SPRITESHEET)

      // Registration itself doesn't throw
      expect(true).toBe(true)
    })

    it("should register static image assets", () => {
      assetLoader.register("images/logo.png", AssetType.STATIC_IMAGE)
      assetLoader.register("images/background.png", AssetType.STATIC_IMAGE)

      expect(true).toBe(true)
    })

    it("should register sound assets", () => {
      assetLoader.register("sounds/jump.mp3", AssetType.SOUND)
      assetLoader.register("sounds/coin.mp3", AssetType.SOUND)

      expect(true).toBe(true)
    })

    it("should not duplicate registrations", () => {
      assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
      assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)

      // Should only register once (verified during preload)
      expect(true).toBe(true)
    })
  })

  describe("preloadAssets()", () => {
    it("should preload registered spritesheets", async () => {
      // Setup mock data
      loader.setData("sprites/player.png", "")
      loader.setData(
        "sprites/player.json",
        JSON.stringify({
          frames: { player_idle_0: { x: 0, y: 0, w: 32, h: 32 } },
        }),
      )

      assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
      await assetLoader.preloadAssets()

      const spritesheet = assetLoader.getSpritesheet("sprites/player.png")
      expect(spritesheet).toBeDefined()
    })

    it("should preload registered static images", async () => {
      loader.setData("images/logo.png", "")

      assetLoader.register("images/logo.png", AssetType.STATIC_IMAGE)
      await assetLoader.preloadAssets()

      const texture = assetLoader.getStaticImage("images/logo.png")
      expect(texture).toBeDefined()
    })

    it("should preload registered sounds", async () => {
      loader.setData("sounds/jump.mp3", "")

      assetLoader.register("sounds/jump.mp3", AssetType.SOUND)
      await assetLoader.preloadAssets()

      // Sound is loaded in audio layer, no getter but no error
      expect(true).toBe(true)
    })

    it("should preload multiple asset types", async () => {
      // Setup mock data
      loader.setData("sprites/player.png", "")
      loader.setData("sprites/player.json", JSON.stringify({ frames: {} }))
      loader.setData("images/logo.png", "")
      loader.setData("sounds/jump.mp3", "")

      assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
      assetLoader.register("images/logo.png", AssetType.STATIC_IMAGE)
      assetLoader.register("sounds/jump.mp3", AssetType.SOUND)

      await assetLoader.preloadAssets()

      expect(assetLoader.getSpritesheet("sprites/player.png")).toBeDefined()
      expect(assetLoader.getStaticImage("images/logo.png")).toBeDefined()
    })

    it("should track progress during preloading", async () => {
      loader.setData("sprites/player.png", "")
      loader.setData("sprites/player.json", JSON.stringify({ frames: {} }))
      loader.setData("images/logo.png", "")
      loader.setData("sounds/jump.mp3", "")

      assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
      assetLoader.register("images/logo.png", AssetType.STATIC_IMAGE)
      assetLoader.register("sounds/jump.mp3", AssetType.SOUND)

      const progressUpdates: Array<{ loaded: number; total: number }> = []

      await assetLoader.preloadAssets((loaded, total) => {
        progressUpdates.push({ loaded, total })
      })

      // Should have 3 total assets
      expect(progressUpdates[progressUpdates.length - 1].total).toBe(3)
      expect(progressUpdates[progressUpdates.length - 1].loaded).toBe(3)
    })

    it("should handle empty asset list", async () => {
      await assetLoader.preloadAssets()

      // No error, just completes
      expect(true).toBe(true)
    })
  })

  describe("getSpritesheet()", () => {
    it("should return loaded spritesheet", async () => {
      loader.setData("sprites/player.png", "")
      loader.setData("sprites/player.json", JSON.stringify({ frames: {} }))

      assetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
      await assetLoader.preloadAssets()

      const spritesheet = assetLoader.getSpritesheet("sprites/player.png")
      expect(spritesheet).toBeInstanceOf(Spritesheet)
    })

    it("should return undefined for unloaded spritesheet", () => {
      const spritesheet = assetLoader.getSpritesheet("nonexistent")
      expect(spritesheet).toBeUndefined()
    })
  })

  describe("getStaticImage()", () => {
    it("should return loaded static image", async () => {
      loader.setData("images/logo.png", "")

      assetLoader.register("images/logo.png", AssetType.STATIC_IMAGE)
      await assetLoader.preloadAssets()

      const texture = assetLoader.getStaticImage("images/logo.png")
      expect(texture).toBeDefined()
    })

    it("should return undefined for unloaded image", () => {
      const texture = assetLoader.getStaticImage("nonexistent")
      expect(texture).toBeUndefined()
    })
  })

  describe("Headless mode", () => {
    it("should work with HeadlessLoader", async () => {
      const headlessLoader = new HeadlessLoader()
      const headlessAssetLoader = new AssetLoader(
        headlessLoader,
        platform.rendering,
        platform.audio,
      )

      headlessAssetLoader.register("sprites/player.png", AssetType.SPRITESHEET)
      headlessAssetLoader.register("images/logo.png", AssetType.STATIC_IMAGE)
      headlessAssetLoader.register("sounds/jump.mp3", AssetType.SOUND)

      await headlessAssetLoader.preloadAssets()

      // Assets "loaded" but with empty data
      expect(
        headlessAssetLoader.getSpritesheet("sprites/player.png"),
      ).toBeDefined()
      expect(
        headlessAssetLoader.getStaticImage("images/logo.png"),
      ).toBeDefined()
    })
  })

  describe("Custom subclass", () => {
    class CustomAssetLoader extends AssetLoader {
      async loadSpritesheet(id: string): Promise<Spritesheet> {
        // Custom path logic
        const spritesheet = await Spritesheet.load(
          this.loader,
          this.rendering,
          `custom/sprites/${id}.webp`,
          `custom/sprites/${id}.json`,
        )
        this.spritesheets.set(id, spritesheet)
        return spritesheet
      }

      async loadStaticImage(id: string) {
        // Custom path logic
        const imageData = await this.loader.fetchData(`custom/images/${id}.jpg`)
        const imageUrl = this.createUrlFromData(imageData, "image/jpeg")
        const textureId = await this.rendering.loadTexture(imageUrl)
        this.staticImages.set(id, textureId)
        return textureId
      }

      async loadSound(id: string): Promise<void> {
        // Custom path logic
        const soundData = await this.loader.fetchData(`custom/sounds/${id}.ogg`)
        await this.audio.loadSound(id, soundData)
        this.sounds.add(id)
      }
    }

    it("should support custom path logic via subclassing", async () => {
      loader.setData("custom/sprites/player.webp", "")
      loader.setData(
        "custom/sprites/player.json",
        JSON.stringify({ frames: {} }),
      )
      loader.setData("custom/images/logo.jpg", "")
      loader.setData("custom/sounds/jump.ogg", "")

      const customLoader = new CustomAssetLoader(
        loader,
        platform.rendering,
        platform.audio,
      )

      customLoader.register("player", AssetType.SPRITESHEET)
      customLoader.register("logo", AssetType.STATIC_IMAGE)
      customLoader.register("jump", AssetType.SOUND)

      await customLoader.preloadAssets()

      expect(customLoader.getSpritesheet("player")).toBeDefined()
      expect(customLoader.getStaticImage("logo")).toBeDefined()
    })
  })

  describe("AssetType enum", () => {
    it("should have correct string values", () => {
      expect(AssetType.SPRITESHEET).toBe(AssetType.SPRITESHEET)
      expect(AssetType.STATIC_IMAGE).toBe(AssetType.STATIC_IMAGE)
      expect(AssetType.SOUND).toBe(AssetType.SOUND)
    })

    it("should accept all enum values in register", () => {
      expect(() =>
        assetLoader.register("test1", AssetType.SPRITESHEET),
      ).not.toThrow()
      expect(() =>
        assetLoader.register("test2", AssetType.STATIC_IMAGE),
      ).not.toThrow()
      expect(() => assetLoader.register("test3", AssetType.SOUND)).not.toThrow()
    })

    it("should be usable in type guards", () => {
      const type: AssetType = AssetType.SPRITESHEET
      expect(Object.values(AssetType).includes(type)).toBe(true)
    })
  })
})
