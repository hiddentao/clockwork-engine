import { beforeEach, describe, expect, it } from "bun:test"
import { MemoryPlatformLayer } from "@clockwork-engine/platform-memory"
import { GameEngine, type GameEngineOptions } from "../../src/GameEngine"
import type { GameConfig } from "../../src/types"
import { MockLoader } from "../fixtures"

describe("GameEngine Platform Integration", () => {
  let loader: MockLoader
  let platform: MemoryPlatformLayer

  beforeEach(() => {
    loader = new MockLoader()
    platform = new MemoryPlatformLayer()
  })

  class TestPlatformEngine extends GameEngine {
    constructor(options: GameEngineOptions) {
      super(options)
    }

    async setup(_config: GameConfig): Promise<void> {
      // Empty setup
    }
  }

  describe("Constructor", () => {
    it("should accept GameEngineOptions with loader and platform", () => {
      const options: GameEngineOptions = { loader, platform }
      const engine = new TestPlatformEngine(options)

      expect(engine.getLoader()).toBe(loader)
      expect(engine.getPlatform()).toBe(platform)
    })

    it("should store platform instance", () => {
      const engine = new TestPlatformEngine({ loader, platform })

      expect(engine.getPlatform()).toBe(platform)
    })
  })

  describe("Platform Access", () => {
    it("should provide access to rendering layer", () => {
      const engine = new TestPlatformEngine({ loader, platform })

      const rendering = engine.getPlatform().rendering
      expect(rendering).toBeDefined()
      expect(rendering.createNode).toBeDefined()
    })

    it("should provide access to audio layer", () => {
      const engine = new TestPlatformEngine({ loader, platform })

      const audio = engine.getPlatform().audio
      expect(audio).toBeDefined()
      expect(audio.initialize).toBeDefined()
    })

    it("should provide access to input layer", () => {
      const engine = new TestPlatformEngine({ loader, platform })

      const input = engine.getPlatform().input
      expect(input).toBeDefined()
      expect(input.onPointerDown).toBeDefined()
    })
  })
})
