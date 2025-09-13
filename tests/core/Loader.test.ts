import { beforeEach, describe, expect, it } from "bun:test"
import { Loader } from "../../src/Loader"
import { MockLoader, TestGameEngine } from "../fixtures"

describe("Loader", () => {
  let mockLoader: MockLoader
  let engine: TestGameEngine

  beforeEach(() => {
    mockLoader = new MockLoader()
    engine = new TestGameEngine(mockLoader)
  })

  describe("Abstract Loader Interface", () => {
    it("should require implementation of fetchData method", () => {
      // Since TypeScript abstract classes can still be instantiated at runtime,
      // we test that the abstract method would throw if called directly
      const baseLoader = Object.create(Loader.prototype)
      expect(() => baseLoader.fetchData("test")).toThrow()
    })

    it("should define fetchData as abstract method", () => {
      const loader = new MockLoader()
      expect(typeof loader.fetchData).toBe("function")
    })
  })

  describe("MockLoader Implementation", () => {
    it("should fetch data by ID", async () => {
      mockLoader.setMockData("test-id", "test-data")

      const result = await mockLoader.fetchData("test-id")
      expect(result).toBe("test-data")
    })

    it("should fetch data with type metadata", async () => {
      mockLoader.setMockData("config", "config-data", "game")

      const result = await mockLoader.fetchData("config", { type: "game" })
      expect(result).toBe("config-data")
    })

    it("should throw error for missing data", async () => {
      await expect(mockLoader.fetchData("nonexistent")).rejects.toThrow(
        "Data not found for id: nonexistent (type: unknown)",
      )
    })

    it("should handle failure simulation", async () => {
      mockLoader.setMockData("fail-me", "data")
      mockLoader.setFailureIds("fail-me")

      await expect(mockLoader.fetchData("fail-me")).rejects.toThrow(
        "Mock error for id: fail-me",
      )
    })

    it("should track call counts", async () => {
      mockLoader.setMockData("test", "data")

      expect(mockLoader.getFetchCallCount()).toBe(0)

      await mockLoader.fetchData("test")
      expect(mockLoader.getFetchCallCount()).toBe(1)

      await mockLoader.fetchData("test")
      expect(mockLoader.getFetchCallCount()).toBe(2)
    })

    it("should simulate async delays", async () => {
      mockLoader.setMockData("slow-data", "result")
      mockLoader.setAsyncDelay(50)

      const start = Date.now()
      await mockLoader.fetchData("slow-data")
      const duration = Date.now() - start

      expect(duration).toBeGreaterThanOrEqual(50)
    })

    it("should store and retrieve data", async () => {
      await mockLoader.storeData("stored-id", "stored-data")

      const result = await mockLoader.fetchData("stored-id")
      expect(result).toBe("stored-data")
      expect(mockLoader.getStoreCallCount()).toBe(1)
    })

    it("should store data with type metadata", async () => {
      await mockLoader.storeData("config", "config-data", "user")

      const result = await mockLoader.fetchData("config", { type: "user" })
      expect(result).toBe("config-data")
    })

    it("should check if data exists", () => {
      mockLoader.setMockData("existing", "data")

      expect(mockLoader.hasMockData("existing")).toBe(true)
      expect(mockLoader.hasMockData("nonexistent")).toBe(false)
    })

    it("should list all data keys", () => {
      mockLoader.setMockData("key1", "data1")
      mockLoader.setMockData("key2", "data2", "type")

      const keys = mockLoader.getMockDataKeys()
      expect(keys).toContain("key1")
      expect(keys).toContain("type:key2")
    })

    it("should reset state properly", async () => {
      mockLoader.setMockData("test", "data")
      mockLoader.setAsyncDelay(100)
      await mockLoader.fetchData("test")

      expect(mockLoader.getFetchCallCount()).toBe(1)

      mockLoader.reset()

      expect(mockLoader.getFetchCallCount()).toBe(0)
      expect(mockLoader.hasMockData("test")).toBe(false)
      await expect(mockLoader.fetchData("test")).rejects.toThrow()
    })
  })

  describe("GameEngine Integration", () => {
    it("should initialize GameEngine without loader", () => {
      const engineWithoutLoader = new TestGameEngine()
      expect(engineWithoutLoader.getLoader()).toBeUndefined()
    })

    it("should initialize GameEngine with loader", () => {
      expect(engine.getLoader()).toBe(mockLoader)
    })

    it("should pass loader to GameEngine constructor", () => {
      const customLoader = new MockLoader()
      const engineWithLoader = new TestGameEngine(customLoader)

      expect(engineWithLoader.getLoader()).toBe(customLoader)
    })

    it("should allow accessing loader from engine", () => {
      const loader = engine.getLoader()
      expect(loader).toBeInstanceOf(MockLoader)
      expect(loader).toBe(mockLoader)
    })
  })

  describe("Error Handling", () => {
    it("should handle loader errors gracefully", async () => {
      mockLoader.setFailureIds("error-test")

      await expect(mockLoader.fetchData("error-test")).rejects.toThrow(
        "Mock error for id: error-test",
      )
    })

    it("should handle missing data errors", async () => {
      await expect(mockLoader.fetchData("missing-data")).rejects.toThrow(
        "Data not found for id: missing-data",
      )
    })

    it("should handle network-like errors", async () => {
      mockLoader.setFailureIds("network-error")

      await expect(mockLoader.fetchData("network-error")).rejects.toThrow(
        "Mock error for id: network-error",
      )
    })
  })

  describe("Type-based Data Management", () => {
    beforeEach(() => {
      mockLoader.setMockData("settings", '{"volume": 0.8}', "user")
      mockLoader.setMockData("settings", '{"difficulty": "hard"}', "game")
      mockLoader.setMockData("level1", '{"enemies": 5}', "level")
      mockLoader.setMockData("sprite1", '{"width": 32}', "asset")
    })

    it("should distinguish between data types", async () => {
      const userSettings = await mockLoader.fetchData("settings", {
        type: "user",
      })
      const gameSettings = await mockLoader.fetchData("settings", {
        type: "game",
      })

      expect(JSON.parse(userSettings)).toEqual({ volume: 0.8 })
      expect(JSON.parse(gameSettings)).toEqual({ difficulty: "hard" })
    })

    it("should fetch level data", async () => {
      const levelData = await mockLoader.fetchData("level1", { type: "level" })
      expect(JSON.parse(levelData)).toEqual({ enemies: 5 })
    })

    it("should fetch asset data", async () => {
      const assetData = await mockLoader.fetchData("sprite1", { type: "asset" })
      expect(JSON.parse(assetData)).toEqual({ width: 32 })
    })

    it("should handle type mismatches", async () => {
      // Try to fetch user settings as game settings
      await expect(
        mockLoader.fetchData("settings", { type: "nonexistent" }),
      ).rejects.toThrow("Data not found for id: settings (type: nonexistent)")
    })
  })

  describe("Async Behavior", () => {
    it("should handle concurrent requests", async () => {
      mockLoader.setMockData("data1", "result1")
      mockLoader.setMockData("data2", "result2")
      mockLoader.setMockData("data3", "result3")
      mockLoader.setAsyncDelay(20)

      const promises = [
        mockLoader.fetchData("data1"),
        mockLoader.fetchData("data2"),
        mockLoader.fetchData("data3"),
      ]

      const results = await Promise.all(promises)

      expect(results).toEqual(["result1", "result2", "result3"])
      expect(mockLoader.getFetchCallCount()).toBe(3)
    })

    it("should handle promise rejection properly", async () => {
      mockLoader.setFailureIds("fail1", "fail2")

      const promises = [
        mockLoader.fetchData("fail1").catch((e) => e.message),
        mockLoader.fetchData("fail2").catch((e) => e.message),
      ]

      const results = await Promise.all(promises)

      expect(results[0]).toBe("Mock error for id: fail1")
      expect(results[1]).toBe("Mock error for id: fail2")
    })

    it("should maintain call order with delays", async () => {
      const callOrder: string[] = []

      mockLoader.setMockData("first", "1")
      mockLoader.setMockData("second", "2")
      mockLoader.setAsyncDelay(10)

      // Start both calls but don't await yet
      const firstPromise = mockLoader.fetchData("first").then((data) => {
        callOrder.push("first")
        return data
      })
      const secondPromise = mockLoader.fetchData("second").then((data) => {
        callOrder.push("second")
        return data
      })

      await Promise.all([firstPromise, secondPromise])

      expect(callOrder).toEqual(["first", "second"])
    })
  })

  describe("Real-world Scenarios", () => {
    it("should handle game configuration loading", async () => {
      const gameConfig = {
        playerSpeed: 5,
        enemyCount: 10,
        levelTime: 300,
      }

      mockLoader.setMockData("config", JSON.stringify(gameConfig), "game")

      const result = await mockLoader.fetchData("config", { type: "game" })
      const parsedConfig = JSON.parse(result)

      expect(parsedConfig.playerSpeed).toBe(5)
      expect(parsedConfig.enemyCount).toBe(10)
      expect(parsedConfig.levelTime).toBe(300)
    })

    it("should handle save game data", async () => {
      const saveData = {
        level: 5,
        score: 1500,
        playerX: 100,
        playerY: 200,
        inventory: ["sword", "potion", "key"],
      }

      await mockLoader.storeData("slot1", JSON.stringify(saveData), "save")
      const loaded = await mockLoader.fetchData("slot1", { type: "save" })
      const parsedSave = JSON.parse(loaded)

      expect(parsedSave.level).toBe(5)
      expect(parsedSave.score).toBe(1500)
      expect(parsedSave.inventory).toEqual(["sword", "potion", "key"])
    })

    it("should handle user preferences", async () => {
      const preferences = {
        soundVolume: 0.7,
        musicEnabled: true,
        controls: { jump: "space", move: "wasd" },
      }

      await mockLoader.storeData("prefs", JSON.stringify(preferences), "user")
      const loaded = await mockLoader.fetchData("prefs", { type: "user" })
      const parsedPrefs = JSON.parse(loaded)

      expect(parsedPrefs.soundVolume).toBe(0.7)
      expect(parsedPrefs.musicEnabled).toBe(true)
      expect(parsedPrefs.controls.jump).toBe("space")
    })
  })
})
