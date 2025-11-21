/**
 * Canvas Pixel Testing Utilities
 *
 * Helpers for reading and verifying pixel data from canvas rendering.
 */

export interface Pixel {
  r: number
  g: number
  b: number
  a: number
}

export interface ColorRange {
  r: [number, number]
  g: [number, number]
  b: [number, number]
  a?: [number, number]
}

/**
 * Get pixel data from specific coordinates
 */
export function getPixelAt(imageData: ImageData, x: number, y: number): Pixel {
  const index = (y * imageData.width + x) * 4
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
    a: imageData.data[index + 3],
  }
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  }
}

/**
 * Check if pixel matches expected color (within tolerance)
 */
export function pixelMatchesColor(
  pixel: Pixel,
  expectedHex: number,
  tolerance = 5,
): boolean {
  const expected = hexToRgb(expectedHex)
  return (
    Math.abs(pixel.r - expected.r) <= tolerance &&
    Math.abs(pixel.g - expected.g) <= tolerance &&
    Math.abs(pixel.b - expected.b) <= tolerance
  )
}

/**
 * Check if pixel is within color range
 */
export function pixelInRange(pixel: Pixel, range: ColorRange): boolean {
  const rMatch = pixel.r >= range.r[0] && pixel.r <= range.r[1]
  const gMatch = pixel.g >= range.g[0] && pixel.g <= range.g[1]
  const bMatch = pixel.b >= range.b[0] && pixel.b <= range.b[1]

  if (range.a) {
    const aMatch = pixel.a >= range.a[0] && pixel.a <= range.a[1]
    return rMatch && gMatch && bMatch && aMatch
  }

  return rMatch && gMatch && bMatch
}

/**
 * Count pixels matching a color (useful for shape verification)
 */
export function countMatchingPixels(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number,
  expectedHex: number,
  tolerance = 5,
): number {
  let count = 0
  const expected = hexToRgb(expectedHex)

  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) {
      const pixel = getPixelAt(imageData, px, py)
      if (
        Math.abs(pixel.r - expected.r) <= tolerance &&
        Math.abs(pixel.g - expected.g) <= tolerance &&
        Math.abs(pixel.b - expected.b) <= tolerance
      ) {
        count++
      }
    }
  }

  return count
}

/**
 * Get canvas image data (helper)
 */
export function getCanvasImageData(
  canvas: HTMLCanvasElement,
): ImageData | null {
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/**
 * Force PIXI renderer to render to canvas
 * (PIXI uses WebGL, need to extract pixels)
 */
export function extractPixelsFromPIXI(app: any): ImageData {
  const { renderer } = app
  const { width, height } = renderer

  // Create buffer for pixel data
  const pixels = new Uint8Array(width * height * 4)

  // Read pixels from WebGL
  const gl = renderer.gl
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  // Flip Y coordinate (WebGL uses bottom-left origin)
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
