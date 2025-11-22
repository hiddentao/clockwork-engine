import type { Loader } from "../Loader"
import type { AudioLayer, RenderingLayer, TextureId } from "../platform"
import { Spritesheet } from "./Spritesheet"

export type AssetType = "spritesheet" | "staticImage" | "sound"

/**
 * Asset loader for managing game assets with registration and preloading.
 * Based on patterns from game-base and tiki-kong.
 *
 * Games can use directly or extend for custom loading behavior.
 *
 * Example usage (direct):
 * ```typescript
 * const assetLoader = new AssetLoader(loader, rendering, audio)
 * assetLoader.register('sprites/player.png', 'spritesheet')  // Full path
 * assetLoader.register('images/logo.png', 'staticImage')
 * assetLoader.register('sounds/jump.mp3', 'sound')
 *
 * await assetLoader.preloadAssets((loaded, total) => {
 *   console.log(`Loading: ${loaded}/${total}`)
 * })
 *
 * const playerSheet = assetLoader.getSpritesheet('sprites/player.png')
 * ```
 *
 * Example usage (custom subclass for path conventions):
 * ```typescript
 * class MyAssetLoader extends AssetLoader {
 *   async loadSpritesheet(id: string): Promise<Spritesheet> {
 *     // Add custom path prefix
 *     const sheet = await Spritesheet.load(
 *       this.loader,
 *       this.rendering,
 *       `assets/sprites/${id}.png`
 *     )
 *     this.spritesheets.set(id, sheet)
 *     return sheet
 *   }
 * }
 * // Then use: assetLoader.register('player', 'spritesheet')
 * ```
 */
export class AssetLoader {
  protected spritesheets = new Map<string, Spritesheet>()
  protected staticImages = new Map<string, TextureId>()
  protected sounds = new Set<string>()

  // Asset registration
  protected registeredSpritesheets: string[] = []
  protected registeredStaticImages: string[] = []
  protected registeredSounds: string[] = []

  constructor(
    protected loader: Loader,
    protected rendering: RenderingLayer,
    protected audio: AudioLayer,
  ) {}

  /**
   * Register an asset for preloading.
   * Call this during game initialization for all required assets.
   *
   * @param id - Asset identifier
   * @param type - Asset type (spritesheet, staticImage, sound)
   */
  register(id: string, type: AssetType): void {
    switch (type) {
      case "spritesheet":
        if (!this.registeredSpritesheets.includes(id)) {
          this.registeredSpritesheets.push(id)
        }
        break
      case "staticImage":
        if (!this.registeredStaticImages.includes(id)) {
          this.registeredStaticImages.push(id)
        }
        break
      case "sound":
        if (!this.registeredSounds.includes(id)) {
          this.registeredSounds.push(id)
        }
        break
    }
  }

  /**
   * Preload all registered assets.
   * Called by GameEngine.reset() before setup().
   *
   * @param onProgress - Optional callback for tracking progress (loaded, total)
   */
  async preloadAssets(
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    const tasks: Promise<void>[] = []
    let loaded = 0
    const total =
      this.registeredSpritesheets.length +
      this.registeredStaticImages.length +
      this.registeredSounds.length

    const trackProgress = () => {
      loaded++
      onProgress?.(loaded, total)
    }

    // Load spritesheets
    for (const id of this.registeredSpritesheets) {
      tasks.push(
        this.loadSpritesheet(id).then(() => {
          trackProgress()
        }),
      )
    }

    // Load static images
    for (const id of this.registeredStaticImages) {
      tasks.push(
        this.loadStaticImage(id).then(() => {
          trackProgress()
        }),
      )
    }

    // Load sounds
    for (const id of this.registeredSounds) {
      tasks.push(
        this.loadSound(id).then(() => {
          trackProgress()
        }),
      )
    }

    await Promise.all(tasks)
  }

  /**
   * Load a spritesheet asset.
   * Virtual method - games can override in subclass for custom logic.
   *
   * Default implementation uses the ID as the file path directly.
   * Register with full path: `assetLoader.register('sprites/player.png', 'spritesheet')`
   *
   * @param id - Asset path (e.g., 'sprites/player.png')
   * @returns Promise resolving to Spritesheet instance
   */
  async loadSpritesheet(id: string): Promise<Spritesheet> {
    const spritesheet = await Spritesheet.load(this.loader, this.rendering, id)
    this.spritesheets.set(id, spritesheet)
    return spritesheet
  }

  /**
   * Load a static image asset.
   * Virtual method - games can override in subclass for custom logic.
   *
   * Default implementation uses the ID as the file path directly.
   * Register with full path: `assetLoader.register('images/logo.png', 'staticImage')`
   *
   * @param id - Asset path (e.g., 'images/logo.png')
   * @returns Promise resolving to TextureId
   */
  async loadStaticImage(id: string): Promise<TextureId> {
    const imageData = await this.loader.fetchData(id)
    const imageUrl = this.createUrlFromData(imageData, "image/png")
    const textureId = await this.rendering.loadTexture(imageUrl)
    this.staticImages.set(id, textureId)
    return textureId
  }

  /**
   * Load a sound asset.
   * Virtual method - games can override in subclass for custom logic.
   *
   * Default implementation uses the ID as the file path directly.
   * Register with full path: `assetLoader.register('sounds/jump.mp3', 'sound')`
   *
   * @param id - Asset path (e.g., 'sounds/jump.mp3')
   */
  async loadSound(id: string): Promise<void> {
    const soundData = await this.loader.fetchData(id)
    await this.audio.loadSound(id, soundData)
    this.sounds.add(id)
  }

  /**
   * Get a loaded spritesheet by ID.
   *
   * @param id - Spritesheet identifier
   * @returns Spritesheet instance if loaded, undefined otherwise
   */
  getSpritesheet(id: string): Spritesheet | undefined {
    return this.spritesheets.get(id)
  }

  /**
   * Get a loaded static image by ID.
   *
   * @param id - Image identifier
   * @returns TextureId if loaded, undefined otherwise
   */
  getStaticImage(id: string): TextureId | undefined {
    return this.staticImages.get(id)
  }

  /**
   * Create a data URL from raw data for browser loading.
   * This is a utility method for converting Loader data to browser-compatible URLs.
   *
   * @param data - Raw data string (may be empty for headless)
   * @param mimeType - MIME type for the data
   * @returns Data URL or empty string for headless mode
   */
  protected createUrlFromData(data: string, mimeType: string): string {
    if (!data) {
      // Headless mode - return empty string
      // MemoryRenderingLayer and MemoryAudioLayer handle this gracefully
      return ""
    }

    // Browser mode - create blob URL
    const blob = new Blob([data], { type: mimeType })
    return URL.createObjectURL(blob)
  }
}
