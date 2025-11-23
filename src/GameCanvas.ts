import { EventEmitter } from "./EventEmitter"
import type { GameEngine } from "./GameEngine"
import { GameEngineEventType } from "./GameEngine"
import { Vector2D } from "./geometry/Vector2D"
import type {
  AudioLayer,
  InputEvent,
  InputLayer,
  NodeId,
  PlatformLayer,
  RenderingLayer,
} from "./platform"
import { DisplayNode } from "./platform/DisplayNode"
import type { AbstractRenderer } from "./rendering/AbstractRenderer"
import { GameState } from "./types"

/**
 * Events emitted by the game canvas for user interactions and viewport changes.
 */
export enum GameCanvasEvent {
  POINTER_MOVE = "pointerMove",
  POINTER_CLICK = "pointerClick",
  VIEWPORT_MOVED = "viewportMoved",
  VIEWPORT_ZOOMED = "viewportZoomed",
}

/**
 * Type definitions for canvas event callbacks.
 */
export interface GameCanvasEventMap
  extends Record<string, (...args: any[]) => void> {
  [GameCanvasEvent.POINTER_MOVE]: (worldPosition: Vector2D) => void
  [GameCanvasEvent.POINTER_CLICK]: (worldPosition: Vector2D) => void
  [GameCanvasEvent.VIEWPORT_MOVED]: (center: Vector2D) => void
  [GameCanvasEvent.VIEWPORT_ZOOMED]: (zoom: number) => void
}

/**
 * Configuration options for initializing a game canvas.
 */
export interface GameCanvasOptions {
  width: number
  height: number
  worldWidth: number
  worldHeight: number
  backgroundColor?: number
  resolution?: number
  antialias?: boolean
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
  clampBuffer?: number
  enableDrag?: boolean
  enablePinch?: boolean
  enableWheel?: boolean
  enableDecelerate?: boolean
  scaleWithResize?: boolean
  preference?: "webgl" | "webgpu"
}

/**
 * Abstract base class for creating interactive game canvases using platform abstraction.
 * Platform-agnostic: works with Web (PIXI.js) or Memory (headless) platforms.
 */
export abstract class GameCanvas extends EventEmitter<GameCanvasEventMap> {
  protected rendering: RenderingLayer
  protected audio: AudioLayer
  protected input: InputLayer
  protected viewportNode!: DisplayNode
  protected gameNode!: DisplayNode
  protected hudNode!: DisplayNode
  protected viewportNodeId!: NodeId
  protected gameEngine: GameEngine | null = null
  protected readonly initialWidth: number
  protected readonly initialHeight: number
  protected renderers: Map<string, AbstractRenderer<any>> = new Map()
  protected updateCallback: ((deltaTicks: number) => void) | null = null

  protected static readonly DEFAULT_OPTIONS: Partial<GameCanvasOptions> = {
    backgroundColor: 0x1e1e1e,
    resolution: 1,
    antialias: true,
    minZoom: 0.1,
    maxZoom: 5.0,
    initialZoom: 1.0,
    clampBuffer: 100,
    enableDrag: true,
    enablePinch: true,
    enableWheel: true,
    enableDecelerate: true,
    scaleWithResize: false,
  }

  constructor(
    protected options: GameCanvasOptions,
    platform: PlatformLayer,
  ) {
    super()

    this.rendering = platform.rendering
    this.audio = platform.audio
    this.input = platform.input

    this.initialWidth = options.width
    this.initialHeight = options.height

    this.options = { ...GameCanvas.DEFAULT_OPTIONS, ...options }
  }

  /**
   * Initialize the canvas - platform-agnostic (no container parameter).
   */
  public async initialize(): Promise<void> {
    const viewportNodeId = this.rendering.createNode()
    const gameNodeId = this.rendering.createNode()
    const hudNodeId = this.rendering.createNode()

    this.viewportNode = new DisplayNode(viewportNodeId, this.rendering)
    this.gameNode = new DisplayNode(gameNodeId, this.rendering)
    this.hudNode = new DisplayNode(hudNodeId, this.rendering)
    this.viewportNodeId = viewportNodeId

    this.viewportNode.addChild(this.gameNode)

    this.rendering.setViewport(this.viewportNodeId, {
      screenWidth: this.options.width,
      screenHeight: this.options.height,
      worldWidth: this.options.worldWidth,
      worldHeight: this.options.worldHeight,
      enableDrag: this.options.enableDrag,
      enablePinch: this.options.enablePinch,
      enableZoom: this.options.enableWheel,
      clampWheel: this.options.enableWheel,
      minScale: this.options.minZoom,
      maxScale: this.options.maxZoom,
    })

    this.rendering.setViewportPosition(
      this.viewportNodeId,
      this.options.worldWidth / 2,
      this.options.worldHeight / 2,
    )

    if (this.options.initialZoom) {
      this.rendering.setViewportZoom(
        this.viewportNodeId,
        this.options.initialZoom,
      )
    }

    this.setupEventListeners()
    this.setupUpdateLoop()
  }

  /**
   * Set up input event listeners via platform.input
   */
  protected setupEventListeners(): void {
    this.input.onPointerMove((event) => this.handlePointerMove(event))
    this.input.onClick((event) => this.handleClick(event))
  }

  /**
   * Start the update loop using platform.rendering.onTick()
   */
  protected setupUpdateLoop(): void {
    this.rendering.onTick((deltaTicks) => {
      this.update(deltaTicks)
    })
  }

  protected handlePointerMove = (event: InputEvent) => {
    const worldPos = this.rendering.screenToWorld(
      this.viewportNodeId,
      event.x,
      event.y,
    )
    const worldPosition = new Vector2D(worldPos.x, worldPos.y)
    this.emit(GameCanvasEvent.POINTER_MOVE, worldPosition)
  }

  protected handleClick = (event: InputEvent) => {
    const worldPos = this.rendering.screenToWorld(
      this.viewportNodeId,
      event.x,
      event.y,
    )
    const worldPosition = new Vector2D(worldPos.x, worldPos.y)
    this.emit(GameCanvasEvent.POINTER_CLICK, worldPosition)
  }

  /**
   * Register a renderer
   */
  protected registerRenderer(
    name: string,
    renderer: AbstractRenderer<any>,
  ): void {
    this.renderers.set(name, renderer)
  }

  /**
   * Unregister a renderer
   */
  protected unregisterRenderer(name: string): void {
    this.renderers.delete(name)
  }

  /**
   * Set up game-specific renderers
   */
  protected abstract setupRenderers(): void

  /**
   * Clear all renderers
   */
  protected clearRenderers(): void {
    for (const renderer of this.renderers.values()) {
      try {
        renderer.clear()
      } catch (error) {
        console.error("Error clearing renderer:", error)
      }
    }
  }

  /**
   * Get the game engine
   */
  public getGameEngine(): GameEngine | null {
    return this.gameEngine
  }

  /**
   * Set the game engine
   */
  public setGameEngine(gameEngine: GameEngine | null): void {
    if (this.gameEngine) {
      this.gameEngine.off(
        GameEngineEventType.STATE_CHANGE,
        this.handleGameStateChange,
      )
    }

    this.gameEngine = gameEngine

    if (this.gameEngine) {
      this.gameEngine.on(
        GameEngineEventType.STATE_CHANGE,
        this.handleGameStateChange,
      )
    }

    this.clearRenderers()
    this.setupRenderers()
  }

  /**
   * Render frame - implemented by subclasses
   */
  protected abstract render(deltaTicks: number): void

  /**
   * Update game state and render
   */
  protected update(deltaTicks: number): void {
    if (this.gameEngine) {
      this.gameEngine.update(deltaTicks)
    }
    this.render(deltaTicks)
  }

  protected handleGameStateChange = (
    newState: GameState,
    _oldState: GameState,
  ) => {
    for (const renderer of this.renderers.values()) {
      try {
        renderer.updateGameState(newState)
      } catch (error) {
        console.error("Error updating renderer game state:", error)
      }
    }
  }

  /**
   * Move viewport to position
   */
  public moveViewportTo(x: number, y: number, _animate = false): void {
    this.rendering.setViewportPosition(this.viewportNodeId, x, y)
    const center = this.rendering.getViewportPosition(this.viewportNodeId)
    this.emit(GameCanvasEvent.VIEWPORT_MOVED, new Vector2D(center.x, center.y))
  }

  /**
   * Set viewport zoom
   */
  public setZoom(zoom: number, _animate = false): void {
    this.rendering.setViewportZoom(this.viewportNodeId, zoom)
    const currentZoom = this.rendering.getViewportZoom(this.viewportNodeId)
    this.emit(GameCanvasEvent.VIEWPORT_ZOOMED, currentZoom)
  }

  /**
   * Get viewport center
   */
  public getViewportCenter(): Vector2D {
    const pos = this.rendering.getViewportPosition(this.viewportNodeId)
    return new Vector2D(pos.x, pos.y)
  }

  /**
   * Get viewport zoom
   */
  public getZoom(): number {
    return this.rendering.getViewportZoom(this.viewportNodeId)
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  public worldToScreen(worldPos: Vector2D): Vector2D {
    const screenPos = this.rendering.worldToScreen(
      this.viewportNodeId,
      worldPos.x,
      worldPos.y,
    )
    return new Vector2D(screenPos.x, screenPos.y)
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  public screenToWorld(screenPos: Vector2D): Vector2D {
    const worldPos = this.rendering.screenToWorld(
      this.viewportNodeId,
      screenPos.x,
      screenPos.y,
    )
    return new Vector2D(worldPos.x, worldPos.y)
  }

  /**
   * Resize canvas
   */
  public resize(width: number, height: number): void {
    this.rendering.resize(width, height)

    if (this.options.scaleWithResize) {
      const scaleX = width / this.initialWidth
      const scaleY = height / this.initialHeight
      const uniformScale = Math.min(scaleX, scaleY)

      this.gameNode.setScale(uniformScale)
      this.gameNode.setPosition(
        (width - this.initialWidth * uniformScale) / 2,
        (height - this.initialHeight * uniformScale) / 2,
      )
    } else {
      this.options.width = width
      this.options.height = height
    }

    const worldAspectRatio = this.options.worldWidth / this.options.worldHeight
    const canvasAspectRatio = width / height

    let targetZoom: number
    if (canvasAspectRatio > worldAspectRatio) {
      targetZoom = height / this.options.worldHeight
    } else {
      targetZoom = width / this.options.worldWidth
    }

    targetZoom = Math.max(
      this.options.minZoom!,
      Math.min(this.options.maxZoom!, targetZoom),
    )

    this.rendering.setViewportZoom(this.viewportNodeId, targetZoom)
    this.rendering.setViewportPosition(
      this.viewportNodeId,
      this.options.worldWidth / 2,
      this.options.worldHeight / 2,
    )
  }

  /**
   * Destroy canvas
   */
  public destroy(): void {
    this.input.removeAllListeners()
    this.clearListeners()

    if (this.viewportNode) {
      this.viewportNode.destroy()
    }
    if (this.hudNode) {
      this.hudNode.destroy()
    }
  }

  /**
   * Get the game node (DisplayNode)
   */
  public getGameNode(): DisplayNode {
    return this.gameNode
  }

  /**
   * Get the HUD node (DisplayNode)
   */
  public getHudNode(): DisplayNode {
    return this.hudNode
  }

  /**
   * Get canvas options
   */
  public getOptions(): GameCanvasOptions {
    return { ...this.options }
  }
}
