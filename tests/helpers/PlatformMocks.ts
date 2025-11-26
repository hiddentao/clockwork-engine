/**
 * Mock Platform Layer Implementations for Testing
 *
 * Provides mock implementations of PlatformLayer, RenderingLayer, AudioLayer,
 * and InputLayer for use in unit tests. These mocks track method calls and
 * provide inspection capabilities without requiring actual rendering/audio/input.
 */

import type { AudioBuffer, AudioLayer } from "../../src/platform/AudioLayer"
import { AudioContextState } from "../../src/platform/AudioLayer"
import type {
  InputEvent,
  InputLayer,
  KeyboardInputEvent,
} from "../../src/platform/InputLayer"
import type { PlatformLayer } from "../../src/platform/PlatformLayer"
import type {
  RenderingLayer,
  ViewportOptions,
} from "../../src/platform/RenderingLayer"
import {
  type BlendMode,
  type Color,
  type NodeId,
  type SpritesheetId,
  type TextureFiltering,
  type TextureId,
  asNodeId,
  asSpritesheetId,
  asTextureId,
} from "../../src/platform/types"

/**
 * Mock Audio Buffer implementation
 */
class MockAudioBuffer implements AudioBuffer {
  constructor(
    public readonly numberOfChannels: number,
    public readonly length: number,
    public readonly sampleRate: number,
  ) {}

  get duration(): number {
    return this.length / this.sampleRate
  }

  getChannelData(_channel: number): Float32Array {
    return new Float32Array(this.length)
  }
}

/**
 * Mock Rendering Layer - tracks all rendering operations
 */
export class MockRenderingLayer implements RenderingLayer {
  private nodes = new Map<NodeId, MockNode>()
  private nextNodeId = 1
  private nextTextureId = 1
  private nextSpritesheetId = 1
  private textures = new Map<TextureId, string>()
  private spritesheets = new Map<SpritesheetId, Map<string, TextureId>>()
  private tickCallback: ((deltaTicks: number) => void) | null = null
  private tickerSpeed = 1

  // Node lifecycle
  createNode(): NodeId {
    const id = asNodeId(this.nextNodeId++)
    this.nodes.set(id, new MockNode())
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
      if (index >= 0) {
        parentNode.children.splice(index, 1)
      }
      childNode.parent = null
    }
  }

  // Transform
  setPosition(id: NodeId, x: number, y: number): void {
    const node = this.nodes.get(id)
    if (node) {
      node.x = x
      node.y = y
    }
  }

  setRotation(id: NodeId, radians: number): void {
    const node = this.nodes.get(id)
    if (node) {
      node.rotation = radians
    }
  }

  setScale(id: NodeId, scaleX: number, scaleY: number): void {
    const node = this.nodes.get(id)
    if (node) {
      node.scaleX = scaleX
      node.scaleY = scaleY
    }
  }

  setAnchor(id: NodeId, anchorX: number, anchorY: number): void {
    const node = this.nodes.get(id)
    if (node) {
      node.anchorX = anchorX
      node.anchorY = anchorY
    }
  }

  setAlpha(id: NodeId, alpha: number): void {
    const node = this.nodes.get(id)
    if (node) {
      node.alpha = alpha
    }
  }

  setVisible(id: NodeId, visible: boolean): void {
    const node = this.nodes.get(id)
    if (node) {
      node.visible = visible
    }
  }

  setZIndex(id: NodeId, z: number): void {
    const node = this.nodes.get(id)
    if (node) {
      node.zIndex = z
    }
  }

  getRotation(id: NodeId): number {
    const node = this.nodes.get(id)
    return node?.rotation ?? 0
  }

  getScale(id: NodeId): { x: number; y: number } {
    const node = this.nodes.get(id)
    return node ? { x: node.scaleX, y: node.scaleY } : { x: 1, y: 1 }
  }

  // Size
  setSize(id: NodeId, width: number, height: number): void {
    const node = this.nodes.get(id)
    if (node) {
      node.width = width
      node.height = height
    }
  }

  getSize(id: NodeId): { width: number; height: number } {
    const node = this.nodes.get(id)
    return node
      ? { width: node.width, height: node.height }
      : { width: 0, height: 0 }
  }

  // Visual effects
  setTint(id: NodeId, color: Color): void {
    const node = this.nodes.get(id)
    if (node) {
      node.tint = color
    }
  }

  setBlendMode(id: NodeId, mode: BlendMode): void {
    const node = this.nodes.get(id)
    if (node) {
      node.blendMode = mode
    }
  }

  setTextureFiltering(id: NodeId, filtering: TextureFiltering): void {
    const node = this.nodes.get(id)
    if (node) {
      node.textureFiltering = filtering
    }
  }

  // Bounds query
  getBounds(id: NodeId): {
    x: number
    y: number
    width: number
    height: number
  } {
    const node = this.nodes.get(id)
    return node
      ? { x: node.x, y: node.y, width: node.width, height: node.height }
      : { x: 0, y: 0, width: 0, height: 0 }
  }

  // Visual content
  setSprite(id: NodeId, textureId: TextureId): void {
    const node = this.nodes.get(id)
    if (node) {
      node.textureId = textureId
    }
  }

  setAnimatedSprite(
    id: NodeId,
    textureIds: TextureId[],
    ticksPerFrame: number,
  ): void {
    const node = this.nodes.get(id)
    if (node) {
      node.animationTextures = textureIds
      node.animationTicksPerFrame = ticksPerFrame
    }
  }

  playAnimation(id: NodeId, loop: boolean): void {
    const node = this.nodes.get(id)
    if (node) {
      node.animationPlaying = true
      node.animationLoop = loop
    }
  }

  stopAnimation(id: NodeId): void {
    const node = this.nodes.get(id)
    if (node) {
      node.animationPlaying = false
    }
  }

  setAnimationCompleteCallback(
    _id: NodeId,
    _callback: ((id: NodeId) => void) | null,
  ): void {
    // No-op for mock
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
        x,
        y,
        w,
        h,
        fill,
        stroke,
        strokeWidth,
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
        x,
        y,
        radius,
        fill,
        stroke,
        strokeWidth,
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
      node.graphics.push({ type: "polygon", points, fill, stroke, strokeWidth })
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
        x,
        y,
        w,
        h,
        radius,
        fill,
        stroke,
        strokeWidth,
      })
    }
  }

  // Line drawing
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
      node.graphics.push({ type: "line", x1, y1, x2, y2, color, width })
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
      node.graphics.push({ type: "polyline", points, color, width })
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

    // Handle both object and array formats
    const frameData = Array.isArray(jsonData.frames)
      ? jsonData.frames
      : Object.values(jsonData.frames)

    for (const frame of frameData) {
      const frameName = (frame as any).filename || (frame as any).name
      const textureId = asTextureId(this.nextTextureId++)
      this.textures.set(textureId, `${imageUrl}#${frameName}`)
      frames.set(frameName, textureId)
    }

    this.spritesheets.set(id, frames)
    return id
  }

  getTexture(spritesheet: SpritesheetId, frameName: string): TextureId | null {
    const sheet = this.spritesheets.get(spritesheet)
    return sheet?.get(frameName) ?? null
  }

  // Viewport
  setViewport(id: NodeId, options: ViewportOptions): void {
    const node = this.nodes.get(id)
    if (node) {
      node.viewport = options
    }
  }

  getViewportPosition(id: NodeId): { x: number; y: number } {
    const node = this.nodes.get(id)
    return node?.viewportPosition ?? { x: 0, y: 0 }
  }

  setViewportPosition(id: NodeId, x: number, y: number): void {
    const node = this.nodes.get(id)
    if (node) {
      node.viewportPosition = { x, y }
    }
  }

  setViewportZoom(id: NodeId, zoom: number): void {
    const node = this.nodes.get(id)
    if (node) {
      node.viewportZoom = zoom
    }
  }

  getViewportZoom(id: NodeId): number {
    const node = this.nodes.get(id)
    return node?.viewportZoom ?? 1
  }

  worldToScreen(id: NodeId, x: number, y: number): { x: number; y: number } {
    const node = this.nodes.get(id)
    const zoom = node?.viewportZoom ?? 1
    const pos = node?.viewportPosition ?? { x: 0, y: 0 }
    return {
      x: (x - pos.x) * zoom,
      y: (y - pos.y) * zoom,
    }
  }

  screenToWorld(id: NodeId, x: number, y: number): { x: number; y: number } {
    const node = this.nodes.get(id)
    const zoom = node?.viewportZoom ?? 1
    const pos = node?.viewportPosition ?? { x: 0, y: 0 }
    return {
      x: x / zoom + pos.x,
      y: y / zoom + pos.y,
    }
  }

  // Game loop
  onTick(callback: (deltaTicks: number) => void): void {
    this.tickCallback = callback
  }

  setTickerSpeed(speed: number): void {
    this.tickerSpeed = speed
  }

  getFPS(): number {
    return 60
  }

  // Manual rendering
  render(): void {
    // No-op for mock
  }

  // Canvas resize
  resize(_width: number, _height: number): void {
    // No-op for mock
  }

  // Cleanup
  destroy(): void {
    this.nodes.clear()
    this.textures.clear()
    this.spritesheets.clear()
    this.tickCallback = null
  }

  // Test helpers
  getNode(id: NodeId): MockNode | undefined {
    return this.nodes.get(id)
  }

  getTickCallback(): ((deltaTicks: number) => void) | null {
    return this.tickCallback
  }

  getTickerSpeed(): number {
    return this.tickerSpeed
  }

  simulateTick(deltaTicks: number): void {
    if (this.tickCallback) {
      this.tickCallback(deltaTicks)
    }
  }
}

/**
 * Mock node data structure
 */
class MockNode {
  x = 0
  y = 0
  rotation = 0
  scaleX = 1
  scaleY = 1
  anchorX = 0
  anchorY = 0
  alpha = 1
  visible = true
  zIndex = 0
  width = 0
  height = 0
  tint: Color | null = null
  blendMode: BlendMode | null = null
  textureFiltering: TextureFiltering | null = null
  textureId: TextureId | null = null
  animationTextures: TextureId[] = []
  animationTicksPerFrame = 1
  animationPlaying = false
  animationLoop = false
  graphics: any[] = []
  children: NodeId[] = []
  parent: NodeId | null = null
  viewport: ViewportOptions | null = null
  viewportPosition = { x: 0, y: 0 }
  viewportZoom = 1
}

/**
 * Mock Audio Layer - tracks all audio operations
 */
export class MockAudioLayer implements AudioLayer {
  private sounds = new Map<string, MockAudioBuffer>()
  private playingSounds = new Set<string>()
  private state: AudioContextState = AudioContextState.SUSPENDED
  private initialized = false

  async initialize(): Promise<void> {
    this.initialized = true
    this.state = AudioContextState.RUNNING
  }

  destroy(): void {
    this.initialized = false
    this.state = AudioContextState.CLOSED
    this.sounds.clear()
    this.playingSounds.clear()
  }

  async loadSound(id: string, _data: string | ArrayBuffer): Promise<void> {
    const buffer = new MockAudioBuffer(2, 44100, 44100)
    this.sounds.set(id, buffer)
  }

  createBuffer(
    channels: number,
    length: number,
    sampleRate: number,
  ): AudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate)
  }

  loadSoundFromBuffer(id: string, buffer: AudioBuffer): void {
    this.sounds.set(id, buffer as MockAudioBuffer)
  }

  playSound(id: string, _volume?: number, _loop?: boolean): void {
    if (this.sounds.has(id)) {
      this.playingSounds.add(id)
    }
  }

  stopSound(id: string): void {
    this.playingSounds.delete(id)
  }

  stopAll(): void {
    this.playingSounds.clear()
  }

  async tryResumeOnce(): Promise<void> {
    this.state = AudioContextState.RUNNING
  }

  getState(): AudioContextState {
    return this.state
  }

  // Test helpers
  isInitialized(): boolean {
    return this.initialized
  }

  hasSound(id: string): boolean {
    return this.sounds.has(id)
  }

  isPlaying(id: string): boolean {
    return this.playingSounds.has(id)
  }
}

/**
 * Mock Input Layer - allows simulating input events
 */
export class MockInputLayer implements InputLayer {
  private pointerDownCallbacks: ((event: InputEvent) => void)[] = []
  private pointerUpCallbacks: ((event: InputEvent) => void)[] = []
  private pointerMoveCallbacks: ((event: InputEvent) => void)[] = []
  private clickCallbacks: ((event: InputEvent) => void)[] = []
  private keyDownCallbacks: ((event: KeyboardInputEvent) => void)[] = []
  private keyUpCallbacks: ((event: KeyboardInputEvent) => void)[] = []

  onPointerDown(callback: (event: InputEvent) => void): void {
    this.pointerDownCallbacks.push(callback)
  }

  onPointerUp(callback: (event: InputEvent) => void): void {
    this.pointerUpCallbacks.push(callback)
  }

  onPointerMove(callback: (event: InputEvent) => void): void {
    this.pointerMoveCallbacks.push(callback)
  }

  onClick(callback: (event: InputEvent) => void): void {
    this.clickCallbacks.push(callback)
  }

  onKeyDown(callback: (event: KeyboardInputEvent) => void): void {
    this.keyDownCallbacks.push(callback)
  }

  onKeyUp(callback: (event: KeyboardInputEvent) => void): void {
    this.keyUpCallbacks.push(callback)
  }

  removeAllListeners(): void {
    this.pointerDownCallbacks = []
    this.pointerUpCallbacks = []
    this.pointerMoveCallbacks = []
    this.clickCallbacks = []
    this.keyDownCallbacks = []
    this.keyUpCallbacks = []
  }

  // Test helpers - simulate events
  simulatePointerDown(x: number, y: number, button = 0): void {
    const event: InputEvent = { x, y, button, timestamp: Date.now() }
    for (const callback of this.pointerDownCallbacks) {
      callback(event)
    }
  }

  simulatePointerUp(x: number, y: number, button = 0): void {
    const event: InputEvent = { x, y, button, timestamp: Date.now() }
    for (const callback of this.pointerUpCallbacks) {
      callback(event)
    }
  }

  simulatePointerMove(x: number, y: number): void {
    const event: InputEvent = { x, y, timestamp: Date.now() }
    for (const callback of this.pointerMoveCallbacks) {
      callback(event)
    }
  }

  simulateClick(x: number, y: number): void {
    const event: InputEvent = { x, y, timestamp: Date.now() }
    for (const callback of this.clickCallbacks) {
      callback(event)
    }
  }

  simulateKeyDown(key: string, code: string): void {
    const event: KeyboardInputEvent = { key, code, timestamp: Date.now() }
    for (const callback of this.keyDownCallbacks) {
      callback(event)
    }
  }

  simulateKeyUp(key: string, code: string): void {
    const event: KeyboardInputEvent = { key, code, timestamp: Date.now() }
    for (const callback of this.keyUpCallbacks) {
      callback(event)
    }
  }
}

/**
 * Mock Platform Layer - composes all mock subsystems
 */
export class MockPlatformLayer implements PlatformLayer {
  rendering: MockRenderingLayer
  audio: MockAudioLayer
  input: MockInputLayer

  constructor() {
    this.rendering = new MockRenderingLayer()
    this.audio = new MockAudioLayer()
    this.input = new MockInputLayer()
  }

  getDevicePixelRatio(): number {
    return 1
  }
}
