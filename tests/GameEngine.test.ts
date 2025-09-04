import { beforeEach, describe, expect, it } from "bun:test"
import { Vector2D } from "../src/geometry/Vector2D"
import { GameState } from "../src/types"
import { TestGameEngine, TestPlayer } from "./fixtures"

describe("GameEngine", () => {
  let engine: TestGameEngine

  beforeEach(() => {
    engine = new TestGameEngine()
  })

  describe("Initialization and Setup", () => {
    it("should start in READY state", () => {
      expect(engine.getState()).toBe(GameState.READY)
    })

    it("should initialize with seed and call setup", () => {
      engine.reset("test-seed")

      expect(engine.getSeed()).toBe("test-seed")
      expect(engine.setupCalled).toBe(true)
      expect(engine.getTotalFrames()).toBe(0)
    })

    it("should reset properly", async () => {
      engine.reset("initial-seed")
      engine.start()
      await engine.simulateFrames(5)

      expect(engine.getTotalFrames()).toBe(5)

      engine.reset()

      expect(engine.getState()).toBe(GameState.READY)
      expect(engine.getTotalFrames()).toBe(0)
      expect(engine.setupCallCount).toBe(2) // Called again after reset
    })

    it("should create PRNG with correct seed", () => {
      engine.reset("prng-test")
      const prng = engine.getPRNG()

      // Test deterministic behavior
      const value1 = prng.random()
      engine.reset() // Should reinitialize PRNG with same seed
      const value2 = engine.getPRNG().random()

      expect(value1).toBe(value2)
    })
  })

  describe("State Management", () => {
    beforeEach(() => {
      engine.reset("state-test")
    })

    it("should transition from READY to PLAYING", () => {
      expect(engine.getState()).toBe(GameState.READY)

      engine.start()
      expect(engine.getState()).toBe(GameState.PLAYING)
    })

    it("should transition from PLAYING to PAUSED", () => {
      engine.start()
      expect(engine.getState()).toBe(GameState.PLAYING)

      engine.pause()
      expect(engine.getState()).toBe(GameState.PAUSED)
    })

    it("should transition from PAUSED to PLAYING", () => {
      engine.start()
      engine.pause()
      expect(engine.getState()).toBe(GameState.PAUSED)

      engine.resume()
      expect(engine.getState()).toBe(GameState.PLAYING)
    })

    it("should transition to ENDED from PLAYING or PAUSED", () => {
      engine.start()
      engine.end()
      expect(engine.getState()).toBe(GameState.ENDED)

      engine.reset()
      engine.start()
      engine.pause()
      engine.end()
      expect(engine.getState()).toBe(GameState.ENDED)
    })

    it("should throw error for invalid state transitions", () => {
      // Cannot start from non-READY state
      engine.start()
      expect(() => engine.start()).toThrow(
        "Cannot start game: expected READY state, got PLAYING",
      )

      // Cannot pause from non-PLAYING state
      engine.reset()
      expect(() => engine.pause()).toThrow(
        "Cannot pause game: expected PLAYING state, got READY",
      )

      // Cannot resume from non-PAUSED state
      expect(() => engine.resume()).toThrow(
        "Cannot resume game: expected PAUSED state, got READY",
      )

      // Cannot end from READY state
      expect(() => engine.end()).toThrow(
        "Cannot end game: expected PLAYING or PAUSED state, got READY",
      )
    })
  })

  describe("GameObject Registry", () => {
    beforeEach(() => {
      engine.reset("registry-test")
    })

    it("should register GameObjects by type", () => {
      const registeredTypes = engine.getGameObjectGroups()
      expect(registeredTypes).toContain("Player")
      expect(registeredTypes).toContain("Enemy")
    })

    it("should create groups automatically", () => {
      const playerGroup = engine.getGameObjectGroup("Player")
      const enemyGroup = engine.getGameObjectGroup("Enemy")

      expect(playerGroup).toBeDefined()
      expect(enemyGroup).toBeDefined()
      expect(playerGroup?.size()).toBe(1)
      expect(enemyGroup?.size()).toBe(2)
    })

    it("should retrieve objects by ID", () => {
      const player = engine.getPlayer("player1")
      const enemy1 = engine.getEnemy("enemy1")
      const enemy2 = engine.getEnemy("enemy2")

      expect(player).toBeDefined()
      expect(enemy1).toBeDefined()
      expect(enemy2).toBeDefined()
      expect(player?.getId()).toBe("player1")
      expect(enemy1?.getId()).toBe("enemy1")
      expect(enemy2?.getId()).toBe("enemy2")
    })

    it("should return undefined for non-existent groups or objects", () => {
      expect(engine.getGameObjectGroup("NonExistent")).toBeUndefined()
      expect(engine.getPlayer("nonexistent")).toBeUndefined()
    })

    it("should register objects from constructor", () => {
      const newPlayer = new TestPlayer("player2", { x: 50, y: 50 }, engine)

      const playerGroup = engine.getGameObjectGroup("Player")
      expect(playerGroup?.size()).toBe(2)
      expect(engine.getPlayer("player2")).toBe(newPlayer)
    })
  })

  describe("Game Loop and Updates", () => {
    beforeEach(() => {
      engine.reset("update-test")
    })

    it("should not update when not in PLAYING state", async () => {
      // Should not update in READY state
      await engine.update(1)
      expect(engine.getTotalFrames()).toBe(0)

      // Should not update in PAUSED state
      engine.start()
      engine.pause()
      await engine.update(1)
      expect(engine.getTotalFrames()).toBe(0)

      // Should not update in ENDED state
      engine.resume()
      engine.end()
      await engine.update(1)
      expect(engine.getTotalFrames()).toBe(0)
    })

    it("should update frame counter when playing", async () => {
      engine.start()

      await engine.update(1)
      expect(engine.getTotalFrames()).toBe(1)

      await engine.update(3)
      expect(engine.getTotalFrames()).toBe(4)
    })

    it("should update GameObjects when playing", async () => {
      engine.start()
      const player = engine.getPlayer("player1")!
      const initialPosition = player.getPosition()

      // Set velocity to make object move
      player.setVelocity(new Vector2D(1, 1))

      await engine.update(1)

      const newPosition = player.getPosition()
      expect(newPosition.x).toBeGreaterThan(initialPosition.x)
      expect(newPosition.y).toBeGreaterThan(initialPosition.y)
    })

    it("should clear destroyed objects", async () => {
      engine.start()
      const player = engine.getPlayer("player1")!
      const playerGroup = engine.getGameObjectGroup("Player")!

      expect(playerGroup.activeSize()).toBe(1)

      player.destroy()
      expect(player.isDestroyed()).toBe(true)
      expect(playerGroup.activeSize()).toBe(0) // activeSize filters destroyed objects
      expect(playerGroup.size()).toBe(1) // total size still includes destroyed objects

      const removedCount = engine.clearDestroyed()
      expect(removedCount).toBe(1)
      expect(playerGroup.size()).toBe(0) // now removed from group entirely
    })
  })

  describe("Timer System Integration", () => {
    beforeEach(() => {
      engine.reset("timer-test")
    })

    it("should execute setTimeout callbacks", async () => {
      let executed = false

      engine.start()
      engine.setTimeout(async () => {
        executed = true
      }, 3)

      // Should not execute before the target frame
      await engine.simulateFrames(2)
      expect(executed).toBe(false)

      // Should execute at the target frame
      await engine.simulateFrames(1)
      expect(executed).toBe(true)
    })

    it("should execute setInterval callbacks repeatedly", async () => {
      let executeCount = 0

      engine.start()
      engine.setInterval(async () => {
        executeCount++
      }, 2)

      await engine.simulateFrames(6)
      expect(executeCount).toBe(3) // Should execute at frames 2, 4, and 6
    })

    it("should allow clearing timers", async () => {
      let executed = false

      engine.start()
      const timerId = engine.setTimeout(async () => {
        executed = true
      }, 3)

      const cleared = engine.clearTimer(timerId)
      expect(cleared).toBe(true)

      await engine.simulateFrames(5)
      expect(executed).toBe(false)
    })

    it("should reset timers on engine reset", async () => {
      let executed = false

      engine.start()
      engine.setTimeout(async () => {
        executed = true
      }, 2)

      engine.reset()
      engine.start()

      await engine.simulateFrames(3)
      expect(executed).toBe(false) // Timer should be cleared by reset
    })
  })

  describe("Event Manager Integration", () => {
    beforeEach(() => {
      engine.reset("input-test")
    })

    it("should have event manager", () => {
      const eventManager = engine.getEventManager()
      expect(eventManager).toBeDefined()
    })

    it("should reset event manager on engine reset", () => {
      const eventManager = engine.getEventManager()
      const _originalSource = eventManager.getSource()

      engine.reset()

      // Event manager should still exist but be reset
      expect(engine.getEventManager()).toBe(eventManager)
    })
  })

  describe("Error Handling", () => {
    it("should handle errors in timer callbacks gracefully", async () => {
      engine.reset("error-test")
      engine.start()

      let timerExecuted = false
      let normalCallbackExecuted = false

      // Add a timer that throws an error
      engine.setTimeout(async () => {
        timerExecuted = true
        throw new Error("Timer error")
      }, 1)

      // Add a normal timer that should still execute
      engine.setTimeout(async () => {
        normalCallbackExecuted = true
      }, 1)

      // Should not throw error, but should log it
      await engine.simulateFrames(2)

      expect(timerExecuted).toBe(true)
      expect(normalCallbackExecuted).toBe(true)
    })
  })

  describe("Deterministic Behavior", () => {
    it("should produce identical results with same seed and inputs", async () => {
      const seed = "deterministic-test"

      // First run
      const engine1 = new TestGameEngine()
      engine1.reset(seed)
      engine1.start()

      const prng1Values: number[] = []
      for (let i = 0; i < 5; i++) {
        prng1Values.push(engine1.getPRNG().random())
        await engine1.update(1)
      }

      // Second run with same seed
      const engine2 = new TestGameEngine()
      engine2.reset(seed)
      engine2.start()

      const prng2Values: number[] = []
      for (let i = 0; i < 5; i++) {
        prng2Values.push(engine2.getPRNG().random())
        await engine2.update(1)
      }

      expect(prng1Values).toEqual(prng2Values)
      expect(engine1.getTotalFrames()).toBe(engine2.getTotalFrames())
    })
  })
})
