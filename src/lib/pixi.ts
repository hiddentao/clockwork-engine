/**
 * Centralized PIXI.js and pixi-viewport exports
 * This file serves as the single source for all PIXI-related imports
 * to ensure version consistency and easier dependency management
 */

// Re-export all PIXI.js functionality
export * as PIXI from "pixi.js"

// Re-export pixi-viewport components
export { Viewport } from "pixi-viewport"
export type { IViewportOptions } from "pixi-viewport"

// Re-export commonly used PIXI types that may be needed by consumers
export type {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
  ColorSource,
} from "pixi.js"
