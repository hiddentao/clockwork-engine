/**
 * Color utility functions for working with hex colors and color manipulation
 */

/**
 * Parse a hex color string to a numeric color value
 * Handles colors with or without the '#' prefix
 *
 * @param color - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns Numeric color value suitable for PIXI.js
 *
 * @example
 * parseHexColor("#FF0000") // Returns 0xFF0000
 * parseHexColor("00FF00") // Returns 0x00FF00
 */
export function parseHexColor(color: string): number {
  const hexString = color.startsWith("#") ? color.slice(1) : color
  return Number.parseInt(hexString, 16)
}

/**
 * Darken a color by multiplying each RGB component by a factor
 *
 * @param color - Numeric color value
 * @param factor - Multiplier for each RGB component (0.0 to 1.0)
 * @returns Darkened color as a numeric value
 *
 * @example
 * darkenColor(0xFF8000, 0.8) // Returns darker orange
 * darkenColor(0x00FF00, 0.5) // Returns half-brightness green
 */
export function darkenColor(color: number, factor: number): number {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff

  const darkenedR = Math.floor(r * factor)
  const darkenedG = Math.floor(g * factor)
  const darkenedB = Math.floor(b * factor)

  return (darkenedR << 16) | (darkenedG << 8) | darkenedB
}
