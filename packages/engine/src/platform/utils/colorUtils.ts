/**
 * Color Utilities
 *
 * Shared functions for color conversion and manipulation.
 */

import type { Color } from "../types"

/**
 * Convert RGB object to hex number
 *
 * @param rgb RGB color object
 * @returns Hex color number
 */
export function rgbToHex(rgb: { r: number; g: number; b: number }): number {
  return (rgb.r << 16) | (rgb.g << 8) | rgb.b
}

/**
 * Normalize color to hex number
 *
 * Accepts either hex number or RGB object and returns hex number.
 *
 * @param color Color in either format
 * @returns Hex color number
 */
export function normalizeColor(color: Color): number {
  return typeof color === "number" ? color : rgbToHex(color)
}
