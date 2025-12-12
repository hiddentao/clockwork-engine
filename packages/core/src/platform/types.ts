/**
 * Platform Abstraction Types
 *
 * This file defines branded types for type-safe IDs and common types
 * used across the platform abstraction layer.
 */

/**
 * Utility type for creating branded types.
 * Branded types prevent mixing up different ID types at compile-time.
 */
type Brand<K, T> = K & { __brand: T }

/**
 * Unique identifier for a display node in the rendering system
 */
export type NodeId = Brand<number, "NodeId">

/**
 * Unique identifier for a loaded texture
 */
export type TextureId = Brand<number, "TextureId">

/**
 * Unique identifier for a loaded spritesheet
 */
export type SpritesheetId = Brand<number, "SpritesheetId">

/**
 * Helper function to cast a number to NodeId.
 * Use carefully - only inside platform layer implementations.
 */
export function asNodeId(id: number): NodeId {
  return id as NodeId
}

/**
 * Helper function to cast a number to TextureId.
 * Use carefully - only inside platform layer implementations.
 */
export function asTextureId(id: number): TextureId {
  return id as TextureId
}

/**
 * Helper function to cast a number to SpritesheetId.
 * Use carefully - only inside platform layer implementations.
 */
export function asSpritesheetId(id: number): SpritesheetId {
  return id as SpritesheetId
}

/**
 * Color type supporting both hex and RGB object formats
 */
export type Color = number | { r: number; g: number; b: number }

/**
 * Blend modes supported across all platforms
 */
export enum BlendMode {
  NORMAL = "normal",
  ADD = "add",
  MULTIPLY = "multiply",
  SCREEN = "screen",
}

/**
 * Texture filtering modes
 */
export enum TextureFiltering {
  LINEAR = "linear", // Smooth scaling (default)
  NEAREST = "nearest", // Pixel-perfect scaling (for pixel art)
}
