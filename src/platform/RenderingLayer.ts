/**
 * Rendering Layer Interface
 *
 * Platform-agnostic rendering abstraction that wraps rendering engines
 * like PIXI.js, Canvas2D, or provides headless implementations.
 */

import type {
  BlendMode,
  Color,
  NodeId,
  SpritesheetId,
  TextureFiltering,
  TextureId,
} from "./types"

/**
 * Viewport configuration options
 */
export interface ViewportOptions {
  screenWidth: number
  screenHeight: number
  worldWidth?: number
  worldHeight?: number
  enableDrag?: boolean
  enableZoom?: boolean
  enablePinch?: boolean
  clampWheel?: boolean
  minScale?: number
  maxScale?: number
}

/**
 * Main rendering layer interface
 */
export interface RenderingLayer {
  // Node lifecycle
  createNode(): NodeId
  destroyNode(id: NodeId): void

  // Hierarchy
  addChild(parent: NodeId, child: NodeId): void
  removeChild(parent: NodeId, child: NodeId): void

  // Transform
  setPosition(id: NodeId, x: number, y: number): void
  setRotation(id: NodeId, radians: number): void
  setScale(id: NodeId, scaleX: number, scaleY: number): void
  setAnchor(id: NodeId, anchorX: number, anchorY: number): void
  setAlpha(id: NodeId, alpha: number): void
  setVisible(id: NodeId, visible: boolean): void
  setZIndex(id: NodeId, z: number): void

  // Size
  setSize(id: NodeId, width: number, height: number): void
  getSize(id: NodeId): { width: number; height: number }

  // Visual effects
  setTint(id: NodeId, color: Color): void
  setBlendMode(id: NodeId, mode: BlendMode): void
  setTextureFiltering(id: NodeId, filtering: TextureFiltering): void

  // Bounds query
  getBounds(id: NodeId): { x: number; y: number; width: number; height: number }

  // Visual content
  setSprite(id: NodeId, textureId: TextureId): void
  setAnimatedSprite(
    id: NodeId,
    textureIds: TextureId[],
    ticksPerFrame: number,
  ): void
  playAnimation(id: NodeId, loop: boolean): void
  stopAnimation(id: NodeId): void

  // Primitives
  drawRectangle(
    id: NodeId,
    x: number,
    y: number,
    w: number,
    h: number,
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): void
  drawCircle(
    id: NodeId,
    x: number,
    y: number,
    radius: number,
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): void
  drawPolygon(
    id: NodeId,
    points: number[],
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): void

  // Line drawing
  drawLine(
    id: NodeId,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Color,
    width?: number,
  ): void
  drawPolyline(id: NodeId, points: number[], color: Color, width?: number): void

  clearGraphics(id: NodeId): void

  // Textures
  loadTexture(url: string): Promise<TextureId>
  loadSpritesheet(imageUrl: string, jsonData: any): Promise<SpritesheetId>
  getTexture(spritesheet: SpritesheetId, frameName: string): TextureId | null

  // Viewport
  setViewport(id: NodeId, options: ViewportOptions): void
  getViewportPosition(id: NodeId): { x: number; y: number }
  setViewportPosition(id: NodeId, x: number, y: number): void
  setViewportZoom(id: NodeId, zoom: number): void
  getViewportZoom(id: NodeId): number
  worldToScreen(id: NodeId, x: number, y: number): { x: number; y: number }
  screenToWorld(id: NodeId, x: number, y: number): { x: number; y: number }

  // Game loop
  onTick(callback: (deltaTicks: number) => void): void
  setTickerSpeed(speed: number): void

  // Manual rendering
  render(): void

  // Canvas resize
  resize(width: number, height: number): void
}
