/**
 * Bounds Calculation Utilities
 *
 * Shared functions for calculating bounds with anchor offsets.
 */

/**
 * Calculate bounds with anchor offset
 *
 * @param position Object position
 * @param size Object size
 * @param anchor Anchor point (0-1 normalized)
 * @returns Bounding rectangle
 */
export function calculateBoundsWithAnchor(
  position: { x: number; y: number },
  size: { width: number; height: number },
  anchor: { x: number; y: number },
): {
  x: number
  y: number
  width: number
  height: number
} {
  return {
    x: position.x - size.width * anchor.x,
    y: position.y - size.height * anchor.y,
    width: size.width,
    height: size.height,
  }
}
