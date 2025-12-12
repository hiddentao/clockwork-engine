/**
 * Coordinate Transform Utilities
 *
 * Shared functions for world-to-screen and screen-to-world coordinate transformations.
 */

/**
 * Transform world coordinates to screen coordinates
 *
 * @param worldX World X coordinate
 * @param worldY World Y coordinate
 * @param viewportPosition Viewport position in world space
 * @param zoom Viewport zoom level
 * @returns Screen coordinates
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewportPosition: { x: number; y: number },
  zoom: number,
): { x: number; y: number } {
  return {
    x: (worldX - viewportPosition.x) * zoom,
    y: (worldY - viewportPosition.y) * zoom,
  }
}

/**
 * Transform screen coordinates to world coordinates
 *
 * @param screenX Screen X coordinate
 * @param screenY Screen Y coordinate
 * @param viewportPosition Viewport position in world space
 * @param zoom Viewport zoom level
 * @returns World coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewportPosition: { x: number; y: number },
  zoom: number,
): { x: number; y: number } {
  return {
    x: screenX / zoom + viewportPosition.x,
    y: screenY / zoom + viewportPosition.y,
  }
}
