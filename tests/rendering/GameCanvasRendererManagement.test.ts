// @ts-nocheck
import { beforeEach, describe, expect, it, mock } from "bun:test"
import { GameEngineEventType } from "../../src/GameEngine"
import { GameState } from "../../src/types"

// EventEmitter-like functionality for GameEngine mock
class EventEmitter {
  private _events: Map<string, ((...args: any[]) => void)[]> = new Map()

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this._events.has(event)) {
      this._events.set(event, [])
    }
    this._events.get(event)!.push(listener)
    return this
  }

  off(event: string, listener: (...args: any[]) => void): this {
    const listeners = this._events.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
    return this
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this._events.get(event)
    if (listeners) {
      listeners.forEach((listener) => listener(...args))
      return true
    }
    return false
  }
}

// Mock PIXI.Container
class MockContainer {
  public children: MockContainer[] = []
  public label?: string
  public position = {
    x: 0,
    y: 0,
    set: (x: number, y: number) => {
      this.position.x = x
      this.position.y = y
    },
  }
  public destroyed = false

  addChild(child: MockContainer): MockContainer {
    this.children.push(child)
    return child
  }

  removeChild(child: MockContainer): MockContainer {
    const index = this.children.indexOf(child)
    if (index > -1) {
      this.children.splice(index, 1)
    }
    return child
  }

  destroy(): void {
    this.destroyed = true
    this.children.forEach((child) => child.destroy())
    this.children = []
  }
}

// Mock PIXI.Graphics
class MockGraphics extends MockContainer {
  rect(): this {
    return this
  }
  fill(): this {
    return this
  }
  circle(): this {
    return this
  }
  poly(): this {
    return this
  }
  stroke(): this {
    return this
  }
}

// Mock PIXI.Application
class MockApplication {
  public ticker = {
    add: mock(() => {
      // Mock ticker add
    }),
    remove: mock(() => {
      // Mock ticker remove
    }),
  }
  public canvas = {
    parentNode: null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  } as any
  public screen = { width: 800, height: 600 }
  public stage = new MockContainer()
  public renderer = {
    events: new EventEmitter(),
    resize: mock(() => {
      // Mock renderer resize
    }),
  }

  async init(): Promise<void> {
    // Mock init
  }

  destroy(): void {
    // Mock destroy
  }
}

// Mock Viewport
class MockViewport extends MockContainer {
  public screenWidth = 800
  public screenHeight = 600
  public center = { x: 400, y: 300 }
  public scale = { x: 1, y: 1 }

  drag(): this {
    return this
  }
  pinch(): this {
    return this
  }
  wheel(): this {
    return this
  }
  decelerate(): this {
    return this
  }
  clampZoom(): this {
    return this
  }
  clamp(): this {
    return this
  }
  moveCenter(): this {
    return this
  }
  setZoom(): this {
    return this
  }
  animate(): this {
    return this
  }
  toWorld(x: number, y: number): { x: number; y: number } {
    return { x, y }
  }
  toScreen(x: number, y: number): { x: number; y: number } {
    return { x, y }
  }
}

// Mock PIXI
const PIXI = {
  Container: MockContainer as any,
  Graphics: MockGraphics as any,
  Application: MockApplication as any,
  Point: class MockPoint {
    constructor(
      public x: number,
      public y: number,
    ) {}
  },
}

// Mock GameEngine
class MockGameEngine extends EventEmitter {
  public state: GameState = GameState.READY

  setState(newState: GameState): void {
    const oldState = this.state
    this.state = newState
    this.emit(GameEngineEventType.STATE_CHANGE, newState, oldState)
  }

  update(): void {
    // Mock update
  }
}

// Mock AbstractRenderer
class MockRenderer {
  public clearCallCount = 0
  public updateGameStateCallCount = 0
  public lastGameState: GameState | null = null

  clear(): void {
    this.clearCallCount++
  }

  updateGameState(state: GameState): void {
    this.updateGameStateCallCount++
    this.lastGameState = state
  }
}

// Mock modules
mock.module("../../src/lib/pixi", () => ({
  PIXI: PIXI,
  Viewport: MockViewport as any,
}))

mock.module("../../src/GameEngine", () => ({
  GameEngineEventType: {
    STATE_CHANGE: "stateChange",
  },
}))

// Import after mocking
const { GameCanvas } = await import("../../src")

// Test implementation of GameCanvas
class TestGameCanvas extends GameCanvas {
  public reinitializeCallCount = 0
  public clearRenderersCallCount = 0
  public setupEventListenersCallCount = 0
  public rendererMap = new Map<string, MockRenderer>()

  protected setupRenderers(): void {
    this.reinitializeCallCount++

    // Simulate clearing and recreating renderers
    this.rendererMap.clear()
    const renderer1 = new MockRenderer()
    const renderer2 = new MockRenderer()
    this.rendererMap.set("renderer1", renderer1)
    this.rendererMap.set("renderer2", renderer2)
    this.registerRenderer("renderer1", renderer1 as any)
    this.registerRenderer("renderer2", renderer2 as any)
  }

  protected clearRenderers(): void {
    this.clearRenderersCallCount++
    super.clearRenderers()
  }

  protected render(): void {
    // Mock render implementation
  }

  // Expose protected methods for testing
  public testRegisterRenderer(name: string, renderer: MockRenderer): void {
    this.registerRenderer(name, renderer as any)
  }

  public testUnregisterRenderer(name: string): void {
    this.unregisterRenderer(name)
  }

  public testClearRenderers(): void {
    this.clearRenderers()
  }

  protected setupEventListeners(): void {
    this.setupEventListenersCallCount++
    super.setupEventListeners()
  }

  public testSetupEventListeners(): void {
    this.setupEventListeners()
  }

  public getRendererCount(): number {
    return this.renderers.size
  }

  public hasRenderer(name: string): boolean {
    return this.renderers.has(name)
  }

  public getRenderer(name: string): MockRenderer | undefined {
    return this.renderers.get(name) as MockRenderer
  }
}

describe("GameCanvas Renderer Management", () => {
  let canvas: TestGameCanvas
  let mockEngine: MockGameEngine

  beforeEach(() => {
    // Create canvas directly without DOM
    canvas = new TestGameCanvas({
      width: 800,
      height: 600,
      worldWidth: 1000,
      worldHeight: 1000,
    })

    mockEngine = new MockGameEngine()
  })

  describe("Renderer Registration", () => {
    it("should register renderers correctly", () => {
      const renderer1 = new MockRenderer()
      const renderer2 = new MockRenderer()

      canvas.testRegisterRenderer("test1", renderer1)
      canvas.testRegisterRenderer("test2", renderer2)

      expect(canvas.getRendererCount()).toBe(2)
      expect(canvas.hasRenderer("test1")).toBe(true)
      expect(canvas.hasRenderer("test2")).toBe(true)
      expect(canvas.getRenderer("test1")).toBe(renderer1)
      expect(canvas.getRenderer("test2")).toBe(renderer2)
    })

    it("should allow overwriting existing renderers", () => {
      const renderer1 = new MockRenderer()
      const renderer2 = new MockRenderer()

      canvas.testRegisterRenderer("test", renderer1)
      expect(canvas.getRenderer("test")).toBe(renderer1)

      canvas.testRegisterRenderer("test", renderer2)
      expect(canvas.getRenderer("test")).toBe(renderer2)
      expect(canvas.getRendererCount()).toBe(1)
    })

    it("should handle multiple registrations of the same renderer", () => {
      const renderer = new MockRenderer()

      canvas.testRegisterRenderer("test1", renderer)
      canvas.testRegisterRenderer("test2", renderer)

      expect(canvas.getRendererCount()).toBe(2)
      expect(canvas.getRenderer("test1")).toBe(renderer)
      expect(canvas.getRenderer("test2")).toBe(renderer)
    })
  })

  describe("Renderer Unregistration", () => {
    it("should unregister renderers correctly", () => {
      const renderer1 = new MockRenderer()
      const renderer2 = new MockRenderer()

      canvas.testRegisterRenderer("test1", renderer1)
      canvas.testRegisterRenderer("test2", renderer2)

      canvas.testUnregisterRenderer("test1")

      expect(canvas.getRendererCount()).toBe(1)
      expect(canvas.hasRenderer("test1")).toBe(false)
      expect(canvas.hasRenderer("test2")).toBe(true)
    })

    it("should handle unregistering non-existent renderers", () => {
      expect(() => canvas.testUnregisterRenderer("nonexistent")).not.toThrow()
      expect(canvas.getRendererCount()).toBe(0)
    })

    it("should allow re-registration after unregistration", () => {
      const renderer = new MockRenderer()

      canvas.testRegisterRenderer("test", renderer)
      canvas.testUnregisterRenderer("test")
      canvas.testRegisterRenderer("test", renderer)

      expect(canvas.hasRenderer("test")).toBe(true)
      expect(canvas.getRenderer("test")).toBe(renderer)
    })
  })

  describe("Renderer Clearing", () => {
    it("should clear all registered renderers", () => {
      const renderer1 = new MockRenderer()
      const renderer2 = new MockRenderer()

      canvas.testRegisterRenderer("test1", renderer1)
      canvas.testRegisterRenderer("test2", renderer2)

      canvas.testClearRenderers()

      expect(renderer1.clearCallCount).toBe(1)
      expect(renderer2.clearCallCount).toBe(1)
    })

    it("should handle clearing when no renderers are registered", () => {
      expect(() => canvas.testClearRenderers()).not.toThrow()
    })

    it("should not affect renderer registration state when clearing", () => {
      const renderer = new MockRenderer()
      canvas.testRegisterRenderer("test", renderer)

      canvas.testClearRenderers()

      expect(canvas.hasRenderer("test")).toBe(true)
      expect(canvas.getRenderer("test")).toBe(renderer)
    })
  })

  describe("Game Engine Integration", () => {
    it("should call setupRenderers when setting game engine", () => {
      const initialCount = canvas.reinitializeCallCount

      canvas.setGameEngine(mockEngine)

      expect(canvas.reinitializeCallCount).toBe(initialCount + 1)
    })

    it("should clear renderers before setting up layers", () => {
      canvas.setGameEngine(mockEngine)

      expect(canvas.clearRenderersCallCount).toBeGreaterThan(0)
      expect(canvas.reinitializeCallCount).toBeGreaterThan(0)
    })

    it("should setup game engine state listeners when setting game engine", () => {
      const onSpy = mock(() => {
        /* Mock function for event listener setup */
      })
      const offSpy = mock(() => {
        /* Mock function for event listener removal */
      })

      mockEngine.on = onSpy
      mockEngine.off = offSpy

      canvas.setGameEngine(mockEngine)

      expect(onSpy).toHaveBeenCalledWith("stateChange", expect.any(Function))
    })

    it("should handle setting null game engine", () => {
      canvas.setGameEngine(mockEngine)
      expect(() => canvas.setGameEngine(null)).not.toThrow()
    })
  })

  describe("Game State Propagation", () => {
    beforeEach(() => {
      canvas.setGameEngine(mockEngine)
    })

    it("should propagate state changes to all registered renderers", () => {
      // Get renderers that were created during setupRenderers
      const renderer1 = canvas.rendererMap.get("renderer1")!
      const renderer2 = canvas.rendererMap.get("renderer2")!

      expect(renderer1.updateGameStateCallCount).toBe(0)
      expect(renderer2.updateGameStateCallCount).toBe(0)

      mockEngine.setState(GameState.PLAYING)

      expect(renderer1.updateGameStateCallCount).toBe(1)
      expect(renderer2.updateGameStateCallCount).toBe(1)
      expect(renderer1.lastGameState).toBe(GameState.PLAYING)
      expect(renderer2.lastGameState).toBe(GameState.PLAYING)
    })

    it("should handle multiple state changes", () => {
      const renderer1 = canvas.rendererMap.get("renderer1")!
      const renderer2 = canvas.rendererMap.get("renderer2")!

      mockEngine.setState(GameState.PLAYING)
      mockEngine.setState(GameState.PAUSED)
      mockEngine.setState(GameState.ENDED)

      expect(renderer1.updateGameStateCallCount).toBe(3)
      expect(renderer2.updateGameStateCallCount).toBe(3)
      expect(renderer1.lastGameState).toBe(GameState.ENDED)
      expect(renderer2.lastGameState).toBe(GameState.ENDED)
    })

    it("should propagate state to renderers registered after engine setup", () => {
      const newRenderer = new MockRenderer()
      canvas.testRegisterRenderer("newRenderer", newRenderer)

      mockEngine.setState(GameState.PLAYING)

      expect(newRenderer.updateGameStateCallCount).toBe(1)
      expect(newRenderer.lastGameState).toBe(GameState.PLAYING)
    })

    it("should not propagate state to unregistered renderers", () => {
      const renderer1 = canvas.rendererMap.get("renderer1")!
      const renderer2 = canvas.rendererMap.get("renderer2")!

      canvas.testUnregisterRenderer("renderer1")
      mockEngine.setState(GameState.PLAYING)

      expect(renderer1.updateGameStateCallCount).toBe(0)
      expect(renderer2.updateGameStateCallCount).toBe(1)
    })

    it("should handle state changes when no renderers are registered", () => {
      // Clear all renderers by recreating canvas without engine
      const emptyCanvas = new TestGameCanvas({
        width: 800,
        height: 600,
        worldWidth: 1000,
        worldHeight: 1000,
      })

      emptyCanvas.setGameEngine(mockEngine)
      expect(() => mockEngine.setState(GameState.PLAYING)).not.toThrow()
    })

    it("should handle rapid state changes", () => {
      const renderer = canvas.rendererMap.get("renderer1")!
      const states = [
        GameState.PLAYING,
        GameState.PAUSED,
        GameState.PLAYING,
        GameState.PAUSED,
        GameState.ENDED,
      ]

      states.forEach((state) => mockEngine.setState(state))

      expect(renderer.updateGameStateCallCount).toBe(states.length)
      expect(renderer.lastGameState).toBe(GameState.ENDED)
    })
  })

  describe("Event Listener Management", () => {
    it("should remove existing event listeners before adding new ones", () => {
      const engine1 = new MockGameEngine()
      const engine2 = new MockGameEngine()

      const off1Spy = mock(() => {
        /* Mock event listener removal for engine1 */
      })
      const on1Spy = mock(() => {
        /* Mock event listener setup for engine1 */
      })
      const on2Spy = mock(() => {
        /* Mock event listener setup for engine2 */
      })

      engine1.off = off1Spy
      engine1.on = on1Spy
      engine2.on = on2Spy

      canvas.setGameEngine(engine1)
      canvas.setGameEngine(engine2)

      // Should remove listeners from engine1 and add to engine2
      expect(off1Spy).toHaveBeenCalled()
      expect(on1Spy).toHaveBeenCalled()
      expect(on2Spy).toHaveBeenCalled()
    })

    it("should handle multiple engine setups without memory leaks", () => {
      const engine1 = new MockGameEngine()
      const engine2 = new MockGameEngine()

      const off1Spy = mock(() => {
        /* Mock event listener removal for engine1 */
      })
      const on1Spy = mock(() => {
        /* Mock event listener setup for engine1 */
      })
      const on2Spy = mock(() => {
        /* Mock event listener setup for engine2 */
      })

      engine1.off = off1Spy
      engine1.on = on1Spy
      engine2.on = on2Spy

      canvas.setGameEngine(engine1)
      canvas.setGameEngine(engine2)

      // Engine1 should have listeners removed, both should have listeners added
      expect(off1Spy).toHaveBeenCalled()
      expect(on1Spy).toHaveBeenCalled()
      expect(on2Spy).toHaveBeenCalled()
    })

    it("should handle event listener setup with null engine", () => {
      canvas.setGameEngine(mockEngine)
      expect(() => canvas.setGameEngine(null)).not.toThrow()
    })
  })

  describe("Error Handling", () => {
    it("should handle renderer errors during state propagation", () => {
      const originalConsoleError = console.error
      const errorLogs: any[] = []
      console.error = (...args: any[]) => errorLogs.push(args)

      class ErrorRenderer extends MockRenderer {
        updateGameState(): void {
          throw new Error("Renderer error")
        }
      }

      const goodRenderer = new MockRenderer()
      const errorRenderer = new ErrorRenderer()

      canvas.setGameEngine(mockEngine)
      canvas.testRegisterRenderer("good", goodRenderer)
      canvas.testRegisterRenderer("error", errorRenderer)

      // GameCanvas should handle renderer errors gracefully
      expect(() => mockEngine.setState(GameState.PLAYING)).not.toThrow()
      expect(goodRenderer.updateGameStateCallCount).toBe(1)
      expect(errorLogs.length).toBe(1)
      expect(errorLogs[0][0]).toContain("Error updating renderer game state")

      // Restore console.error
      console.error = originalConsoleError
    })

    it("should handle renderer errors during clearing", () => {
      const originalConsoleError = console.error
      const errorLogs: any[] = []
      console.error = (...args: any[]) => errorLogs.push(args)

      class ErrorRenderer extends MockRenderer {
        clear(): void {
          throw new Error("Clear error")
        }
      }

      const errorRenderer = new ErrorRenderer()
      canvas.testRegisterRenderer("error", errorRenderer)

      expect(() => canvas.testClearRenderers()).not.toThrow()
      expect(errorLogs.length).toBe(1)

      // Restore console.error
      console.error = originalConsoleError
    })

    it("should handle invalid renderer registrations", () => {
      expect(() =>
        canvas.testRegisterRenderer("", new MockRenderer()),
      ).not.toThrow()
      expect(() =>
        canvas.testRegisterRenderer("null", null as any),
      ).not.toThrow()
      expect(() =>
        canvas.testRegisterRenderer("undefined", undefined as any),
      ).not.toThrow()
    })
  })

  describe("Integration Scenarios", () => {
    it("should handle complete game lifecycle", () => {
      canvas.setGameEngine(mockEngine)
      const renderer = canvas.rendererMap.get("renderer1")!

      // Start game
      mockEngine.setState(GameState.PLAYING)
      expect(renderer.lastGameState).toBe(GameState.PLAYING)

      // Pause game
      mockEngine.setState(GameState.PAUSED)
      expect(renderer.lastGameState).toBe(GameState.PAUSED)

      // Resume game
      mockEngine.setState(GameState.PLAYING)
      expect(renderer.lastGameState).toBe(GameState.PLAYING)

      // End game
      mockEngine.setState(GameState.ENDED)
      expect(renderer.lastGameState).toBe(GameState.ENDED)

      // Reset to ready
      mockEngine.setState(GameState.READY)
      expect(renderer.lastGameState).toBe(GameState.READY)

      expect(renderer.updateGameStateCallCount).toBe(5)
    })

    it("should handle engine replacement during game", () => {
      const engine1 = new MockGameEngine()
      const engine2 = new MockGameEngine()

      canvas.setGameEngine(engine1)
      let renderer = canvas.rendererMap.get("renderer1")!

      engine1.setState(GameState.PLAYING)
      expect(renderer.updateGameStateCallCount).toBe(1)

      // Replace engine (simulates level change or restart)
      canvas.setGameEngine(engine2)
      renderer = canvas.rendererMap.get("renderer1")! // Get new renderer instance

      engine2.setState(GameState.PLAYING)
      expect(renderer.updateGameStateCallCount).toBe(1)

      // Engine1 state changes should not affect new renderers
      engine1.setState(GameState.PAUSED)
      expect(renderer.updateGameStateCallCount).toBe(1) // Should still be 1
    })

    it("should handle renderer registration during different game states", () => {
      canvas.setGameEngine(mockEngine)
      mockEngine.setState(GameState.PLAYING)

      const lateRenderer = new MockRenderer()
      canvas.testRegisterRenderer("late", lateRenderer)

      // Late renderer should receive next state change
      mockEngine.setState(GameState.PAUSED)
      expect(lateRenderer.updateGameStateCallCount).toBe(1)
      expect(lateRenderer.lastGameState).toBe(GameState.PAUSED)
    })
  })
})
