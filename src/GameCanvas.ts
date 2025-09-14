import { EventEmitter } from "./EventEmitter"
import type { GameEngine } from "./GameEngine"
import { Vector2D } from "./geometry/Vector2D"
import { PIXI, Viewport } from "./lib/pixi"

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
 * Maps each event type to its corresponding callback signature.
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
 * Defines rendering settings, viewport behavior, and interaction controls.
 */
export interface GameCanvasOptions {
  /** Canvas width in pixels */
  width: number
  /** Canvas height in pixels */
  height: number
  /** World coordinate system width */
  worldWidth: number
  /** World coordinate system height */
  worldHeight: number
  /** Background color in hexadecimal format */
  backgroundColor?: number
  /** Rendering resolution multiplier */
  resolution?: number
  /** Enable anti-aliasing for smoother graphics */
  antialias?: boolean
  /** Minimum allowed zoom level */
  minZoom?: number
  /** Maximum allowed zoom level */
  maxZoom?: number
  /** Starting zoom level when canvas loads */
  initialZoom?: number
  /** Buffer area around world boundaries for viewport clamping */
  clampBuffer?: number
  /** Allow viewport dragging with mouse/touch */
  enableDrag?: boolean
  /** Enable pinch-to-zoom gesture support */
  enablePinch?: boolean
  /** Allow zooming with mouse wheel */
  enableWheel?: boolean
  /** Enable momentum-based viewport deceleration */
  enableDecelerate?: boolean
  /** Scale game content when canvas is resized */
  scaleWithResize?: boolean
  /** Renderer preference - 'webgl' or 'webgpu' */
  preference?: "webgl" | "webgpu"
}

/**
 * Abstract base class for creating interactive game canvases with PIXI.js.
 * Provides viewport management, event handling, and rendering infrastructure
 * for 2D games with pan, zoom, and interaction capabilities.
 *
 * Subclasses must implement initializeGameLayers() to set up game-specific
 * visual layers and render() to define per-frame rendering logic.
 */
export abstract class GameCanvas extends EventEmitter<GameCanvasEventMap> {
  protected app: PIXI.Application
  protected viewport!: Viewport
  protected container: HTMLDivElement | null = null
  protected gameContainer: PIXI.Container
  protected hudContainer: PIXI.Container
  protected gameEngine: GameEngine | null = null
  protected readonly initialWidth: number
  protected readonly initialHeight: number

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

  constructor(protected options: GameCanvasOptions) {
    super()
    this.app = new PIXI.Application()
    this.gameContainer = new PIXI.Container()
    this.hudContainer = new PIXI.Container()

    this.initialWidth = options.width
    this.initialHeight = options.height

    this.options = { ...GameCanvas.DEFAULT_OPTIONS, ...options }
  }

  /**
   * Factory method for creating and initializing a game canvas instance.
   * Handles the asynchronous initialization process and DOM attachment.
   *
   * @param container HTML element to attach the canvas to
   * @param options Configuration options for the canvas
   * @returns Promise resolving to the initialized canvas instance
   */
  public static async create<T extends GameCanvas>(
    this: new (
      options: GameCanvasOptions,
    ) => T,
    container: HTMLDivElement,
    options: GameCanvasOptions,
  ): Promise<T> {
    const instance = new this(options)
    await instance.initialize(container)
    return instance
  }

  /**
   * Initializes the PIXI application, viewport, and canvas setup.
   * Configures rendering, interaction, and attaches to the DOM.
   *
   * @param container HTML element to attach the canvas to
   */
  protected async initialize(container: HTMLDivElement): Promise<void> {
    this.container = container

    const initOptions: any = {
      width: this.options.width,
      height: this.options.height,
      backgroundColor: this.options.backgroundColor,
      resolution: this.options.resolution || window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: this.options.antialias,
    }

    if (this.options.preference) {
      initOptions.preference = this.options.preference
    }

    await this.app.init(initOptions)

    this.viewport = new Viewport({
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,
      worldWidth: this.options.worldWidth,
      worldHeight: this.options.worldHeight,
      events: this.app.renderer.events,
    })

    if (this.options.enableDrag) this.viewport.drag()
    if (this.options.enablePinch) this.viewport.pinch()
    if (this.options.enableWheel) this.viewport.wheel()
    if (this.options.enableDecelerate) this.viewport.decelerate()

    this.viewport.clampZoom({
      minScale: this.options.minZoom!,
      maxScale: this.options.maxZoom!,
    })

    this.configureViewportClamp()

    this.viewport.moveCenter(
      this.options.worldWidth / 2,
      this.options.worldHeight / 2,
    )
    this.viewport.setZoom(this.options.initialZoom!, true)

    // Set proper event modes for containers
    this.gameContainer.eventMode = "passive"
    this.hudContainer.eventMode = "passive"

    this.viewport.addChild(this.gameContainer)
    this.app.stage.addChild(this.viewport)

    this.app.stage.addChild(this.hudContainer)

    this.initializeGameLayers()

    container.appendChild(this.app.canvas)

    this.setupEventListeners()

    this.setupUpdateLoop()
  }

  /**
   * Configures viewport boundaries with buffer zones around the world edges.
   * Prevents users from panning too far outside the game world.
   */
  protected configureViewportClamp(): Viewport {
    return this.viewport.clamp({
      direction: "all",
      left: -this.options.clampBuffer!,
      right: this.options.worldWidth + this.options.clampBuffer!,
      top: -this.options.clampBuffer!,
      bottom: this.options.worldHeight + this.options.clampBuffer!,
    })
  }

  /**
   * Initializes game-specific visual layers and renderers.
   * Must be implemented by subclasses to set up their rendering system.
   */
  protected abstract initializeGameLayers(): void

  /**
   * Retrieves the currently associated game engine instance.
   *
   * @returns The game engine or null if none is set
   */
  public getGameEngine(): GameEngine | null {
    return this.gameEngine
  }

  /**
   * Associates a game engine with this canvas for update loop integration.
   *
   * @param gameLoop The game engine instance to associate
   */
  public setGameEngine(gameLoop: GameEngine | null): void {
    this.gameEngine = gameLoop
  }

  /**
   * Renders the current frame with game-specific drawing logic.
   * Called every frame after the game engine update.
   *
   * @param deltaTime Time elapsed since the last frame
   */
  protected abstract render(deltaTime: number): void

  /**
   * Updates the game state and triggers rendering for each frame.
   * Coordinates between the game engine and visual rendering.
   *
   * @param deltaFrames Frames elapsed since the last frame
   */
  protected update(deltaFrames: number): void {
    if (this.gameEngine) {
      this.gameEngine.update(deltaFrames)
    }
    this.render(deltaFrames)
  }

  /**
   * Sets up event listeners for mouse, touch, and viewport interactions.
   */
  protected setupEventListeners(): void {
    if (this.container) {
      this.container.addEventListener("pointermove", this.handlePointerMove)
      this.container.addEventListener("click", this.handleClick)
    }
    // this.viewport.on("moved", this.handleViewportMoved)
    // this.viewport.on("zoomed", this.handleViewportZoomed)
  }

  /**
   * Starts the main game update and render loop using PIXI's ticker.
   */
  protected setupUpdateLoop(): void {
    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime)
    })
  }

  protected handlePointerMove = (event: PointerEvent) => {
    if (!this.container) return

    const rect = this.container.getBoundingClientRect()
    const viewportPos = this.viewport.toWorld(
      event.clientX - rect.left,
      event.clientY - rect.top,
    )

    const worldPosition = new Vector2D(viewportPos.x, viewportPos.y)
    this.emit(GameCanvasEvent.POINTER_MOVE, worldPosition)
  }

  protected handleClick = (event: MouseEvent) => {
    if (!this.container) return

    const rect = this.container.getBoundingClientRect()
    const viewportPos = this.viewport.toWorld(
      event.clientX - rect.left,
      event.clientY - rect.top,
    )

    const worldPosition = new Vector2D(viewportPos.x, viewportPos.y)
    this.emit(GameCanvasEvent.POINTER_CLICK, worldPosition)
  }

  protected handleViewportMoved = () => {
    const center = this.viewport.center
    this.emit(GameCanvasEvent.VIEWPORT_MOVED, new Vector2D(center.x, center.y))
  }

  protected handleViewportZoomed = () => {
    this.emit(GameCanvasEvent.VIEWPORT_ZOOMED, this.viewport.scale.x)
  }

  /**
   * Moves the viewport to center on specific world coordinates.
   *
   * @param x World X coordinate to center on
   * @param y World Y coordinate to center on
   * @param animate Whether to animate the movement smoothly
   */
  public moveViewportTo(x: number, y: number, animate = false): void {
    if (animate) {
      this.viewport.animate({
        position: new PIXI.Point(x, y),
        time: 1000,
        ease: "easeInOutCubic",
      })
    } else {
      this.viewport.moveCenter(x, y)
    }
  }

  /**
   * Sets the viewport zoom level.
   *
   * @param zoom Target zoom level
   * @param animate Whether to animate the zoom change smoothly
   */
  public setZoom(zoom: number, animate = false): void {
    if (animate) {
      this.viewport.animate({
        scale: zoom,
        time: 1000,
        ease: "easeInOutCubic",
      })
    } else {
      this.viewport.setZoom(zoom, true)
    }
  }

  /**
   * Gets the current viewport center position in world coordinates.
   *
   * @returns Current center position as Vector2D
   */
  public getViewportCenter(): Vector2D {
    const center = this.viewport.center
    return new Vector2D(center.x, center.y)
  }

  /**
   * Gets the current viewport zoom level.
   *
   * @returns Current zoom scale factor
   */
  public getZoom(): number {
    return this.viewport.scale.x
  }

  /**
   * Converts world coordinates to screen pixel coordinates.
   *
   * @param worldPos Position in world coordinate system
   * @returns Corresponding screen pixel position
   */
  public worldToScreen(worldPos: Vector2D): Vector2D {
    const screenPos = this.viewport.toScreen(worldPos.x, worldPos.y)
    return new Vector2D(screenPos.x, screenPos.y)
  }

  /**
   * Converts screen pixel coordinates to world coordinates.
   *
   * @param screenPos Position in screen pixel coordinates
   * @returns Corresponding world coordinate position
   */
  public screenToWorld(screenPos: Vector2D): Vector2D {
    const worldPos = this.viewport.toWorld(screenPos.x, screenPos.y)
    return new Vector2D(worldPos.x, worldPos.y)
  }

  /**
   * Resizes the canvas and adjusts the viewport accordingly.
   * Handles both scaling and non-scaling resize modes based on configuration.
   *
   * @param width New canvas width in pixels
   * @param height New canvas height in pixels
   */
  public resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height)
      if (this.viewport) {
        this.viewport.screenWidth = width
        this.viewport.screenHeight = height
      }
    }

    if (this.options.scaleWithResize) {
      const scaleX = width / this.initialWidth
      const scaleY = height / this.initialHeight
      const uniformScale = Math.min(scaleX, scaleY)

      this.gameContainer.scale.set(uniformScale)

      this.gameContainer.x = (width - this.initialWidth * uniformScale) / 2
      this.gameContainer.y = (height - this.initialHeight * uniformScale) / 2
    } else {
      this.options.width = width
      this.options.height = height
    }

    if (this.viewport) {
      const worldAspectRatio =
        this.options.worldWidth / this.options.worldHeight
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

      this.viewport.setZoom(targetZoom, false)
      this.viewport.moveCenter(
        this.options.worldWidth / 2,
        this.options.worldHeight / 2,
      )
    }
  }

  /**
   * Destroys the canvas and cleans up all resources.
   * Removes event listeners, destroys PIXI application, and cleans up DOM references.
   */
  public destroy(): void {
    if (this.container) {
      this.container.removeEventListener("pointermove", this.handlePointerMove)
      this.container.removeEventListener("click", this.handleClick)
      if (this.app.canvas.parentNode === this.container) {
        this.container.removeChild(this.app.canvas)
      }
      this.container = null
    }

    this.viewport.off("moved", this.handleViewportMoved)
    this.viewport.off("zoomed", this.handleViewportZoomed)

    this.clearListeners()

    this.app.destroy(true, { children: true, texture: true })
  }

  /**
   * Gets the PIXI application instance.
   *
   * @returns The PIXI application
   */
  public getApp(): PIXI.Application {
    return this.app
  }

  /**
   * Gets the viewport instance for advanced viewport manipulation.
   *
   * @returns The pixi-viewport instance
   */
  public getViewport(): Viewport {
    return this.viewport
  }

  /**
   * Gets the main game container that moves with the viewport.
   *
   * @returns The game world container
   */
  public getGameContainer(): PIXI.Container {
    return this.gameContainer
  }

  /**
   * Gets the HUD container that stays fixed on screen.
   *
   * @returns The HUD container
   */
  public getHudContainer(): PIXI.Container {
    return this.hudContainer
  }

  /**
   * Gets a copy of the current canvas options.
   *
   * @returns Copy of the canvas configuration
   */
  public getOptions(): GameCanvasOptions {
    return { ...this.options }
  }
}
