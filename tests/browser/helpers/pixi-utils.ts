/**
 * PIXI Scene Graph Testing Utilities
 *
 * Helpers for inspecting and verifying PIXI rendering state and hierarchy.
 */

import type { Container } from "pixi.js"

export interface PIXINodeInfo {
  visible: boolean
  alpha: number
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  zIndex: number
  childrenCount: number
  tint?: number
}

/**
 * Extract comprehensive info from a PIXI container
 */
export function getNodeInfo(container: Container): PIXINodeInfo {
  return {
    visible: container.visible,
    alpha: container.alpha,
    x: container.x,
    y: container.y,
    rotation: container.rotation,
    scaleX: container.scale.x,
    scaleY: container.scale.y,
    zIndex: container.zIndex,
    childrenCount: container.children.length,
    tint: (container as any).tint, // Some containers have tint
  }
}

/**
 * Verify container hierarchy
 */
export function verifyHierarchy(
  parent: Container,
  expectedChildCount: number,
): boolean {
  return parent.children.length === expectedChildCount
}

/**
 * Get child at specific index
 */
export function getChildAt(parent: Container, index: number): Container | null {
  if (index < 0 || index >= parent.children.length) {
    return null
  }
  return parent.children[index] as Container
}

/**
 * Check if container has a specific child
 */
export function hasChild(parent: Container, child: Container): boolean {
  return parent.children.includes(child)
}

/**
 * Get all children as array
 */
export function getChildren(parent: Container): Container[] {
  return Array.from(parent.children) as Container[]
}

/**
 * Find container by property
 */
export function findByProperty(
  parent: Container,
  property: string,
  value: any,
): Container | null {
  for (const child of parent.children) {
    if ((child as any)[property] === value) {
      return child as Container
    }
  }
  return null
}

/**
 * Count visible children
 */
export function countVisibleChildren(parent: Container): number {
  return parent.children.filter((child) => child.visible).length
}

/**
 * Verify transform properties
 */
export function verifyTransform(
  container: Container,
  expected: {
    x?: number
    y?: number
    rotation?: number
    scaleX?: number
    scaleY?: number
    alpha?: number
  },
  tolerance = 0.01,
): boolean {
  if (expected.x !== undefined) {
    if (Math.abs(container.x - expected.x) > tolerance) return false
  }
  if (expected.y !== undefined) {
    if (Math.abs(container.y - expected.y) > tolerance) return false
  }
  if (expected.rotation !== undefined) {
    if (Math.abs(container.rotation - expected.rotation) > tolerance)
      return false
  }
  if (expected.scaleX !== undefined) {
    if (Math.abs(container.scale.x - expected.scaleX) > tolerance) return false
  }
  if (expected.scaleY !== undefined) {
    if (Math.abs(container.scale.y - expected.scaleY) > tolerance) return false
  }
  if (expected.alpha !== undefined) {
    if (Math.abs(container.alpha - expected.alpha) > tolerance) return false
  }
  return true
}

/**
 * Get global position (including parent transforms)
 */
export function getGlobalPosition(container: Container): {
  x: number
  y: number
} {
  const globalPos = container.getGlobalPosition()
  return { x: globalPos.x, y: globalPos.y }
}

/**
 * Check if container is within bounds
 */
export function isWithinBounds(
  container: Container,
  bounds: { x: number; y: number; width: number; height: number },
): boolean {
  const pos = getGlobalPosition(container)
  return (
    pos.x >= bounds.x &&
    pos.x <= bounds.x + bounds.width &&
    pos.y >= bounds.y &&
    pos.y <= bounds.y + bounds.height
  )
}

/**
 * Get container bounds (local)
 */
export function getLocalBounds(container: Container): {
  x: number
  y: number
  width: number
  height: number
} {
  const bounds = container.getLocalBounds()
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

/**
 * Traverse scene graph depth-first
 */
export function traverseSceneGraph(
  container: Container,
  callback: (node: Container, depth: number) => void,
  depth = 0,
): void {
  callback(container, depth)
  for (const child of container.children) {
    traverseSceneGraph(child as Container, callback, depth + 1)
  }
}

/**
 * Count total nodes in scene graph
 */
export function countNodes(container: Container): number {
  let count = 1 // Count self
  for (const child of container.children) {
    count += countNodes(child as Container)
  }
  return count
}

/**
 * Verify sprite texture is loaded
 */
export function hasSpriteTexture(sprite: any): boolean {
  return sprite.texture && sprite.texture.valid
}

/**
 * Get Graphics primitive count
 */
export function getGraphicsPrimitiveCount(graphics: any): number {
  if (!graphics || !graphics.geometry) return 0
  return graphics.geometry.graphicsData?.length || 0
}
