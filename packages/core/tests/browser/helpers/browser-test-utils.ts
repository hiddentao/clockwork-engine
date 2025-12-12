/**
 * Browser Test Utilities
 *
 * Shared helpers for Playwright browser tests to reduce duplication.
 */

/**
 * Standard canvas size for tests (consistent across all tests)
 */
const DEFAULT_CANVAS_SIZE = {
  width: 800,
  height: 600,
}

/**
 * Helper functions that can be injected into browser context
 */
export const BROWSER_HELPERS = {
  /**
   * Extract pixels from PIXI renderer with Y-flip for WebGL coordinate system
   */
  extractPixels: `
    function extractPixels(app) {
      const { renderer } = app
      const { width, height } = renderer.screen
      const pixels = new Uint8Array(width * height * 4)
      const gl = renderer.gl
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

      const flipped = new Uint8ClampedArray(width * height * 4)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = ((height - y - 1) * width + x) * 4
          const dstIdx = (y * width + x) * 4
          flipped[dstIdx] = pixels[srcIdx]
          flipped[dstIdx + 1] = pixels[srcIdx + 1]
          flipped[dstIdx + 2] = pixels[srcIdx + 2]
          flipped[dstIdx + 3] = pixels[srcIdx + 3]
        }
      }
      return new ImageData(flipped, width, height)
    }
  `,

  /**
   * Get pixel at specific coordinates
   */
  getPixel: `
    function getPixel(imageData, x, y) {
      const index = (y * imageData.width + x) * 4
      return {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
        a: imageData.data[index + 3],
      }
    }
  `,

  /**
   * Check if pixel matches expected color within tolerance
   */
  checkPixel: `
    function checkPixel(imageData, x, y, expectedHex, tolerance = 10) {
      const index = (y * imageData.width + x) * 4
      const pixel = {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
        a: imageData.data[index + 3],
      }
      const expected = {
        r: (expectedHex >> 16) & 0xff,
        g: (expectedHex >> 8) & 0xff,
        b: expectedHex & 0xff,
      }
      return (
        Math.abs(pixel.r - expected.r) <= tolerance &&
        Math.abs(pixel.g - expected.g) <= tolerance &&
        Math.abs(pixel.b - expected.b) <= tolerance
      )
    }
  `,
}

/**
 * Setup code for creating canvas and rendering layer
 */
export function getRenderingSetup(
  width = DEFAULT_CANVAS_SIZE.width,
  height = DEFAULT_CANVAS_SIZE.height,
  options: {
    worldWidth?: number
    worldHeight?: number
    minScale?: number
    maxScale?: number
  } = {},
) {
  const worldWidth = options.worldWidth ?? width
  const worldHeight = options.worldHeight ?? height

  return `
    const { PixiRenderingLayer } = await import("/dist/platform-web-pixi.js")

    const canvas = document.createElement("canvas")
    canvas.width = ${width}
    canvas.height = ${height}
    document.body.appendChild(canvas)

    const rendering = new PixiRenderingLayer(canvas, {
      worldWidth: ${worldWidth},
      worldHeight: ${worldHeight},
      ${options.minScale !== undefined ? `minScale: ${options.minScale},` : ""}
      ${options.maxScale !== undefined ? `maxScale: ${options.maxScale},` : ""}
    })

    await rendering.init()

    const platform = { rendering }
  `
}

/**
 * Standard pixel assertions
 */
export const PixelAssertions = {
  /**
   * Assert pixel is primarily red
   */
  isRed: (pixel: { r: number; g: number; b: number }, threshold = 200) =>
    pixel.r > threshold && pixel.g < 50 && pixel.b < 50,

  /**
   * Assert pixel is primarily green
   */
  isGreen: (pixel: { r: number; g: number; b: number }, threshold = 200) =>
    pixel.r < 50 && pixel.g > threshold && pixel.b < 50,

  /**
   * Assert pixel is primarily blue
   */
  isBlue: (pixel: { r: number; g: number; b: number }, threshold = 200) =>
    pixel.r < 50 && pixel.g < 50 && pixel.b > threshold,
}
