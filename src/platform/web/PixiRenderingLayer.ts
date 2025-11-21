/**
 * PIXI Rendering Layer
 *
 * PIXI.js-based rendering implementation with viewport support.
 */

import { Viewport } from "pixi-viewport"
import * as PIXI from "pixi.js"
import type { RenderingLayer, ViewportOptions } from "../RenderingLayer"
import type {
  BlendMode,
  Color,
  NodeId,
  SpritesheetId,
  TextureId,
} from "../types"
import {
  TextureFiltering,
  asNodeId,
  asSpritesheetId,
  asTextureId,
} from "../types"

interface NodeState {
  container: PIXI.Container
  size: { width: number; height: number }
  anchor: { x: number; y: number }
  tint: Color | null
  blendMode: BlendMode
  textureFiltering: TextureFiltering
  currentSprite: PIXI.Sprite | PIXI.AnimatedSprite | null
  graphics: PIXI.Graphics | null
  graphicsCommands: Array<{
    type: "rectangle" | "circle" | "polygon" | "line" | "polyline"
    data: any
  }>
  animationData: {
    textures: TextureId[]
    ticksPerFrame: number
    loop: boolean
  } | null
  isAnimationPlaying: boolean
}

export class PixiRenderingLayer implements RenderingLayer {
  private app!: PIXI.Application
  private viewport!: Viewport
  private canvas: HTMLCanvasElement
  private options: ViewportOptions
  private nodes = new Map<NodeId, NodeState>()
  private nextNodeId = 1
  private textures = new Map<TextureId, PIXI.Texture>()
  private spritesheets = new Map<
    SpritesheetId,
    { tileWidth: number; tileHeight: number }
  >()
  private _needsRepaint = false
  private initialized = false

  constructor(canvas: HTMLCanvasElement, options: ViewportOptions) {
    this.canvas = canvas
    this.options = options
  }

  async init(): Promise<void> {
    if (this.initialized) return

    this.app = new PIXI.Application()
    await this.app.init({
      canvas: this.canvas,
      width: this.canvas.width,
      height: this.canvas.height,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    })

    this.viewport = new Viewport({
      screenWidth: this.canvas.width,
      screenHeight: this.canvas.height,
      worldWidth: this.options.worldWidth,
      worldHeight: this.options.worldHeight,
      events: this.app.renderer.events,
    })

    if (
      this.options.maxScale !== undefined ||
      this.options.minScale !== undefined
    ) {
      this.viewport.clampZoom({
        maxScale: this.options.maxScale,
        minScale: this.options.minScale,
      })
    }

    this.viewport.drag().wheel().pinch()
    this.app.stage.addChild(this.viewport)
    this.initialized = true
  }

  get needsRepaint(): boolean {
    return this._needsRepaint
  }

  destroy(): void {
    this.viewport.destroy()
    this.app.destroy(true, { children: true, texture: false })
    this.nodes.clear()
    this.textures.clear()
    this.spritesheets.clear()
  }

  createNode(): NodeId {
    const id = asNodeId(this.nextNodeId++)
    const container = new PIXI.Container()

    this.nodes.set(id, {
      container,
      size: { width: 0, height: 0 },
      anchor: { x: 0, y: 0 },
      tint: null,
      blendMode: "normal" as BlendMode,
      textureFiltering: "linear" as TextureFiltering,
      currentSprite: null,
      graphics: null,
      graphicsCommands: [],
      animationData: null,
      isAnimationPlaying: false,
    })

    this.viewport.addChild(container)
    this._needsRepaint = true
    return id
  }

  destroyNode(id: NodeId): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.container.destroy({ children: true })
    this.nodes.delete(id)
    this._needsRepaint = true
  }

  hasNode(id: NodeId): boolean {
    return this.nodes.has(id)
  }

  addChild(parentId: NodeId, childId: NodeId): void {
    const parent = this.nodes.get(parentId)
    const child = this.nodes.get(childId)
    if (!parent || !child) return

    if (child.container.parent) {
      child.container.parent.removeChild(child.container)
    }

    parent.container.addChild(child.container)
    this._needsRepaint = true
  }

  removeChild(parentId: NodeId, childId: NodeId): void {
    const parent = this.nodes.get(parentId)
    const child = this.nodes.get(childId)
    if (!parent || !child) return

    parent.container.removeChild(child.container)
    this.viewport.addChild(child.container)
    this._needsRepaint = true
  }

  getChildren(id: NodeId): NodeId[] {
    const state = this.nodes.get(id)
    if (!state) return []

    const children: NodeId[] = []
    for (const [nodeId, nodeState] of this.nodes) {
      if (nodeState.container.parent === state.container) {
        children.push(nodeId)
      }
    }
    return children
  }

  getParent(id: NodeId): NodeId | null {
    const state = this.nodes.get(id)
    if (!state || !state.container.parent) return null

    for (const [nodeId, nodeState] of this.nodes) {
      if (nodeState.container === state.container.parent) {
        return nodeId
      }
    }
    return null
  }

  setPosition(id: NodeId, x: number, y: number): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.container.x = x
    state.container.y = y
    this._needsRepaint = true
  }

  getPosition(id: NodeId): { x: number; y: number } {
    const state = this.nodes.get(id)
    if (!state) return { x: 0, y: 0 }

    return { x: state.container.x, y: state.container.y }
  }

  setRotation(id: NodeId, radians: number): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.container.rotation = radians
    this._needsRepaint = true
  }

  getRotation(id: NodeId): number {
    const state = this.nodes.get(id)
    return state?.container.rotation ?? 0
  }

  setScale(id: NodeId, scaleX: number, scaleY: number): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.container.scale.set(scaleX, scaleY)
    this._needsRepaint = true
  }

  getScale(id: NodeId): { x: number; y: number } {
    const state = this.nodes.get(id)
    if (!state) return { x: 1, y: 1 }

    return { x: state.container.scale.x, y: state.container.scale.y }
  }

  setAnchor(id: NodeId, anchorX: number, anchorY: number): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.anchor = { x: anchorX, y: anchorY }

    if (state.currentSprite && "anchor" in state.currentSprite) {
      state.currentSprite.anchor.set(anchorX, anchorY)
    }

    this._needsRepaint = true
  }

  getAnchor(id: NodeId): { x: number; y: number } {
    const state = this.nodes.get(id)
    return state?.anchor ?? { x: 0, y: 0 }
  }

  setAlpha(id: NodeId, alpha: number): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.container.alpha = alpha
    this._needsRepaint = true
  }

  getAlpha(id: NodeId): number {
    const state = this.nodes.get(id)
    return state?.container.alpha ?? 1
  }

  setVisible(id: NodeId, visible: boolean): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.container.visible = visible
    this._needsRepaint = true
  }

  getVisible(id: NodeId): boolean {
    const state = this.nodes.get(id)
    return state?.container.visible ?? true
  }

  setZIndex(id: NodeId, z: number): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.container.zIndex = z
    this._needsRepaint = true
  }

  getZIndex(id: NodeId): number {
    const state = this.nodes.get(id)
    return state?.container.zIndex ?? 0
  }

  setSize(id: NodeId, width: number, height: number): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.size = { width, height }

    if (state.currentSprite) {
      state.currentSprite.width = width
      state.currentSprite.height = height
    }

    this._needsRepaint = true
  }

  getSize(id: NodeId): { width: number; height: number } {
    const state = this.nodes.get(id)
    return state?.size ?? { width: 0, height: 0 }
  }

  setTint(id: NodeId, color: Color): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.tint = color

    if (state.currentSprite) {
      const tintValue = typeof color === "number" ? color : this.rgbToHex(color)
      state.currentSprite.tint = tintValue
    }

    this._needsRepaint = true
  }

  getTint(id: NodeId): Color | null {
    const state = this.nodes.get(id)
    return state?.tint ?? null
  }

  setBlendMode(id: NodeId, mode: BlendMode): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.blendMode = mode

    const pixiBlendMode = this.toPixiBlendMode(mode)
    if (state.currentSprite) {
      state.currentSprite.blendMode = pixiBlendMode
    }
    if (state.graphics) {
      state.graphics.blendMode = pixiBlendMode
    }

    this._needsRepaint = true
  }

  getBlendMode(id: NodeId): BlendMode {
    const state = this.nodes.get(id)
    return state?.blendMode ?? ("normal" as BlendMode)
  }

  setTextureFiltering(id: NodeId, filtering: TextureFiltering): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.textureFiltering = filtering

    if (state.currentSprite && state.currentSprite.texture) {
      state.currentSprite.texture.source.scaleMode =
        filtering === "nearest" ? "nearest" : "linear"
    }

    this._needsRepaint = true
  }

  getTextureFiltering(id: NodeId): TextureFiltering {
    const state = this.nodes.get(id)
    return state?.textureFiltering ?? ("linear" as TextureFiltering)
  }

  getBounds(id: NodeId): {
    x: number
    y: number
    width: number
    height: number
  } {
    const state = this.nodes.get(id)
    if (!state) return { x: 0, y: 0, width: 0, height: 0 }

    const x = state.container.x - state.size.width * state.anchor.x
    const y = state.container.y - state.size.height * state.anchor.y

    return {
      x,
      y,
      width: state.size.width,
      height: state.size.height,
    }
  }

  async loadTexture(url: string): Promise<TextureId> {
    const id = asTextureId(this.textures.size + 1)
    try {
      const texture = await PIXI.Assets.load(url)
      this.textures.set(id, texture)
    } catch (_error) {
      const errorTexture = this.createErrorTexture()
      this.textures.set(id, errorTexture)
    }
    return id
  }

  async loadSpritesheet(
    _imageUrl: string,
    jsonData: any,
  ): Promise<SpritesheetId> {
    const id = asSpritesheetId(this.spritesheets.size + 1)
    const tileWidth = jsonData.tileWidth ?? 32
    const tileHeight = jsonData.tileHeight ?? 32
    this.spritesheets.set(id, { tileWidth, tileHeight })
    return id
  }

  setSprite(id: NodeId, textureId: TextureId): void {
    const state = this.nodes.get(id)
    if (!state) return

    this.clearCurrentVisual(state)

    const texture = this.textures.get(textureId) ?? PIXI.Texture.EMPTY
    const sprite = new PIXI.Sprite(texture)
    sprite.anchor.set(state.anchor.x, state.anchor.y)

    if (state.size.width > 0) {
      sprite.width = state.size.width
      sprite.height = state.size.height
    }

    if (state.tint !== null) {
      const tintValue =
        typeof state.tint === "number" ? state.tint : this.rgbToHex(state.tint)
      sprite.tint = tintValue
    }

    sprite.blendMode = this.toPixiBlendMode(state.blendMode)

    if (texture.source) {
      texture.source.scaleMode =
        state.textureFiltering === "nearest" ? "nearest" : "linear"
    }

    state.currentSprite = sprite
    state.container.addChild(sprite)
    this._needsRepaint = true
  }

  setSpriteFromSpritesheet(
    id: NodeId,
    _spritesheetId: string,
    _tileX: number,
    _tileY: number,
  ): void {
    const state = this.nodes.get(id)
    if (!state) return

    this.clearCurrentVisual(state)
    this._needsRepaint = true
  }

  setAnimatedSprite(
    id: NodeId,
    textureIds: TextureId[],
    ticksPerFrame: number,
  ): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.animationData = {
      textures: textureIds,
      ticksPerFrame,
      loop: false,
    }

    this.clearCurrentVisual(state)

    const textures = textureIds.map(
      (tid) => this.textures.get(tid) ?? PIXI.Texture.EMPTY,
    )
    const animatedSprite = new PIXI.AnimatedSprite(textures)
    animatedSprite.anchor.set(state.anchor.x, state.anchor.y)
    animatedSprite.animationSpeed = 1 / ticksPerFrame

    if (state.size.width > 0) {
      animatedSprite.width = state.size.width
      animatedSprite.height = state.size.height
    }

    if (state.tint !== null) {
      const tintValue =
        typeof state.tint === "number" ? state.tint : this.rgbToHex(state.tint)
      animatedSprite.tint = tintValue
    }

    animatedSprite.blendMode = this.toPixiBlendMode(state.blendMode)

    state.currentSprite = animatedSprite
    state.container.addChild(animatedSprite)
    this._needsRepaint = true
  }

  playAnimation(id: NodeId, loop: boolean): void {
    const state = this.nodes.get(id)
    if (!state || !state.animationData) return

    state.animationData.loop = loop
    state.isAnimationPlaying = true

    if (
      state.currentSprite &&
      state.currentSprite instanceof PIXI.AnimatedSprite
    ) {
      state.currentSprite.loop = loop
      state.currentSprite.play()
    }

    this._needsRepaint = true
  }

  stopAnimation(id: NodeId): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.isAnimationPlaying = false

    if (
      state.currentSprite &&
      state.currentSprite instanceof PIXI.AnimatedSprite
    ) {
      state.currentSprite.stop()
    }

    this._needsRepaint = true
  }

  isAnimationPlaying(id: NodeId): boolean {
    const state = this.nodes.get(id)
    return state?.isAnimationPlaying ?? false
  }

  getAnimationData(
    id: NodeId,
  ): { textures: TextureId[]; ticksPerFrame: number; loop: boolean } | null {
    const state = this.nodes.get(id)
    return state?.animationData ?? null
  }

  drawRectangle(
    id: NodeId,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): void {
    const state = this.nodes.get(id)
    if (!state) return

    this.ensureGraphics(state)

    state.graphicsCommands.push({
      type: "rectangle",
      data: { x, y, width, height, fill, stroke, strokeWidth },
    })

    this.redrawGraphics(state)
    this._needsRepaint = true
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
    const state = this.nodes.get(id)
    if (!state) return

    this.ensureGraphics(state)

    state.graphicsCommands.push({
      type: "circle",
      data: { x, y, radius, fill, stroke, strokeWidth },
    })

    this.redrawGraphics(state)
    this._needsRepaint = true
  }

  drawPolygon(
    id: NodeId,
    points: number[],
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): void {
    const state = this.nodes.get(id)
    if (!state) return

    this.ensureGraphics(state)

    state.graphicsCommands.push({
      type: "polygon",
      data: { points, fill, stroke, strokeWidth },
    })

    this.redrawGraphics(state)
    this._needsRepaint = true
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
    const state = this.nodes.get(id)
    if (!state) return

    this.ensureGraphics(state)

    state.graphicsCommands.push({
      type: "line",
      data: { x1, y1, x2, y2, color, width },
    })

    this.redrawGraphics(state)
    this._needsRepaint = true
  }

  drawPolyline(
    id: NodeId,
    points: number[],
    color: Color,
    width?: number,
  ): void {
    const state = this.nodes.get(id)
    if (!state) return

    this.ensureGraphics(state)

    state.graphicsCommands.push({
      type: "polyline",
      data: { points, color, width },
    })

    this.redrawGraphics(state)
    this._needsRepaint = true
  }

  clearGraphics(id: NodeId): void {
    const state = this.nodes.get(id)
    if (!state) return

    state.graphicsCommands = []
    if (state.graphics) {
      state.graphics.clear()
    }

    this._needsRepaint = true
  }

  getGraphics(id: NodeId): Array<{ type: string; data: any }> {
    const state = this.nodes.get(id)
    return state?.graphicsCommands ?? []
  }

  getSpriteTexture(id: NodeId): TextureId | null {
    const state = this.nodes.get(id)
    if (!state || !state.currentSprite) return null

    for (const [textureId, texture] of this.textures) {
      if (state.currentSprite.texture === texture) {
        return textureId
      }
    }
    return null
  }

  getViewportZoom(): number {
    return this.viewport.scale.x
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height)
    this.viewport.resize(width, height)
    this._needsRepaint = true
  }

  getDevicePixelRatio(): number {
    return window.devicePixelRatio || 1
  }

  getTexture(
    _spritesheet: SpritesheetId,
    _frameName: string,
  ): TextureId | null {
    // TODO: Implement spritesheet frame lookup
    return null
  }

  setViewport(_id: NodeId, _options: ViewportOptions): void {
    // NOTE: PixiRenderingLayer uses a single global viewport, not per-node viewports
    // This method is a no-op for compatibility with the interface
  }

  getViewportPosition(_id: NodeId): { x: number; y: number } {
    return { x: this.viewport.x, y: this.viewport.y }
  }

  setViewportPosition(_id: NodeId, x: number, y: number): void {
    this.viewport.x = x
    this.viewport.y = y
    this._needsRepaint = true
  }

  setViewportZoom(_id: NodeId, zoom: number): void {
    this.viewport.setZoom(zoom)
    this._needsRepaint = true
  }

  worldToScreen(_id: NodeId, x: number, y: number): { x: number; y: number } {
    const point = this.viewport.toScreen(x, y)
    return { x: point.x, y: point.y }
  }

  screenToWorld(_id: NodeId, x: number, y: number): { x: number; y: number } {
    const point = this.viewport.toWorld(x, y)
    return { x: point.x, y: point.y }
  }

  onTick(callback: (deltaTicks: number) => void): void {
    this.app.ticker.add(() => {
      callback(1)
    })
  }

  setTickerSpeed(speed: number): void {
    this.app.ticker.speed = speed
  }

  private clearCurrentVisual(state: NodeState): void {
    if (state.currentSprite) {
      state.container.removeChild(state.currentSprite)
      state.currentSprite.destroy()
      state.currentSprite = null
    }
  }

  private ensureGraphics(state: NodeState): void {
    if (!state.graphics) {
      state.graphics = new PIXI.Graphics()
      state.graphics.blendMode = this.toPixiBlendMode(state.blendMode)
      state.container.addChild(state.graphics)
    }
  }

  private redrawGraphics(state: NodeState): void {
    if (!state.graphics) return

    state.graphics.clear()

    for (const cmd of state.graphicsCommands) {
      switch (cmd.type) {
        case "rectangle": {
          const { x, y, width, height, fill, stroke, strokeWidth } = cmd.data
          if (fill !== undefined) {
            const fillColor =
              typeof fill === "number" ? fill : this.rgbToHex(fill)
            state.graphics.rect(x, y, width, height)
            state.graphics.fill(fillColor)
          }
          if (stroke !== undefined) {
            const strokeColor =
              typeof stroke === "number" ? stroke : this.rgbToHex(stroke)
            state.graphics.rect(x, y, width, height)
            state.graphics.stroke({
              width: strokeWidth ?? 1,
              color: strokeColor,
            })
          }
          break
        }
        case "circle": {
          const { x, y, radius, fill, stroke, strokeWidth } = cmd.data
          if (fill !== undefined) {
            const fillColor =
              typeof fill === "number" ? fill : this.rgbToHex(fill)
            state.graphics.circle(x, y, radius)
            state.graphics.fill(fillColor)
          }
          if (stroke !== undefined) {
            const strokeColor =
              typeof stroke === "number" ? stroke : this.rgbToHex(stroke)
            state.graphics.circle(x, y, radius)
            state.graphics.stroke({
              width: strokeWidth ?? 1,
              color: strokeColor,
            })
          }
          break
        }
        case "polygon": {
          const { points, fill, stroke, strokeWidth } = cmd.data
          if (fill !== undefined) {
            const fillColor =
              typeof fill === "number" ? fill : this.rgbToHex(fill)
            state.graphics.poly(points)
            state.graphics.fill(fillColor)
          }
          if (stroke !== undefined) {
            const strokeColor =
              typeof stroke === "number" ? stroke : this.rgbToHex(stroke)
            state.graphics.poly(points)
            state.graphics.stroke({
              width: strokeWidth ?? 1,
              color: strokeColor,
            })
          }
          break
        }
        case "line": {
          const { x1, y1, x2, y2, color, width } = cmd.data
          const lineColor =
            typeof color === "number" ? color : this.rgbToHex(color)
          state.graphics.moveTo(x1, y1)
          state.graphics.lineTo(x2, y2)
          state.graphics.stroke({ width: width ?? 1, color: lineColor })
          break
        }
        case "polyline": {
          const { points, color, width } = cmd.data
          const lineColor =
            typeof color === "number" ? color : this.rgbToHex(color)
          for (let i = 0; i < points.length - 2; i += 2) {
            state.graphics.moveTo(points[i], points[i + 1])
            state.graphics.lineTo(points[i + 2], points[i + 3])
          }
          state.graphics.stroke({ width: width ?? 1, color: lineColor })
          break
        }
      }
    }
  }

  private createErrorTexture(): PIXI.Texture {
    const size = 32
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")!

    ctx.fillStyle = "#FF00FF"
    ctx.fillRect(0, 0, size / 2, size / 2)
    ctx.fillRect(size / 2, size / 2, size / 2, size / 2)

    ctx.fillStyle = "#000000"
    ctx.fillRect(size / 2, 0, size / 2, size / 2)
    ctx.fillRect(0, size / 2, size / 2, size / 2)

    return PIXI.Texture.from(canvas)
  }

  private rgbToHex(rgb: { r: number; g: number; b: number }): number {
    return (rgb.r << 16) | (rgb.g << 8) | rgb.b
  }

  private toPixiBlendMode(mode: BlendMode): any {
    const modeMap: Record<BlendMode, string> = {
      normal: "normal",
      add: "add",
      multiply: "multiply",
      screen: "screen",
    }
    return modeMap[mode] as any
  }
}
