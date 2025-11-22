import { beforeEach, describe, expect, it } from "bun:test"
import { GameCanvas, type GameCanvasOptions } from "../../src/GameCanvas"
import { GameEngine, type GameEngineOptions } from "../../src/GameEngine"
import { GameState } from "../../src/types"
import { MockLoader } from "../fixtures"
import { MockPlatformLayer } from "../helpers"

describe("GameCanvas Platform Integration", () => {
  let loader: MockLoader
  let platform: MockPlatformLayer
  let engine: GameEngine

  beforeEach(() => {
    loader = new MockLoader()
    platform = new MockPlatformLayer()
  })

  class TestGameEngine extends GameEngine {
    constructor(options: GameEngineOptions) {
      super(options)
    }

    async setup(): Promise<void> {
      // Empty setup for testing
    }
  }

  class TestGameCanvas extends GameCanvas {
    public renderCallCount = 0

    constructor(options: GameCanvasOptions, platform: MockPlatformLayer) {
      super(options, platform)
    }

    protected setupRenderers(): void {
      // Empty for testing
    }

    protected render(_deltaTicks: number): void {
      this.renderCallCount++
    }
  }

  describe("Constructor", () => {
    it("should accept platform parameter", () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      expect(canvas).toBeDefined()
    })

    it("should initialize with platform layers", () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      expect(canvas).toBeDefined()
    })
  })

  describe("Initialization", () => {
    it("should initialize without container parameter", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      expect(canvas).toBeDefined()
    })

    it("should create display nodes for game and HUD", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      const gameNode = canvas.getGameNode()
      const hudNode = canvas.getHudNode()

      expect(gameNode).toBeDefined()
      expect(hudNode).toBeDefined()
    })
  })

  describe("Input Handling", () => {
    it("should handle pointer move events", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      let receivedPosition: any = null
      canvas.on("pointerMove", (pos) => {
        receivedPosition = pos
      })

      platform.input.simulatePointerMove(100, 200)

      expect(receivedPosition).toBeDefined()
      expect(receivedPosition.x).toBeDefined()
      expect(receivedPosition.y).toBeDefined()
    })

    it("should handle click events", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      let receivedPosition: any = null
      canvas.on("pointerClick", (pos) => {
        receivedPosition = pos
      })

      platform.input.simulateClick(100, 200)

      expect(receivedPosition).toBeDefined()
    })
  })

  describe("Viewport", () => {
    it("should provide viewport position", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      const center = canvas.getViewportCenter()
      expect(center).toBeDefined()
      expect(center.x).toBe(500) // worldWidth / 2
      expect(center.y).toBe(400) // worldHeight / 2
    })

    it("should support moving viewport", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      canvas.moveViewportTo(300, 400)

      const center = canvas.getViewportCenter()
      expect(center.x).toBe(300)
      expect(center.y).toBe(400)
    })

    it("should support zoom", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      canvas.setZoom(2.0)

      const zoom = canvas.getZoom()
      expect(zoom).toBe(2.0)
    })
  })

  describe("Game Engine Integration", () => {
    it("should update renderers on state change", async () => {
      engine = new TestGameEngine({ loader, platform })
      await engine.reset({})

      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      canvas.setGameEngine(engine)
      await canvas.initialize()

      engine.start()

      expect(engine.getState()).toBe(GameState.PLAYING)
    })
  })

  describe("Coordinate Transforms", () => {
    it("should convert world to screen coordinates", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      const screenPos = canvas.worldToScreen({ x: 500, y: 400 } as any)
      expect(screenPos).toBeDefined()
      expect(screenPos.x).toBeDefined()
      expect(screenPos.y).toBeDefined()
    })

    it("should convert screen to world coordinates", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      const worldPos = canvas.screenToWorld({ x: 400, y: 300 } as any)
      expect(worldPos).toBeDefined()
      expect(worldPos.x).toBeDefined()
      expect(worldPos.y).toBeDefined()
    })
  })

  describe("Resize", () => {
    it("should handle canvas resize", async () => {
      const canvas = new TestGameCanvas(
        {
          width: 800,
          height: 600,
          worldWidth: 1000,
          worldHeight: 800,
        },
        platform,
      )

      await canvas.initialize()

      canvas.resize(1024, 768)

      // Should not throw
      expect(canvas).toBeDefined()
    })
  })
})
