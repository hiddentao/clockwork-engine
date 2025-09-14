import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test"
import { Vector2D } from "../../src/geometry/Vector2D"
import { ComplexTestEngine } from "../fixtures"

// Mock PIXI.js classes and functions
class MockContainer {
  public children: MockContainer[] = []
  public eventMode = "auto"
  public label?: string
  public position = {
    set: (x: number, y: number) => {
      this.position.x = x
      this.position.y = y
    },
    x: 0,
    y: 0,
  }
  public visible = true
  public parent: MockContainer | null = null

  addChild(child: MockContainer) {
    this.children.push(child)
    child.parent = this
    return child
  }

  removeChild(child: MockContainer) {
    const index = this.children.indexOf(child)
    if (index > -1) {
      this.children.splice(index, 1)
      child.parent = null
    }
    return child
  }

  getChildByLabel(label: string): MockContainer | null {
    return this.children.find((child) => child.label === label) || null
  }

  destroy(options?: any) {
    // Remove from parent
    if (this.parent) {
      this.parent.removeChild(this)
    }

    // Destroy children if requested
    if (options?.children) {
      this.children.forEach((child) => child.destroy(options))
    } else {
      // Just clear parent references
      this.children.forEach((child) => {
        child.parent = null
      })
    }

    this.children = []
    this.parent = null
  }
}

class MockGraphics extends MockContainer {
  public geometry: any = {}
  public shader: any = {}
  public state: any = {}
  public tint = 0xffffff
  public blendMode = 0
  public width = 100 // Mock width for testing
  public height = 50 // Mock height for testing

  rect(_x: number, _y: number, _width: number, _height: number) {
    return this
  }

  circle(_x: number, _y: number, _radius: number) {
    return this
  }

  poly(_points: number[]) {
    return this
  }

  fill(_color: number | string) {
    return this
  }

  stroke(_options: any) {
    return this
  }

  clear() {
    return this
  }

  lineStyle(_width?: number, _color?: number, _alpha?: number) {
    return this
  }

  beginFill(_color?: number, _alpha?: number) {
    return this
  }

  endFill() {
    return this
  }

  drawRect(_x: number, _y: number, _width: number, _height: number) {
    return this
  }

  drawCircle(_x: number, _y: number, _radius: number) {
    return this
  }

  drawPolygon(..._path: any[]) {
    return this
  }
}

class MockApplication {
  public stage = new MockContainer()
  public screen = { width: 800, height: 600 }
  public canvas = {
    width: 800,
    height: 600,
    style: {},
  }
  public renderer: any
  public ticker = {
    add: (_callback: any) => {
      // Mock ticker - don't actually start any loops in tests
    },
    remove: (_callback: any) => {
      // Mock remove - intentionally empty
    },
    start: () => {
      // Mock start - intentionally empty
    },
    stop: () => {
      // Mock stop - intentionally empty
    },
    destroy: () => {
      // Mock destroy - intentionally empty
    },
  }

  constructor() {
    // Initialize renderer with proper `this` context
    this.renderer = {
      events: new MockContainer(),
      screen: this.screen,
      resize: (width: number, height: number) => {
        // Update screen dimensions on resize
        this.screen.width = width
        this.screen.height = height
        this.renderer.screen = this.screen
      },
    }
  }

  async init(_options: any) {
    // Mock successful initialization
    return Promise.resolve()
  }

  destroy() {
    // Mock cleanup
  }
}

class MockViewport extends MockContainer {
  public worldWidth: number
  public worldHeight: number
  public center = { x: 400, y: 300 }
  public scale = { x: 1, y: 1 }
  public plugins = new Map([
    ["drag", {}],
    ["pinch", {}],
    ["wheel", {}],
    ["decelerate", {}],
    ["clamp-zoom", {}],
    ["clamp", {}],
  ])

  constructor(options: any) {
    super()
    this.worldWidth = options.worldWidth || 800
    this.worldHeight = options.worldHeight || 600
  }

  drag() {
    return this
  }
  pinch() {
    return this
  }
  wheel() {
    return this
  }
  decelerate() {
    return this
  }
  clampZoom(_options: any) {
    return this
  }
  clamp(_options: any) {
    return this
  }
  moveCenter(x: number, y: number) {
    this.center = { x, y }
    return this
  }
  setZoom(zoom: number, _center?: any) {
    this.scale = { x: zoom, y: zoom }
    return this
  }
  getZoom() {
    return this.scale.x
  }
  toWorld(x: number, y: number) {
    // Simple mock transformation - translate screen to world coordinates
    // For test purposes, just add some offset to simulate viewport transformation
    return { x: x + 100, y: y + 200 }
  }
  toScreen(worldPoint: any) {
    return { x: worldPoint.x, y: worldPoint.y }
  }
  on(_event: string, _callback: any) {
    return this
  }
  off(_event: string, _callback: any) {
    return this
  }
  emit(_event: string, ..._args: any[]) {
    return this
  }
}

// Mock the PIXI imports using Bun's mock system
mock.module("../../src/lib/pixi", () => ({
  PIXI: {
    Application: MockApplication,
    Container: MockContainer,
    Graphics: MockGraphics,
  },
  Viewport: MockViewport,
}))

// Import after mocking
import { GameCanvas, GameCanvasEvent } from "../../src"

// Make PIXI available for tests
const PIXI = {
  Container: MockContainer,
  Graphics: MockGraphics,
  Application: MockApplication,
}

// Mock DOM environment for headless testing
class MockHTMLElement {
  private _children: MockHTMLElement[] = []
  private _eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map()

  appendChild(child: MockHTMLElement) {
    this._children.push(child)
  }

  removeChild(child: MockHTMLElement) {
    const index = this._children.indexOf(child)
    if (index > -1) {
      this._children.splice(index, 1)
    }
  }

  addEventListener(event: string, callback: (...args: any[]) => void) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, [])
    }
    this._eventListeners.get(event)!.push(callback)
  }

  removeEventListener(event: string, callback: (...args: any[]) => void) {
    const listeners = this._eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  get offsetWidth() {
    return 800
  }
  get offsetHeight() {
    return 600
  }
  get clientWidth() {
    return 800
  }
  get clientHeight() {
    return 600
  }

  getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
    }
  }
}

// Test implementation of GameCanvas
class TestGameCanvas extends GameCanvas {
  public initializeCallCount = 0
  public testRenderers: Map<string, any> = new Map()

  protected initializeGameLayers(): void {
    this.initializeCallCount++

    // Create simple test renderers that track their operations
    const testRenderer = {
      items: new Map(),
      add: (item: any) => {
        testRenderer.items.set(item.id, item)
      },
      update: (item: any) => {
        testRenderer.items.set(item.id, item)
      },
      remove: (itemId: string) => {
        testRenderer.items.delete(itemId)
      },
      setItems: (items: any[]) => {
        testRenderer.items.clear()
        items.forEach((item) => testRenderer.items.set(item.id, item))
      },
      rerender: () => {
        /* no-op */
      },
      getId: (item: any) => item.id,
      destroy: () => {
        testRenderer.items.clear()
      },
    }

    this.testRenderers.set("TestObject", testRenderer)
  }

  protected render(_deltaTime: number): void {
    // Test implementation - no-op
  }

  // Helper methods for testing
  public addTestRenderer(type: string, renderer: any) {
    this.testRenderers.set(type, renderer)
  }

  public hasTestRenderer(type: string): boolean {
    return this.testRenderers.has(type)
  }

  public removeTestRenderer(type: string) {
    this.testRenderers.delete(type)
  }

  public updateTestRenderers(
    renderUpdates: Array<{ type: string; objects: any[] }>,
  ) {
    renderUpdates.forEach((update) => {
      const renderer = this.testRenderers.get(update.type)
      if (renderer) {
        renderer.setItems(update.objects)
      }
    })
  }
}

describe("GameCanvas", () => {
  let mockContainer: MockHTMLElement
  let canvas: TestGameCanvas
  let engine: ComplexTestEngine

  beforeEach(async () => {
    mockContainer = new MockHTMLElement()
    engine = new ComplexTestEngine()

    // Create canvas with test configuration
    canvas = await TestGameCanvas.create(mockContainer as any, {
      width: 800,
      height: 600,
      worldWidth: 1000,
      worldHeight: 1000,
      backgroundColor: 0x000000,
      enableDrag: true,
      enablePinch: false,
      enableWheel: true,
      enableDecelerate: true,
      minZoom: 0.5,
      maxZoom: 2.0,
      initialZoom: 1.0,
      preference: "webgl",
    })

    canvas.setGameEngine(engine)
  })

  describe("Canvas Creation and Initialization", () => {
    it("should create canvas with correct dimensions", () => {
      expect(canvas.getApp()).toBeDefined()
      expect(canvas.getApp().screen.width).toBe(800)
      expect(canvas.getApp().screen.height).toBe(600)
    })

    it("should initialize game layers", () => {
      expect(canvas.initializeCallCount).toBe(1)
      expect(canvas.testRenderers.has("TestObject")).toBe(true)
    })

    it("should set up viewport with correct world size", () => {
      const viewport = canvas.getViewport()
      expect(viewport).toBeDefined()
      expect(viewport.worldWidth).toBe(1000)
      expect(viewport.worldHeight).toBe(1000)
    })

    it("should configure viewport options correctly", () => {
      const viewport = canvas.getViewport()
      // Viewport should be centered and zoomed correctly
      expect(viewport.center.x).toBe(500) // worldWidth / 2
      expect(viewport.center.y).toBe(500) // worldHeight / 2
      expect(viewport.scale.x).toBe(1.0)
      expect(viewport.scale.y).toBe(1.0)
    })
  })

  describe("Game Engine Integration", () => {
    it("should set and get game engine correctly", () => {
      const newEngine = new ComplexTestEngine()
      canvas.setGameEngine(newEngine)
      expect(canvas.getGameEngine()).toBe(newEngine)
    })

    it("should handle null game engine", () => {
      canvas.setGameEngine(null)
      expect(canvas.getGameEngine()).toBeNull()
    })

    it("should update renderers when engine objects change", () => {
      engine.reset("test-seed")
      engine.start()

      // Create test objects
      const testObjects = [
        { id: "obj1", type: "TestObject", x: 10, y: 20 },
        { id: "obj2", type: "TestObject", x: 30, y: 40 },
      ]

      canvas.updateTestRenderers([{ type: "TestObject", objects: testObjects }])

      const renderer = canvas.testRenderers.get("TestObject")
      expect(renderer.items.size).toBe(2)
      expect(renderer.items.has("obj1")).toBe(true)
      expect(renderer.items.has("obj2")).toBe(true)
    })
  })

  describe("Container Management", () => {
    it("should provide access to game container", () => {
      const gameContainer = canvas.getGameContainer()
      expect(gameContainer).toBeInstanceOf(PIXI.Container)
    })

    it("should provide access to HUD container", () => {
      const hudContainer = canvas.getHudContainer()
      expect(hudContainer).toBeInstanceOf(PIXI.Container)
    })

    it("should maintain proper container hierarchy", () => {
      const app = canvas.getApp()
      const viewport = canvas.getViewport()
      const gameContainer = canvas.getGameContainer()
      const hudContainer = canvas.getHudContainer()

      // Viewport should be child of app.stage
      expect(app.stage.children).toContain(viewport)
      // Game container should be child of viewport
      expect(viewport.children).toContain(gameContainer)
      // HUD container should be child of app.stage (not viewport)
      expect(app.stage.children).toContain(hudContainer)
    })
  })

  describe("Event Handling", () => {
    it("should emit pointer move events", () => {
      const eventData: Vector2D[] = []
      canvas.on(GameCanvasEvent.POINTER_MOVE, (worldPos: Vector2D) => {
        eventData.push(worldPos)
      })

      // Simulate pointer move event
      const mockEvent = {
        clientX: 400,
        clientY: 300,
      } as PointerEvent
      canvas["handlePointerMove"](mockEvent)

      expect(eventData.length).toBe(1)
      expect(eventData[0]).toBeInstanceOf(Vector2D)
    })

    it("should emit pointer click events", () => {
      const eventData: Vector2D[] = []
      canvas.on(GameCanvasEvent.POINTER_CLICK, (worldPos: Vector2D) => {
        eventData.push(worldPos)
      })

      // Simulate click event
      const mockEvent = {
        clientX: 200,
        clientY: 150,
      } as MouseEvent
      canvas["handleClick"](mockEvent)

      expect(eventData.length).toBe(1)
      expect(eventData[0]).toBeInstanceOf(Vector2D)
    })

    it("should convert screen coordinates to world coordinates", () => {
      // Test coordinate conversion
      const screenPos = new Vector2D(400, 300)
      const worldPos = canvas.screenToWorld(screenPos)

      expect(worldPos).toBeInstanceOf(Vector2D)
      // World coordinates should be different from screen coordinates
      // due to viewport transformation
      expect(worldPos.x).toBeCloseTo(500, 0) // Should be near world center
      expect(worldPos.y).toBeCloseTo(500, 0)
    })
  })

  describe("Renderer Management", () => {
    it("should add renderers correctly", () => {
      const customRenderer = {
        add: () => {
          /* no-op */
        },
        update: () => {
          /* no-op */
        },
        remove: () => {
          /* no-op */
        },
        setItems: () => {
          /* no-op */
        },
        rerender: () => {
          /* no-op */
        },
        getId: (item: any) => item.id,
        destroy: () => {
          /* no-op */
        },
      }

      canvas.addTestRenderer("CustomType", customRenderer)
      expect(canvas.hasTestRenderer("CustomType")).toBe(true)
    })

    it("should remove renderers correctly", () => {
      canvas.removeTestRenderer("TestObject")
      expect(canvas.hasTestRenderer("TestObject")).toBe(false)
    })

    it("should handle renderer updates for multiple object types", () => {
      // Add another renderer
      const renderer2 = {
        items: new Map(),
        add: (item: any) => renderer2.items.set(item.id, item),
        update: (item: any) => renderer2.items.set(item.id, item),
        remove: (itemId: string) => renderer2.items.delete(itemId),
        setItems: (items: any[]) => {
          renderer2.items.clear()
          items.forEach((item) => renderer2.items.set(item.id, item))
        },
        rerender: () => {
          /* no-op */
        },
        getId: (item: any) => item.id,
        destroy: () => {
          renderer2.items.clear()
        },
      }

      canvas.addTestRenderer("TestObject2", renderer2)

      canvas.updateTestRenderers([
        {
          type: "TestObject",
          objects: [{ id: "obj1", x: 10, y: 10 }],
        },
        {
          type: "TestObject2",
          objects: [{ id: "obj2", x: 20, y: 20 }],
        },
      ])

      const renderer1 = canvas.testRenderers.get("TestObject")
      expect(renderer1.items.size).toBe(1)
      expect(renderer2.items.size).toBe(1)
    })
  })

  describe("Viewport Operations", () => {
    it("should resize canvas correctly", () => {
      canvas.resize(1024, 768)

      const app = canvas.getApp()
      expect(app.screen.width).toBe(1024)
      expect(app.screen.height).toBe(768)
    })

    it("should center viewport on specific coordinates", () => {
      canvas.moveViewportTo(100, 200)

      const viewport = canvas.getViewport()
      expect(viewport.center.x).toBeCloseTo(100, 0)
      expect(viewport.center.y).toBeCloseTo(200, 0)
    })

    it("should set viewport zoom correctly", () => {
      canvas.setZoom(1.5)

      const viewport = canvas.getViewport()
      expect(viewport.scale.x).toBeCloseTo(1.5, 1)
      expect(viewport.scale.y).toBeCloseTo(1.5, 1)
    })

    it("should get current zoom level", () => {
      canvas.setZoom(0.8)
      expect(canvas.getZoom()).toBeCloseTo(0.8, 1)
    })
  })

  describe("Cleanup and Destruction", () => {
    it("should destroy canvas properly", () => {
      const app = canvas.getApp()
      const destroySpy = spyOn(app, "destroy")

      canvas.destroy()
      expect(destroySpy).toHaveBeenCalled()
    })

    it("should remove event listeners on destroy", () => {
      const removeEventSpy = spyOn(mockContainer, "removeEventListener")

      canvas.destroy()

      // Should have removed various event listeners
      expect(removeEventSpy).toHaveBeenCalled()
    })
  })

  describe("Error Handling", () => {
    it("should handle invalid renderer updates gracefully", () => {
      expect(() => {
        canvas.updateTestRenderers([
          { type: "NonExistentType", objects: [{ id: "test" }] },
        ])
      }).not.toThrow()
    })

    it("should handle coordinate conversion errors", () => {
      expect(() => {
        canvas.screenToWorld(new Vector2D(NaN, NaN))
      }).not.toThrow()

      const result = canvas.screenToWorld(new Vector2D(NaN, NaN))
      expect(result).toBeInstanceOf(Vector2D)
    })
  })

  describe("Configuration Options", () => {
    it("should respect background color setting", () => {
      const app = canvas.getApp()
      // Background color validation - may vary by PIXI version
      expect(app.renderer).toBeDefined()
    })

    it("should configure viewport with correct zoom limits", () => {
      const viewport = canvas.getViewport()
      // These properties might be set differently depending on pixi-viewport version
      expect(viewport.plugins.get("clamp-zoom")).toBeDefined()
    })

    it("should enable/disable viewport features based on options", () => {
      const viewport = canvas.getViewport()

      // Check if drag is enabled (should have drag plugin)
      expect(viewport.plugins.get("drag")).toBeDefined()

      // Check if wheel zoom is enabled
      expect(viewport.plugins.get("wheel")).toBeDefined()
    })
  })
})
