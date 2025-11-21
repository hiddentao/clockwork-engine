/**
 * Platform Abstraction Layer
 *
 * Main entry point for the platform abstraction system.
 * Exports all interfaces, types, and enums.
 */

// Types and branded IDs
export type { NodeId, TextureId, SpritesheetId, Color } from "./types"
export {
  BlendMode,
  TextureFiltering,
  asNodeId,
  asTextureId,
  asSpritesheetId,
} from "./types"

// Core interfaces
export type { PlatformLayer } from "./PlatformLayer"
export type { RenderingLayer, ViewportOptions } from "./RenderingLayer"
export type { AudioLayer, AudioBuffer, AudioContextState } from "./AudioLayer"
export type { InputLayer, InputEvent, KeyboardInputEvent } from "./InputLayer"

// Display Node (OOP wrapper)
export { DisplayNode } from "./DisplayNode"

// Memory Platform (for headless testing and replay)
export { MemoryRenderingLayer } from "./memory/MemoryRenderingLayer"
export { MemoryAudioLayer } from "./memory/MemoryAudioLayer"
export { MemoryInputLayer } from "./memory/MemoryInputLayer"
export { MemoryPlatformLayer } from "./memory/MemoryPlatformLayer"

// Web Platform (browser-based with PIXI.js and Web Audio API)
export { PixiRenderingLayer } from "./web/PixiRenderingLayer"
export { WebAudioLayer } from "./web/WebAudioLayer"
export { WebInputLayer } from "./web/WebInputLayer"
export { WebPlatformLayer } from "./web/WebPlatformLayer"
