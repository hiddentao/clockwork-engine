import type { Loader } from "../Loader"
import { getImageMimeType } from "../lib/mimeTypes"
import type { RenderingLayer, SpritesheetId, TextureId } from "../platform"

/**
 * Spritesheet wrapper that provides high-level API for working with spritesheets.
 * Wraps the platform RenderingLayer's low-level spritesheet methods.
 *
 * Example usage:
 * ```typescript
 * const sheet = await Spritesheet.load(
 *   loader,
 *   rendering,
 *   'player.png',
 *   'player.json' // optional, will try imageFile + '.json' if omitted
 * )
 *
 * const idleFrame = sheet.getTexture('player_idle_0')
 * const walkFrames = sheet.getAnimationFrames('player_walk_')
 * ```
 */
export class Spritesheet {
  private constructor(
    private readonly spritesheetId: SpritesheetId,
    private readonly rendering: RenderingLayer,
  ) {}

  /**
   * Load a spritesheet from image and JSON data.
   *
   * @param loader - Loader instance for fetching asset data
   * @param rendering - RenderingLayer for loading spritesheet
   * @param imageFile - Path to spritesheet image file
   * @param jsonFile - Optional path to JSON metadata. If omitted, uses imageFile + '.json'
   * @returns Promise resolving to Spritesheet instance
   */
  static async load(
    loader: Loader,
    rendering: RenderingLayer,
    imageFile: string,
    jsonFile?: string,
  ): Promise<Spritesheet> {
    // Load image data
    const imageData = await loader.fetchData(imageFile)
    const imageUrl = Spritesheet.createUrlFromData(
      imageData,
      getImageMimeType(imageFile),
    )

    // Load JSON data - use provided path or derive from imageFile
    const jsonPath = jsonFile || `${imageFile.replace(/\.[^.]+$/, "")}.json`
    const jsonContent = await loader.fetchData(jsonPath)

    // Parse JSON if it's a string (handle empty string for headless mode)
    let jsonData
    if (typeof jsonContent === "string") {
      jsonData = jsonContent === "" ? { frames: {} } : JSON.parse(jsonContent)
    } else {
      jsonData = jsonContent
    }

    // Load spritesheet via rendering layer
    const spritesheetId = await rendering.loadSpritesheet(imageUrl, jsonData)

    return new Spritesheet(spritesheetId, rendering)
  }

  /**
   * Get a texture by frame name.
   *
   * @param name - Frame name from the spritesheet JSON
   * @returns TextureId if found, undefined otherwise
   */
  getTexture(name: string): TextureId | undefined {
    const textureId = this.rendering.getTexture(this.spritesheetId, name)
    return textureId !== null ? textureId : undefined
  }

  /**
   * Get all texture frames matching a prefix (useful for animations).
   * Frames are returned in alphabetical order by frame name.
   *
   * @param prefix - Frame name prefix (e.g., 'player_walk_' to match 'player_walk_0', 'player_walk_1', etc.)
   * @returns Array of TextureIds matching the prefix
   */
  getAnimationFrames(prefix: string): TextureId[] {
    // This is a simple implementation that tries sequential numbering
    // More sophisticated implementations could introspect the spritesheet JSON
    const frames: TextureId[] = []
    let index = 0

    // Try up to 1000 frames (reasonable limit)
    while (index < 1000) {
      const frameName = `${prefix}${index}`
      const texture = this.rendering.getTexture(this.spritesheetId, frameName)

      if (texture === null) {
        // No more frames found
        break
      }

      frames.push(texture)
      index++
    }

    return frames
  }

  /**
   * Create a data URL from raw data for browser loading.
   * This is a utility method for converting Loader data to browser-compatible URLs.
   *
   * @param data - Raw data string (may be empty for headless)
   * @param mimeType - MIME type for the data
   * @returns Data URL or empty string for headless mode
   */
  private static createUrlFromData(data: string, mimeType: string): string {
    if (!data) {
      // Headless mode - return empty string
      // MemoryRenderingLayer handles this gracefully
      return ""
    }

    // Browser mode - create blob URL
    const blob = new Blob([data], { type: mimeType })
    return URL.createObjectURL(blob)
  }
}
