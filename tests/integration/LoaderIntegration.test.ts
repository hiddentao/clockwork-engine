import { beforeEach, describe, expect, it } from "bun:test"
import { Vector2D } from "../../src/geometry/Vector2D"
import { GameState } from "../../src/types"
import { ComplexTestEngine, MockLoader } from "../fixtures"

describe("Loader Integration", () => {
  let loader: MockLoader
  let engine: ComplexTestEngine

  beforeEach(() => {
    loader = new MockLoader()
    engine = new ComplexTestEngine(loader)
  })

  describe("GameEngine Integration", () => {
    it("should initialize engine with loader", () => {
      expect(engine.getLoader()).toBe(loader)
    })

    it("should work without loader", () => {
      const engineWithoutLoader = new ComplexTestEngine()
      expect(engineWithoutLoader.getLoader()).toBeUndefined()
    })

    it("should maintain loader reference through reset", () => {
      engine.reset("test-seed")
      expect(engine.getLoader()).toBe(loader)
      expect(engine.getState()).toBe(GameState.READY)
    })

    it("should allow loader usage during game setup", () => {
      loader.setMockData("test-config", '{"value": 42}', "config")

      engine.reset("test-seed")

      // The loader should be available during setup
      expect(engine.getLoader()).toBe(loader)
    })
  })

  describe("Recording and Replay Integration", () => {
    it("should maintain determinism with loader data", async () => {
      // Set up some game configuration data
      loader.setMockData(
        "game-config",
        JSON.stringify({
          playerSpeed: 5,
          enemyCount: 3,
        }),
        "config",
      )

      // First playthrough
      engine.reset("determinism-test")
      engine.start()

      // Simulate some game actions
      for (let i = 0; i < 10; i++) {
        engine.update(1)
      }

      const finalFrames1 = engine.getTotalTicks()

      // Second playthrough with same seed
      const engine2 = new ComplexTestEngine(loader)
      engine2.reset("determinism-test")
      engine2.start()

      // Same actions
      for (let i = 0; i < 10; i++) {
        engine2.update(1)
      }

      const finalFrames2 = engine2.getTotalTicks()

      // Should be deterministic regardless of loader
      expect(finalFrames1).toBe(finalFrames2)
      expect(engine.getLoader()).toBe(loader)
      expect(engine2.getLoader()).toBe(loader)
    })

    it("should maintain loader reference during game operations", async () => {
      // Setup game with loader
      loader.setMockData(
        "level-data",
        JSON.stringify({
          levelId: "test-level",
          enemies: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
        }),
        "level",
      )

      engine.reset("loader-test")
      engine.start()

      // Create some game objects and simulate gameplay
      engine.createAutoPlayer(new Vector2D(5, 5))
      engine.createAutoEnemy(new Vector2D(15, 15))

      // Simulate game actions
      for (let i = 0; i < 15; i++) {
        engine.update(1)
      }

      const finalFrames = engine.getTotalTicks()

      // Loader should still be accessible
      expect(engine.getLoader()).toBe(loader)
      expect(finalFrames).toBe(15)

      // Should be able to load data during gameplay
      const levelData = await loader.fetchData("level-data", { type: "level" })
      const parsed = JSON.parse(levelData)
      expect(parsed.levelId).toBe("test-level")
    })

    it("should handle loader errors gracefully during gameplay", async () => {
      // Setup initial data
      loader.setMockData("config", '{"test": true}', "game")
      loader.setFailureIds("bad-config")

      engine.reset("error-test")
      engine.start()
      engine.update(5)

      // Good data should work
      const goodData = await loader.fetchData("config", { type: "game" })
      expect(JSON.parse(goodData).test).toBe(true)

      // Bad data should fail but not break engine
      await expect(
        loader.fetchData("bad-config", { type: "game" }),
      ).rejects.toThrow("Mock error for id: bad-config")

      // Engine should still be functional
      expect(engine.getTotalTicks()).toBe(5)
      engine.update(3)
      expect(engine.getTotalTicks()).toBe(8)
    })
  })

  describe("Serialization Integration", () => {
    it("should handle loader in serialized game state", () => {
      // The loader itself shouldn't be serialized, but should be available
      engine.reset("serialization-test")
      engine.start()

      // Engine should maintain loader reference
      expect(engine.getLoader()).toBe(loader)

      // Game objects created during gameplay should work normally
      engine.createAutoPlayer(new Vector2D(10, 10))
      expect(engine.getTotalObjectCount()).toBeGreaterThan(0)
    })

    it("should work with custom serializable data from loader", async () => {
      // Store serializable game data
      const gameData = {
        customValue: new Vector2D(100, 200),
        settings: { difficulty: "hard" },
      }

      loader.setMockData(
        "custom-data",
        JSON.stringify({
          ...gameData,
          customValue: { x: gameData.customValue.x, y: gameData.customValue.y },
        }),
        "game",
      )

      engine.reset("serialization-test")

      // The loader should be accessible and return valid data
      const fetchedData = await loader.fetchData("custom-data", {
        type: "game",
      })
      const parsed = JSON.parse(fetchedData)

      expect(parsed.customValue).toEqual({ x: 100, y: 200 })
      expect(parsed.settings.difficulty).toBe("hard")
    })
  })

  describe("Performance Integration", () => {
    it("should not impact game loop performance significantly", async () => {
      // Setup loader with some data
      for (let i = 0; i < 100; i++) {
        loader.setMockData(`data-${i}`, `value-${i}`, "performance")
      }

      engine.reset("performance-test")
      engine.start()

      // Create several game objects
      for (let i = 0; i < 20; i++) {
        engine.createAutoPlayer(new Vector2D(i * 2, i * 3))
        engine.createAutoEnemy(new Vector2D(i * 3, i * 2))
      }

      // Measure update performance
      const startTime = Date.now()
      const targetTicks = 100

      for (let i = 0; i < targetTicks; i++) {
        engine.update(1)
      }

      const duration = Date.now() - startTime

      expect(engine.getTotalTicks()).toBe(targetTicks)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })

    it("should handle concurrent loader operations", async () => {
      // Setup data for concurrent access
      for (let i = 0; i < 50; i++) {
        loader.setMockData(`concurrent-${i}`, `data-${i}`, "test")
      }

      // Simulate concurrent loader access
      const promises: Promise<string>[] = []
      for (let i = 0; i < 50; i++) {
        promises.push(loader.fetchData(`concurrent-${i}`, { type: "test" }))
      }

      const results = await Promise.all(promises)

      // All requests should succeed
      expect(results.length).toBe(50)
      results.forEach((result, index) => {
        expect(result).toBe(`data-${index}`)
      })

      expect(loader.getFetchCallCount()).toBe(50)
    })
  })

  describe("Error Handling Integration", () => {
    it("should handle loader failures gracefully during engine operation", async () => {
      loader.setFailureIds("critical-config")

      engine.reset("error-handling-test")

      // Engine should still function even if loader fails
      expect(engine.getState()).toBe(GameState.READY)

      engine.start()
      expect(engine.getState()).toBe(GameState.PLAYING)

      // Game loop should continue working
      engine.update(5)
      expect(engine.getTotalTicks()).toBe(5)
    })

    it("should maintain engine state when loader throws", async () => {
      loader.setMockData("good-data", "valid")
      loader.setFailureIds("bad-data")

      engine.reset("mixed-data-test")
      engine.start()

      // Good data should work
      const goodData = await loader.fetchData("good-data")
      expect(goodData).toBe("valid")

      // Bad data should throw but not break engine
      await expect(loader.fetchData("bad-data")).rejects.toThrow()

      // Engine should still be functional
      expect(engine.getState()).toBe(GameState.PLAYING)
      engine.update(3)
      expect(engine.getTotalTicks()).toBe(3)
    })
  })

  describe("State Management Integration", () => {
    it("should preserve loader through all game states", () => {
      engine.reset("state-test")
      expect(engine.getLoader()).toBe(loader)
      expect(engine.getState()).toBe(GameState.READY)

      engine.start()
      expect(engine.getLoader()).toBe(loader)
      expect(engine.getState()).toBe(GameState.PLAYING)

      engine.pause()
      expect(engine.getLoader()).toBe(loader)
      expect(engine.getState()).toBe(GameState.PAUSED)

      engine.resume()
      expect(engine.getLoader()).toBe(loader)
      expect(engine.getState()).toBe(GameState.PLAYING)

      engine.end()
      expect(engine.getLoader()).toBe(loader)
      expect(engine.getState()).toBe(GameState.ENDED)
    })

    it("should handle loader data across state transitions", async () => {
      loader.setMockData("persistent-data", "persistent-value", "state")

      engine.reset("persistent-test")

      // Data should be accessible in READY state
      let data = await loader.fetchData("persistent-data", { type: "state" })
      expect(data).toBe("persistent-value")

      engine.start()

      // Data should be accessible in PLAYING state
      data = await loader.fetchData("persistent-data", { type: "state" })
      expect(data).toBe("persistent-value")

      engine.pause()

      // Data should be accessible in PAUSED state
      data = await loader.fetchData("persistent-data", { type: "state" })
      expect(data).toBe("persistent-value")

      engine.end()

      // Data should be accessible in ENDED state
      data = await loader.fetchData("persistent-data", { type: "state" })
      expect(data).toBe("persistent-value")
    })
  })
})
