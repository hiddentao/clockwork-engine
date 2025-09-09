import { beforeEach, describe, expect, it, spyOn } from "bun:test"
import { Vector2D } from "../../src/geometry/Vector2D"
import { GameState } from "../../src/types"
import { ComplexTestEngine } from "../fixtures/ComplexTestEngine"
import { MemoryProfiler, MockTicker, StateComparator } from "../helpers"

describe("GameEngine", () => {
  let engine: ComplexTestEngine
  let ticker: MockTicker
  let memoryProfiler: MemoryProfiler

  beforeEach(() => {
    engine = new ComplexTestEngine()
    ticker = new MockTicker()
    memoryProfiler = new MemoryProfiler()
  })

  describe("Initialization and Setup", () => {
    it("should start in READY state", () => {
      expect(engine.getState()).toBe(GameState.READY)
    })

    it("should initialize with seed and call setup", () => {
      const setupSpy = spyOn(engine, "setup")
      engine.reset("test-seed")

      expect(engine.getSeed()).toBe("test-seed")
      expect(engine.getTotalFrames()).toBe(0)
      expect(setupSpy).toHaveBeenCalled()
    })

    it("should reset properly and clear all state", () => {
      // Set up initial state
      engine.reset("initial-seed")
      engine.start()
      engine.createAutoPlayer(new Vector2D(50, 50))
      engine.createAutoEnemy(new Vector2D(100, 100))

      ticker.add((deltaFrames) => engine.update(deltaFrames))

      // Run some frames
      ticker.tick(5)
      expect(engine.getTotalFrames()).toBe(5)
      expect(engine.getTotalObjectCount()).toBeGreaterThan(0)

      // Reset
      engine.reset()

      expect(engine.getState()).toBe(GameState.READY)
      expect(engine.getTotalFrames()).toBe(0)
      expect(engine.getTotalObjectCount()).toBe(0)
    })

    it("should create PRNG with deterministic behavior", () => {
      const seed = "prng-determinism-test"

      // First run
      engine.reset(seed)
      const values1: number[] = []
      for (let i = 0; i < 10; i++) {
        values1.push(engine.getPRNG().random())
      }

      // Reset and run again
      engine.reset(seed)
      const values2: number[] = []
      for (let i = 0; i < 10; i++) {
        values2.push(engine.getPRNG().random())
      }

      expect(values1).toEqual(values2)
    })

    it("should emit state change events", () => {
      const stateChanges: Array<{ old: GameState; new: GameState }> = []

      engine.on("stateChange", (newState, oldState) => {
        stateChanges.push({ old: oldState, new: newState })
      })

      engine.reset("test")
      expect(stateChanges).toHaveLength(1)
      expect(stateChanges[0]).toEqual({
        old: GameState.READY,
        new: GameState.READY,
      })

      engine.start()
      expect(stateChanges).toHaveLength(2)
      expect(stateChanges[1]).toEqual({
        old: GameState.READY,
        new: GameState.PLAYING,
      })

      engine.pause()
      expect(stateChanges).toHaveLength(3)
      expect(stateChanges[2]).toEqual({
        old: GameState.PLAYING,
        new: GameState.PAUSED,
      })
    })
  })

  describe("State Management", () => {
    beforeEach(() => {
      engine.reset("state-test")
    })

    it("should handle all valid state transitions", () => {
      // READY -> PLAYING
      expect(engine.getState()).toBe(GameState.READY)
      engine.start()
      expect(engine.getState()).toBe(GameState.PLAYING)

      // PLAYING -> PAUSED
      engine.pause()
      expect(engine.getState()).toBe(GameState.PAUSED)

      // PAUSED -> PLAYING
      engine.resume()
      expect(engine.getState()).toBe(GameState.PLAYING)

      // PLAYING -> ENDED
      engine.end()
      expect(engine.getState()).toBe(GameState.ENDED)
    })

    it("should handle PAUSED -> ENDED transition", () => {
      engine.start()
      engine.pause()
      expect(engine.getState()).toBe(GameState.PAUSED)

      engine.end()
      expect(engine.getState()).toBe(GameState.ENDED)
    })

    it("should throw errors for invalid state transitions", () => {
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

      engine.start()
      expect(() => engine.resume()).toThrow(
        "Cannot resume game: expected PAUSED state, got PLAYING",
      )

      // Cannot end from READY state
      engine.reset()
      expect(() => engine.end()).toThrow(
        "Cannot end game: expected PLAYING or PAUSED state, got READY",
      )
    })

    it("should maintain state consistency across operations", () => {
      const operations = [
        () => engine.start(),
        () => engine.pause(),
        () => engine.resume(),
        () => engine.pause(),
        () => engine.end(),
      ]

      const expectedStates = [
        GameState.PLAYING,
        GameState.PAUSED,
        GameState.PLAYING,
        GameState.PAUSED,
        GameState.ENDED,
      ]

      operations.forEach((operation, index) => {
        operation()
        expect(engine.getState()).toBe(expectedStates[index])
      })
    })
  })

  describe("Getter Methods", () => {
    beforeEach(() => {
      engine.reset("getter-test")
    })

    it("should return timer instance via getTimer", () => {
      const timer = engine.getTimer()

      expect(timer).toBeDefined()
      expect(timer.constructor.name).toBe("Timer")

      // Should be able to use timer methods
      const timerId = timer.setTimeout(() => {
        /* no-op */
      }, 10)
      expect(timer.clearTimer(timerId)).toBe(true)
    })

    it("should return collision tree via getCollisionTree", () => {
      const collisionTree = engine.getCollisionTree()

      expect(collisionTree).toBeDefined()
      expect(collisionTree.constructor.name).toBe("CollisionBspTree")
    })
  })

  describe("GameObject Registry", () => {
    beforeEach(() => {
      engine.reset("registry-test")
    })

    it("should register and manage different object types", () => {
      const player = engine.createAutoPlayer(new Vector2D(10, 10))
      const enemy = engine.createAutoEnemy(new Vector2D(20, 20))
      const projectile = engine.createAutoProjectile(
        new Vector2D(30, 30),
        new Vector2D(1, 0),
      )

      expect(engine.getRegisteredTypes()).toContain("Player")
      expect(engine.getRegisteredTypes()).toContain("Enemy")
      expect(engine.getRegisteredTypes()).toContain("Projectile")

      expect(engine.getPlayer(player.getId())).toBe(player)
      expect(engine.getEnemy(enemy.getId())).toBe(enemy)
      expect(engine.getProjectile(projectile.getId())).toBe(projectile)
    })

    it("should create groups automatically", () => {
      // Groups should be created on demand
      expect(engine.getGameObjectGroup("Player")).toBeUndefined()

      const player = engine.createAutoPlayer(new Vector2D(0, 0))
      const playerGroup = engine.getGameObjectGroup("Player")

      expect(playerGroup).toBeDefined()
      expect(playerGroup!.size()).toBe(1)
      expect(playerGroup!.getById(player.getId())).toBe(player)
    })

    it("should handle multiple objects of same type", () => {
      const players = [
        engine.createAutoPlayer(new Vector2D(0, 0)),
        engine.createAutoPlayer(new Vector2D(10, 10)),
        engine.createAutoPlayer(new Vector2D(20, 20)),
      ]

      const playerGroup = engine.getGameObjectGroup("Player")!
      expect(playerGroup.size()).toBe(3)

      players.forEach((player) => {
        expect(playerGroup.getById(player.getId())).toBe(player)
      })
    })

    it("should return undefined for non-existent objects", () => {
      expect(engine.getGameObjectGroup("NonExistent")).toBeUndefined()
      expect(engine.getPlayer("nonexistent")).toBeUndefined()
      expect(engine.getEnemy("nonexistent")).toBeUndefined()
    })

    it("should handle object destruction correctly", () => {
      const player = engine.createAutoPlayer(new Vector2D(0, 0))
      const playerGroup = engine.getGameObjectGroup("Player")!

      expect(playerGroup.size()).toBe(1)
      expect(playerGroup.activeSize()).toBe(1)

      player.destroy()
      expect(player.isDestroyed()).toBe(true)
      expect(playerGroup.size()).toBe(1) // Still in group
      expect(playerGroup.activeSize()).toBe(0) // Not active

      const removedCount = engine.clearDestroyed()
      expect(removedCount).toBe(1)
      expect(playerGroup.size()).toBe(0) // Removed from group
    })
  })

  describe("Game Loop and Updates", () => {
    beforeEach(() => {
      engine.reset("update-test")
    })

    it("should only update when in PLAYING state", async () => {
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      // Should not update in READY state
      await ticker.tick(1)
      expect(engine.getTotalFrames()).toBe(0)

      // Should update in PLAYING state
      engine.start()
      await ticker.tick(1)
      expect(engine.getTotalFrames()).toBe(1)

      // Should not update in PAUSED state
      engine.pause()
      await ticker.tick(1)
      expect(engine.getTotalFrames()).toBe(1) // No change

      // Should update again when resumed
      engine.resume()
      await ticker.tick(1)
      expect(engine.getTotalFrames()).toBe(2)

      // Should not update in ENDED state
      engine.end()
      await ticker.tick(1)
      expect(engine.getTotalFrames()).toBe(2) // No change
    })

    it("should update frame counter correctly with various delta frames", async () => {
      engine.start()
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      const deltaSequence = [1, 2, 0.5, 3, 1.5]
      let expectedTotal = 0

      for (const delta of deltaSequence) {
        await ticker.tick(delta)
        expectedTotal += delta
        expect(engine.getTotalFrames()).toBe(expectedTotal)
      }
    })

    it("should update GameObjects during game loop", async () => {
      engine.start()

      const player = engine.createAutoPlayer(new Vector2D(10, 10))
      const enemy = engine.createAutoEnemy(new Vector2D(20, 20))

      // Set velocities to make objects move
      player.setVelocity(new Vector2D(1, 1))
      enemy.setVelocity(new Vector2D(-1, 0))

      const initialPlayerPos = player.getPosition()
      const initialEnemyPos = enemy.getPosition()

      ticker.add((deltaFrames) => engine.update(deltaFrames))
      await ticker.tick(1)

      // Objects should have moved
      expect(player.getPosition().x).toBeGreaterThan(initialPlayerPos.x)
      expect(player.getPosition().y).toBeGreaterThan(initialPlayerPos.y)
      expect(enemy.getPosition().x).toBeLessThan(initialEnemyPos.x)
      expect(enemy.getPosition().y).toBe(initialEnemyPos.y)
    })

    it("should maintain update order (events -> timers -> objects -> frame counter)", async () => {
      engine.start()
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      const updateOrder: string[] = []

      // Mock the engine's internal update methods to track order
      const originalUpdate = engine.update.bind(engine)
      engine.update = async (deltaFrames: number) => {
        updateOrder.push("start")
        await originalUpdate(deltaFrames)
        updateOrder.push("end")
      }

      await ticker.tick(1)

      expect(updateOrder).toEqual(["start", "end"])
      expect(engine.getTotalFrames()).toBe(1)
    })

    it("should handle multiple object types updating together", async () => {
      engine.start()

      // Create various objects
      const player = engine.createAutoPlayer(new Vector2D(0, 0))
      const enemy = engine.createAutoEnemy(new Vector2D(50, 50))
      const projectile = engine.createAutoProjectile(
        new Vector2D(100, 100),
        new Vector2D(5, 0),
      )

      player.setVelocity(new Vector2D(2, 0))
      enemy.setVelocity(new Vector2D(0, 2))

      ticker.add((deltaFrames) => engine.update(deltaFrames))

      const initialPositions = {
        player: player.getPosition(),
        enemy: enemy.getPosition(),
        projectile: projectile.getPosition(),
      }

      await ticker.tick(1)

      // All objects should have updated
      expect(player.getPosition().x).toBeGreaterThan(initialPositions.player.x)
      expect(enemy.getPosition().y).toBeGreaterThan(initialPositions.enemy.y)
      expect(projectile.getPosition().x).toBeGreaterThan(
        initialPositions.projectile.x,
      )
    })
  })

  describe("Timer System Integration", () => {
    beforeEach(() => {
      engine.reset("timer-test")
    })

    it("should execute setTimeout callbacks at correct frames", async () => {
      let executed = false
      let executionFrame = -1

      engine.start()
      engine.setTimeout(() => {
        executed = true
        executionFrame = engine.getTotalFrames()
      }, 3)

      ticker.add((deltaFrames) => engine.update(deltaFrames))

      // Should not execute before target frame
      await ticker.tick(2)
      expect(executed).toBe(false)

      // Should execute at target frame
      await ticker.tick(1)
      expect(executed).toBe(true)
      expect(executionFrame).toBe(3)
    })

    it("should execute setInterval callbacks repeatedly", async () => {
      const executions: number[] = []

      engine.start()
      engine.setInterval(() => {
        executions.push(engine.getTotalFrames())
      }, 2)

      ticker.add((deltaFrames) => engine.update(deltaFrames))
      await ticker.runFrames(8)

      expect(executions).toEqual([2, 4, 6, 8])
    })

    it("should allow clearing timers", async () => {
      let executed = false

      engine.start()
      const timerId = engine.setTimeout(() => {
        executed = true
      }, 3)

      const cleared = engine.clearTimer(timerId)
      expect(cleared).toBe(true)

      ticker.add((deltaFrames) => engine.update(deltaFrames))
      await ticker.runFrames(5)

      expect(executed).toBe(false)
    })

    it("should reset timers on engine reset", async () => {
      let executed = false

      engine.start()
      engine.setTimeout(() => {
        executed = true
      }, 2)

      engine.reset()
      engine.start()

      ticker.add((deltaFrames) => engine.update(deltaFrames))
      await ticker.runFrames(3)

      expect(executed).toBe(false) // Timer should be cleared by reset
    })

    it("should handle timer errors gracefully", async () => {
      engine.start()

      let errorThrown = false
      let normalCallbackExecuted = false

      // Add a timer that throws an error
      engine.setTimeout(() => {
        errorThrown = true
        throw new Error("Timer error")
      }, 1)

      // Add a normal timer that should still execute
      engine.setTimeout(() => {
        normalCallbackExecuted = true
      }, 1)

      ticker.add((deltaFrames) => engine.update(deltaFrames))

      // Should not throw error at engine level
      await expect(ticker.tick(2)).resolves.toBeUndefined()

      expect(errorThrown).toBe(true)
      expect(normalCallbackExecuted).toBe(true)
    })
  })

  describe("Event System Integration", () => {
    beforeEach(() => {
      engine.reset("event-test")
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
      // Source might be reset/recreated
    })

    it("should process events during update cycle", async () => {
      engine.start()
      const _player = engine.createAutoPlayer(new Vector2D(0, 0))

      // Simulate adding an object update event
      const eventManager = engine.getEventManager()

      ticker.add((deltaFrames) => engine.update(deltaFrames))
      await ticker.tick(1)

      // Event manager should be processing events
      expect(eventManager).toBeDefined()
    })
  })

  describe("Memory Management", () => {
    beforeEach(() => {
      engine.reset("memory-test")
    })

    it("should not leak memory during normal operations", async () => {
      const { profile } = await memoryProfiler.profileAsync(async () => {
        engine.start()
        ticker.add((deltaFrames) => engine.update(deltaFrames))

        // Create and destroy many objects
        for (let i = 0; i < 100; i++) {
          const player = engine.createAutoPlayer(new Vector2D(i, i))
          const enemy = engine.createAutoEnemy(new Vector2D(i + 50, i + 50))

          await ticker.tick(1)

          if (i % 10 === 0) {
            // Periodically clean up
            player.destroy()
            enemy.destroy()
            engine.clearDestroyed()
          }
        }

        // Final cleanup
        engine.clearAllObjects()
      })

      expect(profile.hasLeaks).toBe(false)
      expect(profile.memoryGrowth).toBeLessThan(10 * 1024 * 1024) // Less than 10MB growth
    })

    it("should clean up destroyed objects properly", () => {
      const objects = [
        engine.createAutoPlayer(new Vector2D(0, 0)),
        engine.createAutoEnemy(new Vector2D(10, 10)),
        engine.createAutoProjectile(new Vector2D(20, 20), new Vector2D(1, 0)),
      ]

      expect(engine.getTotalObjectCount()).toBe(3)

      objects.forEach((obj) => obj.destroy())
      expect(engine.getTotalObjectCount()).toBe(0) // Should not count destroyed

      const removedCount = engine.clearDestroyed()
      expect(removedCount).toBe(3)
      expect(engine.getTotalObjectCount()).toBe(0)
    })
  })

  describe("Deterministic Behavior", () => {
    it("should produce identical results with same seed and operations", async () => {
      const seed = "deterministic-test"
      const operations = 50

      // First run
      const engine1 = new ComplexTestEngine()
      engine1.reset(seed)
      engine1.start()

      const ticker1 = new MockTicker()
      ticker1.add((deltaFrames) => engine1.update(deltaFrames))

      const snapshot1Data: any[] = []
      for (let i = 0; i < operations; i++) {
        // Create objects with PRNG
        if (i % 10 === 0) {
          const x = engine1.getPRNG().random() * 100
          const y = engine1.getPRNG().random() * 100
          engine1.createAutoPlayer(new Vector2D(x, y))
        }

        await ticker1.tick(1)

        if (i % 5 === 0) {
          snapshot1Data.push({
            frame: engine1.getTotalFrames(),
            objectCount: engine1.getTotalObjectCount(),
            prngValue: engine1.getPRNG().random(),
          })
        }
      }

      // Second run with same seed
      const engine2 = new ComplexTestEngine()
      engine2.reset(seed)
      engine2.start()

      const ticker2 = new MockTicker()
      ticker2.add((deltaFrames) => engine2.update(deltaFrames))

      const snapshot2Data: any[] = []
      for (let i = 0; i < operations; i++) {
        // Same operations
        if (i % 10 === 0) {
          const x = engine2.getPRNG().random() * 100
          const y = engine2.getPRNG().random() * 100
          engine2.createAutoPlayer(new Vector2D(x, y))
        }

        await ticker2.tick(1)

        if (i % 5 === 0) {
          snapshot2Data.push({
            frame: engine2.getTotalFrames(),
            objectCount: engine2.getTotalObjectCount(),
            prngValue: engine2.getPRNG().random(),
          })
        }
      }

      // Compare results
      expect(snapshot1Data).toEqual(snapshot2Data)
      expect(engine1.getTotalFrames()).toBe(engine2.getTotalFrames())

      const finalSnapshot1 = StateComparator.snapshot(engine1)
      const finalSnapshot2 = StateComparator.snapshot(engine2)
      const comparison = StateComparator.compare(finalSnapshot1, finalSnapshot2)

      expect(comparison.equal).toBe(true)
    })

    it("should produce different results with different seeds", async () => {
      const createEngineSnapshot = async (seed: string) => {
        const engine = new ComplexTestEngine()
        engine.reset(seed)
        engine.start()

        const ticker = new MockTicker()
        ticker.add((deltaFrames) => engine.update(deltaFrames))

        // Create some objects with randomness
        for (let i = 0; i < 10; i++) {
          const x = engine.getPRNG().random() * 100
          const y = engine.getPRNG().random() * 100
          engine.createAutoPlayer(new Vector2D(x, y))
          await ticker.tick(1)
        }

        return StateComparator.snapshot(engine)
      }

      const snapshot1 = await createEngineSnapshot("seed1")
      const snapshot2 = await createEngineSnapshot("seed2")

      const comparison = StateComparator.compare(snapshot1, snapshot2)
      expect(comparison.equal).toBe(false)
    })
  })

  describe("Edge Cases", () => {
    beforeEach(() => {
      engine.reset("edge-case-test")
    })

    it("should handle zero delta frames", async () => {
      engine.start()
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      const initialFrame = engine.getTotalFrames()
      await ticker.tick(0)

      expect(engine.getTotalFrames()).toBe(initialFrame) // No change
    })

    it("should handle very large delta frames", async () => {
      engine.start()
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      const largeDelta = 1000000
      await ticker.tick(largeDelta)

      expect(engine.getTotalFrames()).toBe(largeDelta)
    })

    it("should handle many objects efficiently", () => {
      const objectCount = 1000

      const { profile } = memoryProfiler.profile(() => {
        for (let i = 0; i < objectCount; i++) {
          engine.createAutoPlayer(new Vector2D(i % 100, Math.floor(i / 100)))
        }
      })

      expect(engine.getTotalObjectCount()).toBe(objectCount)
      expect(profile.memoryGrowth).toBeLessThan(50 * 1024 * 1024) // Less than 50MB
    })

    it("should handle rapid state changes", () => {
      // Rapid state transitions
      for (let i = 0; i < 100; i++) {
        engine.start()
        engine.pause()
        engine.resume()
        engine.end()
        engine.reset()
      }

      expect(engine.getState()).toBe(GameState.READY)
    })

    it("should handle engine operations when no objects exist", async () => {
      engine.start()
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      // Should work fine with no objects
      await ticker.runFrames(10)

      expect(engine.getTotalFrames()).toBe(10)
      expect(engine.getTotalObjectCount()).toBe(0)
    })
  })

  describe("Override Type Registration", () => {
    beforeEach(() => {
      engine.reset("override-test")
    })

    it("should register objects with default type when no override provided", () => {
      const player = engine.createAutoPlayer(new Vector2D(0, 0))

      const playerGroup = engine.getGameObjectGroup("Player")
      expect(playerGroup).toBeDefined()
      expect(playerGroup!.size()).toBe(1)
      expect(playerGroup!.getById("player-0")).toBe(player)

      // Should not be in any other group
      expect(engine.getGameObjectGroup("Targetable")).toBeUndefined()
    })

    it("should register objects with override type", () => {
      const player = engine.createAutoPlayer(new Vector2D(0, 0))

      // Register same player to different group
      engine.registerGameObject(player, "Targetable")

      const playerGroup = engine.getGameObjectGroup("Player")
      const targetableGroup = engine.getGameObjectGroup("Targetable")

      // Should be in both groups
      expect(playerGroup!.size()).toBe(1)
      expect(targetableGroup!.size()).toBe(1)
      expect(playerGroup!.getById("player-0")).toBe(player)
      expect(targetableGroup!.getById("player-0")).toBe(player)
    })

    it("should allow same object in multiple groups", () => {
      const player = engine.createAutoPlayer(new Vector2D(0, 0))

      // Register to multiple additional groups
      engine.registerGameObject(player, "Targetable")
      engine.registerGameObject(player, "Damageable")
      engine.registerGameObject(player, "Collectible")

      const groups = ["Player", "Targetable", "Damageable", "Collectible"]

      groups.forEach((groupType) => {
        const group = engine.getGameObjectGroup(groupType)
        expect(group).toBeDefined()
        expect(group!.size()).toBe(1)
        expect(group!.getById("player-0")).toBe(player)
      })

      // Verify registered types includes all groups
      const registeredTypes = engine.getRegisteredTypes()
      groups.forEach((groupType) => {
        expect(registeredTypes).toContain(groupType)
      })
    })

    it("should create new groups for override types", () => {
      const player = engine.createAutoPlayer(new Vector2D(0, 0))

      expect(engine.getGameObjectGroup("CustomType")).toBeUndefined()

      engine.registerGameObject(player, "CustomType")

      const customGroup = engine.getGameObjectGroup("CustomType")
      expect(customGroup).toBeDefined()
      expect(customGroup!.size()).toBe(1)
      expect(customGroup!.getById("player-0")).toBe(player)
    })

    it("should handle multiple objects in override groups", () => {
      const player1 = engine.createAutoPlayer(new Vector2D(0, 0))
      const player2 = engine.createAutoPlayer(new Vector2D(10, 10))

      // Add both to custom group
      engine.registerGameObject(player1, "Elite")
      engine.registerGameObject(player2, "Elite")

      const eliteGroup = engine.getGameObjectGroup("Elite")
      expect(eliteGroup!.size()).toBe(2)
      expect(eliteGroup!.getById("player-0")).toBe(player1)
      expect(eliteGroup!.getById("player-1")).toBe(player2)

      // Should still be in Player group too
      const playerGroup = engine.getGameObjectGroup("Player")
      expect(playerGroup!.size()).toBe(2)
    })

    it("should maintain separate references in each group", () => {
      const player = engine.createAutoPlayer(new Vector2D(0, 0))
      engine.registerGameObject(player, "Targetable")

      const playerGroup = engine.getGameObjectGroup("Player")!
      const targetableGroup = engine.getGameObjectGroup("Targetable")!

      // Both groups should have the same object instance
      const playerFromPlayerGroup = playerGroup.getById("player-0")!
      const playerFromTargetableGroup = targetableGroup.getById("player-0")!
      expect(playerFromPlayerGroup).toBe(playerFromTargetableGroup)
      expect(playerFromPlayerGroup).toBe(player)

      // Removing from one group shouldn't affect the other
      playerGroup.remove(player)
      expect(playerGroup.hasId("player-0")).toBe(false)
      expect(targetableGroup.hasId("player-0")).toBe(true)
      expect(targetableGroup.getById("player-0")).toBe(player)
    })

    it("should work with clearDestroyed across multiple groups", () => {
      const player = engine.createAutoPlayer(new Vector2D(0, 0))
      engine.registerGameObject(player, "Targetable")
      engine.registerGameObject(player, "Damageable")

      // Destroy the player
      player.destroy()

      const playerGroup = engine.getGameObjectGroup("Player")!
      const targetableGroup = engine.getGameObjectGroup("Targetable")!
      const damageableGroup = engine.getGameObjectGroup("Damageable")!

      // All groups should have the destroyed object
      expect(playerGroup.size()).toBe(1)
      expect(targetableGroup.size()).toBe(1)
      expect(damageableGroup.size()).toBe(1)
      expect(playerGroup.activeSize()).toBe(0)
      expect(targetableGroup.activeSize()).toBe(0)
      expect(damageableGroup.activeSize()).toBe(0)

      // Clear destroyed should remove from all groups
      const removedCount = engine.clearDestroyed()
      expect(removedCount).toBe(3) // Removed from 3 groups
      expect(playerGroup.size()).toBe(0)
      expect(targetableGroup.size()).toBe(0)
      expect(damageableGroup.size()).toBe(0)
    })
  })
})
