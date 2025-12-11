/**
 * Memory Rendering Layer
 *
 * Headless rendering implementation that tracks state without actual rendering.
 * Used for testing, replay validation, and server-side game logic.
 */

import type { RenderingLayer, ViewportOptions } from "../RenderingLayer"
import type {
  BlendMode,
  Color,
  NodeId,
  SpritesheetId,
  TextureFiltering,
  TextureId,
} from "../types"
import { asNodeId, asSpritesheetId, asTextureId } from "../types"
import { EventCallbackManager } from "../utils/EventCallbackManager"
import { calculateBoundsWithAnchor } from "../utils/boundsCalculation"
import { screenToWorld, worldToScreen } from "../utils/coordinateTransforms"
import { withNode } from "../utils/nodeHelpers"

interface NodeState {
  id: NodeId
  parent: NodeId | null
  children: NodeId[]
  position: { x: number; y: number }
  rotation: number
  scale: { x: number; y: number }
  anchor: { x: number; y: number }
  alpha: number
  visible: boolean
  zIndex: number
  size: { width: number; height: number }
  tint?: Color
  blendMode?: BlendMode
  textureFiltering?: TextureFiltering
  spriteTexture?: TextureId
  animationData?: {
    textures: TextureId[]
    ticksPerFrame: number
    loop: boolean
    playing: boolean
  }
  graphics: GraphicsCommand[]
  viewport?: ViewportState
}

interface GraphicsCommand {
  type: "rectangle" | "roundRect" | "circle" | "polygon" | "line" | "polyline"
  data: any
}

interface ViewportState {
  screenWidth: number
  screenHeight: number
  worldWidth?: number
  worldHeight?: number
  position: { x: number; y: number }
  zoom: number
  options: ViewportOptions
}

export class MemoryRenderingLayer implements RenderingLayer {
  private nextNodeId = 1
  private nextTextureId = 1
  private nextSpritesheetId = 1
  private nodes = new Map<NodeId, NodeState>()
  private textures = new Map<TextureId, string>()
  private spritesheets = new Map<
    SpritesheetId,
    { url: string; data: any; frames: Map<string, TextureId> }
  >()
  private tickCallbackManager = new EventCallbackManager<number>()
  private tickerSpeed = 1
  private canvasSize = { width: 800, height: 600 }

  // Node lifecycle
  createNode(): NodeId {
    const id = asNodeId(this.nextNodeId++)
    this.nodes.set(id, {
      id,
      parent: null,
      children: [],
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      anchor: { x: 0, y: 0 },
      alpha: 1,
      visible: true,
      zIndex: 0,
      size: { width: 0, height: 0 },
      graphics: [],
    })
    return id
  }

  destroyNode(id: NodeId): void {
    this.nodes.delete(id)
  }

  // Hierarchy
  addChild(parent: NodeId, child: NodeId): void {
    const parentNode = this.nodes.get(parent)
    const childNode = this.nodes.get(child)
    if (parentNode && childNode) {
      parentNode.children.push(child)
      childNode.parent = parent
    }
  }

  removeChild(parent: NodeId, child: NodeId): void {
    const parentNode = this.nodes.get(parent)
    const childNode = this.nodes.get(child)
    if (parentNode && childNode) {
      const index = parentNode.children.indexOf(child)
      if (index !== -1) {
        parentNode.children.splice(index, 1)
      }
      childNode.parent = null
    }
  }

  // Transform
  setPosition(id: NodeId, x: number, y: number): void {
    withNode(this.nodes, id, (node) => {
      node.position = { x, y }
    })
  }

  setRotation(id: NodeId, radians: number): void {
    withNode(this.nodes, id, (node) => {
      node.rotation = radians
    })
  }

  setScale(id: NodeId, scaleX: number, scaleY: number): void {
    withNode(this.nodes, id, (node) => {
      node.scale = { x: scaleX, y: scaleY }
    })
  }

  setAnchor(id: NodeId, anchorX: number, anchorY: number): void {
    withNode(this.nodes, id, (node) => {
      node.anchor = { x: anchorX, y: anchorY }
    })
  }

  setAlpha(id: NodeId, alpha: number): void {
    withNode(this.nodes, id, (node) => {
      node.alpha = alpha
    })
  }

  setVisible(id: NodeId, visible: boolean): void {
    withNode(this.nodes, id, (node) => {
      node.visible = visible
    })
  }

  setZIndex(id: NodeId, z: number): void {
    withNode(this.nodes, id, (node) => {
      node.zIndex = z
    })
  }

  // Size
  setSize(id: NodeId, width: number, height: number): void {
    withNode(this.nodes, id, (node) => {
      node.size = { width, height }
    })
  }

  getSize(id: NodeId): { width: number; height: number } {
    return withNode(this.nodes, id, (node) => node.size, {
      width: 0,
      height: 0,
    })!
  }

  // Visual effects
  setTint(id: NodeId, color: Color): void {
    withNode(this.nodes, id, (node) => {
      node.tint = color
    })
  }

  setBlendMode(id: NodeId, mode: BlendMode): void {
    withNode(this.nodes, id, (node) => {
      node.blendMode = mode
    })
  }

  setTextureFiltering(id: NodeId, filtering: TextureFiltering): void {
    withNode(this.nodes, id, (node) => {
      node.textureFiltering = filtering
    })
  }

  // Bounds query
  getBounds(id: NodeId): {
    x: number
    y: number
    width: number
    height: number
  } {
    return withNode(
      this.nodes,
      id,
      (node) =>
        calculateBoundsWithAnchor(node.position, node.size, node.anchor),
      { x: 0, y: 0, width: 0, height: 0 },
    )!
  }

  // Visual content
  setSprite(id: NodeId, textureId: TextureId): void {
    const node = this.nodes.get(id)
    if (node) {
      node.spriteTexture = textureId
    }
  }

  setAnimatedSprite(
    id: NodeId,
    textureIds: TextureId[],
    ticksPerFrame: number,
  ): void {
    const node = this.nodes.get(id)
    if (node) {
      node.animationData = {
        textures: textureIds,
        ticksPerFrame,
        loop: false,
        playing: false,
      }
    }
  }

  playAnimation(id: NodeId, loop: boolean): void {
    const node = this.nodes.get(id)
    if (node && node.animationData) {
      node.animationData.loop = loop
      node.animationData.playing = true
    }
  }

  stopAnimation(id: NodeId): void {
    const node = this.nodes.get(id)
    if (node && node.animationData) {
      node.animationData.playing = false
    }
  }

  setAnimationCompleteCallback(
    _id: NodeId,
    _callback: ((id: NodeId) => void) | null,
  ): void {
    // Memory layer doesn't play animations, so this is a no-op
  }

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
  ): void {
    const node = this.nodes.get(id)
    if (node) {
      node.graphics.push({
        type: "rectangle",
        data: { x, y, w, h, fill, stroke, strokeWidth },
      })
    }
  }

  drawCircle(
    id: NodeId,
    x: number,
    y: number,
    radius: number,
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): void {
    const node = this.nodes.get(id)
    if (node) {
      node.graphics.push({
        type: "circle",
        data: { x, y, radius, fill, stroke, strokeWidth },
      })
    }
  }

  drawPolygon(
    id: NodeId,
    points: number[],
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): void {
    const node = this.nodes.get(id)
    if (node) {
      node.graphics.push({
        type: "polygon",
        data: { points, fill, stroke, strokeWidth },
      })
    }
  }

  drawRoundRect(
    id: NodeId,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): void {
    const node = this.nodes.get(id)
    if (node) {
      node.graphics.push({
        type: "roundRect",
        data: { x, y, w, h, radius, fill, stroke, strokeWidth },
      })
    }
  }

  drawLine(
    id: NodeId,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Color,
    width?: number,
  ): void {
    const node = this.nodes.get(id)
    if (node) {
      node.graphics.push({
        type: "line",
        data: { x1, y1, x2, y2, color, width },
      })
    }
  }

  drawPolyline(
    id: NodeId,
    points: number[],
    color: Color,
    width?: number,
  ): void {
    const node = this.nodes.get(id)
    if (node) {
      node.graphics.push({
        type: "polyline",
        data: { points, color, width },
      })
    }
  }

  clearGraphics(id: NodeId): void {
    const node = this.nodes.get(id)
    if (node) {
      node.graphics = []
    }
  }

  // Textures
  async loadTexture(url: string): Promise<TextureId> {
    const id = asTextureId(this.nextTextureId++)
    this.textures.set(id, url)
    return id
  }

  async loadSpritesheet(
    imageUrl: string,
    jsonData: any,
  ): Promise<SpritesheetId> {
    const id = asSpritesheetId(this.nextSpritesheetId++)
    const frames = new Map<string, TextureId>()

    // Parse spritesheet frames
    if (jsonData?.frames) {
      for (const frameName of Object.keys(jsonData.frames)) {
        const textureId = asTextureId(this.nextTextureId++)
        frames.set(frameName, textureId)
        this.textures.set(textureId, `${imageUrl}#${frameName}`)
      }
    }

    this.spritesheets.set(id, {
      url: imageUrl,
      data: jsonData,
      frames,
    })

    return id
  }

  getTexture(spritesheet: SpritesheetId, frameName: string): TextureId | null {
    const sheet = this.spritesheets.get(spritesheet)
    return sheet?.frames.get(frameName) ?? null
  }

  // Viewport
  setViewport(id: NodeId, options: ViewportOptions): void {
    const node = this.nodes.get(id)
    if (node) {
      node.viewport = {
        screenWidth: options.screenWidth,
        screenHeight: options.screenHeight,
        worldWidth: options.worldWidth,
        worldHeight: options.worldHeight,
        position: { x: 0, y: 0 },
        zoom: 1,
        options,
      }
    }
  }

  getViewportPosition(id: NodeId): { x: number; y: number } {
    return withNode(
      this.nodes,
      id,
      (node) => node.viewport?.position ?? { x: 0, y: 0 },
      { x: 0, y: 0 },
    )!
  }

  setViewportPosition(id: NodeId, x: number, y: number): void {
    withNode(this.nodes, id, (node) => {
      if (node.viewport) {
        node.viewport.position = { x, y }
      }
    })
  }

  setViewportZoom(id: NodeId, zoom: number): void {
    withNode(this.nodes, id, (node) => {
      if (node.viewport) {
        node.viewport.zoom = zoom
      }
    })
  }

  getViewportZoom(id: NodeId): number {
    return withNode(this.nodes, id, (node) => node.viewport?.zoom ?? 1, 1)!
  }

  worldToScreen(id: NodeId, x: number, y: number): { x: number; y: number } {
    return withNode(
      this.nodes,
      id,
      (node) =>
        node.viewport
          ? worldToScreen(x, y, node.viewport.position, node.viewport.zoom)
          : { x, y },
      { x, y },
    )!
  }

  screenToWorld(id: NodeId, x: number, y: number): { x: number; y: number } {
    return withNode(
      this.nodes,
      id,
      (node) =>
        node.viewport
          ? screenToWorld(x, y, node.viewport.position, node.viewport.zoom)
          : { x, y },
      { x, y },
    )!
  }

  // Game loop
  onTick(callback: (deltaTicks: number) => void): void {
    this.tickCallbackManager.register(callback)
  }

  setTickerSpeed(speed: number): void {
    this.tickerSpeed = speed
  }

  getFPS(): number {
    return 60
  }

  // Manual rendering
  render(): void {
    // No-op for headless rendering
  }

  // Canvas resize
  resize(width: number, height: number): void {
    this.canvasSize = { width, height }
  }

  // Cleanup
  destroy(): void {
    this.nodes.clear()
    this.textures.clear()
    this.spritesheets.clear()
    this.tickCallbackManager.clear()
  }

  // Test helpers (not part of RenderingLayer interface)
  hasNode(id: NodeId): boolean {
    return this.nodes.has(id)
  }

  getChildren(id: NodeId): NodeId[] {
    return withNode(this.nodes, id, (node) => [...node.children], [])!
  }

  getPosition(id: NodeId): { x: number; y: number } {
    return withNode(this.nodes, id, (node) => ({ ...node.position }), {
      x: 0,
      y: 0,
    })!
  }

  getRotation(id: NodeId): number {
    return withNode(this.nodes, id, (node) => node.rotation, 0)!
  }

  getScale(id: NodeId): { x: number; y: number } {
    return withNode(this.nodes, id, (node) => ({ ...node.scale }), {
      x: 1,
      y: 1,
    })!
  }

  getAnchor(id: NodeId): { x: number; y: number } {
    return withNode(this.nodes, id, (node) => ({ ...node.anchor }), {
      x: 0,
      y: 0,
    })!
  }

  getAlpha(id: NodeId): number {
    return withNode(this.nodes, id, (node) => node.alpha, 1)!
  }

  getVisible(id: NodeId): boolean {
    return withNode(this.nodes, id, (node) => node.visible, true)!
  }

  getZIndex(id: NodeId): number {
    return withNode(this.nodes, id, (node) => node.zIndex, 0)!
  }

  getTint(id: NodeId): Color | undefined {
    return withNode(this.nodes, id, (node) => node.tint, undefined)!
  }

  getBlendMode(id: NodeId): BlendMode | undefined {
    return withNode(this.nodes, id, (node) => node.blendMode, undefined)!
  }

  getTextureFiltering(id: NodeId): TextureFiltering | undefined {
    return withNode(this.nodes, id, (node) => node.textureFiltering, undefined)!
  }

  getSpriteTexture(id: NodeId): TextureId | undefined {
    return withNode(this.nodes, id, (node) => node.spriteTexture, undefined)!
  }

  getAnimationData(id: NodeId) {
    return withNode(this.nodes, id, (node) => node.animationData, undefined)!
  }

  isAnimationPlaying(id: NodeId): boolean {
    return withNode(
      this.nodes,
      id,
      (node) => node.animationData?.playing ?? false,
      false,
    )!
  }

  getGraphics(id: NodeId): GraphicsCommand[] {
    return withNode(this.nodes, id, (node) => [...node.graphics], [])!
  }

  getViewportData(id: NodeId): ViewportState | undefined {
    return withNode(this.nodes, id, (node) => node.viewport, undefined)!
  }

  getTickerSpeed(): number {
    return this.tickerSpeed
  }

  getCanvasSize(): { width: number; height: number } {
    return { ...this.canvasSize }
  }

  // Manual tick for testing
  tick(deltaTicks: number): void {
    this.tickCallbackManager.trigger(deltaTicks)
  }
}
