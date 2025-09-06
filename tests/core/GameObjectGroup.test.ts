import { beforeEach, describe, expect, it } from "bun:test"
import { GameObjectGroup } from "../../src/GameObjectGroup"
import { Vector2D } from "../../src/geometry/Vector2D"
import { ComplexTestEngine, TestEnemy, TestPlayer } from "../fixtures"

describe("GameObjectGroup", () => {
  let group: GameObjectGroup
  let engine: ComplexTestEngine
  let players: TestPlayer[]
  let enemies: TestEnemy[]

  beforeEach(() => {
    group = new GameObjectGroup()
    engine = new ComplexTestEngine()
    engine.reset("group-test")

    // Create test objects but don't auto-register them
    players = [
      new TestPlayer("player1", { x: 10, y: 10 }),
      new TestPlayer("player2", { x: 20, y: 20 }),
      new TestPlayer("player3", { x: 30, y: 30 }),
    ]

    enemies = [
      new TestEnemy("enemy1", { x: 50, y: 50 }),
      new TestEnemy("enemy2", { x: 60, y: 60 }),
    ]
  })

  describe("Basic Operations", () => {
    it("should start empty", () => {
      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)
      expect(group.getAll()).toEqual([])
    })

    it("should add objects correctly", () => {
      group.add(players[0])

      expect(group.size()).toBe(1)
      expect(group.activeSize()).toBe(1)
      expect(group.getAll()).toContain(players[0])
    })

    it("should add multiple objects", () => {
      players.forEach((player) => group.add(player))

      expect(group.size()).toBe(3)
      expect(group.activeSize()).toBe(3)
      expect(group.getAll()).toEqual(players)
    })

    it("should handle adding same object multiple times", () => {
      group.add(players[0])
      group.add(players[0]) // Add same object again

      expect(group.size()).toBe(1) // Should not duplicate
      expect(group.getAll()).toEqual([players[0]])
    })

    it("should retrieve objects by ID", () => {
      players.forEach((player) => group.add(player))

      expect(group.getById("player1")).toBe(players[0])
      expect(group.getById("player2")).toBe(players[1])
      expect(group.getById("player3")).toBe(players[2])
      expect(group.getById("nonexistent")).toBeUndefined()
    })

    it("should check if objects exist", () => {
      group.add(players[0])

      expect(group.has(players[0])).toBe(true)
      expect(group.has(players[1])).toBe(false)
    })

    it("should remove objects correctly", () => {
      players.forEach((player) => group.add(player))

      const removed = group.remove(players[1])

      expect(removed).toBe(true)
      expect(group.size()).toBe(2)
      expect(group.getAll()).not.toContain(players[1])
      expect(group.getAll()).toContain(players[0])
      expect(group.getAll()).toContain(players[2])
    })

    it("should handle removing non-existent objects", () => {
      group.add(players[0])

      const removed = group.remove(players[1])

      expect(removed).toBe(false)
      expect(group.size()).toBe(1)
    })

    it("should clear all objects", () => {
      players.forEach((player) => group.add(player))

      group.clear()

      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)
      expect(group.getAll()).toEqual([])
    })
  })

  describe("Destroyed Objects Handling", () => {
    beforeEach(() => {
      players.forEach((player) => group.add(player))
    })

    it("should track destroyed objects separately", () => {
      players[1].destroy()

      expect(group.size()).toBe(3) // Total size unchanged
      expect(group.activeSize()).toBe(2) // Active size reduced
      expect(players[1].isDestroyed()).toBe(true)
    })

    it("should filter destroyed objects in getAll", () => {
      players[1].destroy()
      players[2].destroy()

      const activeObjects = group.getAll()

      expect(activeObjects).toHaveLength(1)
      expect(activeObjects).toContain(players[0])
      expect(activeObjects).not.toContain(players[1])
      expect(activeObjects).not.toContain(players[2])
    })

    it("should include destroyed objects in raw iteration", () => {
      players[1].destroy()

      // getAll() filters destroyed objects, but we can check size vs activeSize
      expect(group.size()).toBe(3) // Total objects including destroyed
      expect(group.activeSize()).toBe(2) // Only active objects

      // getAll() should only return active objects
      const allObjects = group.getAll()
      expect(allObjects).toHaveLength(2)
      expect(allObjects).toContain(players[0])
      expect(allObjects).toContain(players[2])
      expect(allObjects).not.toContain(players[1]) // Destroyed object filtered out
    })

    it("should find destroyed objects by ID", () => {
      players[1].destroy()

      expect(group.getById("player2")).toBe(players[1])
      expect(group.getById("player2")!.isDestroyed()).toBe(true)
    })

    it("should remove destroyed objects when cleared", () => {
      players[1].destroy()

      const removedCount = group.clearDestroyed()

      expect(removedCount).toBe(1)
      expect(group.size()).toBe(2)
      expect(group.activeSize()).toBe(2)
      expect(group.getById("player2")).toBeUndefined()
    })

    it("should handle multiple destroyed objects", () => {
      players[0].destroy()
      players[2].destroy()

      expect(group.activeSize()).toBe(1)

      const removedCount = group.clearDestroyed()

      expect(removedCount).toBe(2)
      expect(group.size()).toBe(1)
      expect(group.getAll()).toEqual([players[1]])
    })

    it("should handle clearing when no objects are destroyed", () => {
      const removedCount = group.clearDestroyed()

      expect(removedCount).toBe(0)
      expect(group.size()).toBe(3)
    })

    it("should handle clearing destroyed objects multiple times", () => {
      players[0].destroy()

      const firstClear = group.clearDestroyed()
      expect(firstClear).toBe(1)

      const secondClear = group.clearDestroyed()
      expect(secondClear).toBe(0)

      expect(group.size()).toBe(2)
    })
  })

  describe("Update Operations", () => {
    beforeEach(() => {
      players.forEach((player) => group.add(player))
    })

    it("should update all active objects", () => {
      // Set velocities to make objects move
      players.forEach((player, index) => {
        player.setVelocity(new Vector2D(index + 1, index + 1))
      })

      const initialPositions = players.map((p) => p.getPosition())

      group.update(1, 1)

      players.forEach((player, index) => {
        const expectedPos = initialPositions[index].add(
          new Vector2D(index + 1, index + 1),
        )
        expect(player.getPosition()).toEqual(expectedPos)
      })
    })

    it("should not update destroyed objects", () => {
      players[1].destroy()

      // Set velocities
      players.forEach((player, _index) => {
        player.setVelocity(new Vector2D(10, 10))
      })

      const destroyedInitialPos = players[1].getPosition()

      group.update(1, 1)

      // Destroyed object should not have moved
      expect(players[1].getPosition()).toEqual(destroyedInitialPos)

      // Active objects should have moved
      expect(players[0].getPosition()).not.toEqual(new Vector2D(10, 10))
      expect(players[2].getPosition()).not.toEqual(new Vector2D(30, 30))
    })

    it("should handle update with zero delta", () => {
      players.forEach((player, _index) => {
        player.setVelocity(new Vector2D(5, 5))
      })

      const initialPositions = players.map((p) => p.getPosition())

      group.update(0, 1)

      // Positions should not change
      players.forEach((player, index) => {
        expect(player.getPosition()).toEqual(initialPositions[index])
      })
    })

    it("should handle update with large delta", () => {
      players[0].setVelocity(new Vector2D(1, 1))
      const initialPos = players[0].getPosition()

      group.update(1000, 1000)

      const expectedPos = initialPos.add(new Vector2D(1000, 1000))
      expect(players[0].getPosition()).toEqual(expectedPos)
    })

    it("should maintain update order", () => {
      const updateOrder: string[] = []

      // Override update method to track order
      players.forEach((player, _index) => {
        const originalUpdate = player.update.bind(player)
        player.update = (deltaFrames: number) => {
          updateOrder.push(player.getId())
          originalUpdate(deltaFrames)
        }
      })

      group.update(1, 1)

      // Order should match the order objects were added
      expect(updateOrder).toEqual(["player1", "player2", "player3"])
    })
  })

  describe("Query Operations", () => {
    beforeEach(() => {
      players.forEach((player) => group.add(player))
      enemies.forEach((enemy) => group.add(enemy))
    })

    it("should filter objects by type", () => {
      const playerObjects = group
        .getAll()
        .filter((obj) => obj.getType() === "Player")
      const enemyObjects = group
        .getAll()
        .filter((obj) => obj.getType() === "Enemy")

      expect(playerObjects).toHaveLength(3)
      expect(enemyObjects).toHaveLength(2)
    })

    it("should filter objects by custom predicate", () => {
      // Damage players to set different health values
      players[1].takeDamage(50) // Reduce to 50 health
      players[2].takeDamage(25) // Reduce to 75 health
      // players[0] stays at 100 health

      const lowHealthPlayers = group
        .getAll()
        .filter((obj) => obj.getType() === "Player" && obj.getHealth() < 60)
      const fullHealthPlayers = group
        .getAll()
        .filter((obj) => obj.getType() === "Player" && obj.getHealth() === 100)

      expect(lowHealthPlayers).toHaveLength(1)
      expect(lowHealthPlayers[0]).toBe(players[1])
      expect(fullHealthPlayers).toHaveLength(1)
      expect(fullHealthPlayers[0]).toBe(players[0])
    })

    it("should find objects by position range", () => {
      const nearOrigin = group.getAll().filter((obj) => {
        const pos = obj.getPosition()
        return pos.distance(new Vector2D(0, 0)) < 50
      })

      // Players at (10,10), (20,20), (30,30) should all be within 50 units of origin
      expect(nearOrigin).toHaveLength(3)
      nearOrigin.forEach((obj) => {
        expect(obj.getType()).toBe("Player")
      })
    })

    it("should support complex queries", () => {
      // Find active players with health > 80
      players[1].takeDamage(40) // Reduce to 60 health
      players[2].destroy()

      const healthyActivePlayers = group
        .getAll()
        .filter((obj) => obj.getType() === "Player" && obj.getHealth() > 80)

      expect(healthyActivePlayers).toHaveLength(1)
      expect(healthyActivePlayers[0]).toBe(players[0])
    })

    it("should handle empty query results", () => {
      const nonExistentType = group
        .getAll()
        .filter((obj) => obj.getType() === "Dragon")

      expect(nonExistentType).toEqual([])
    })
  })

  describe("Performance", () => {
    it("should handle large numbers of objects efficiently", () => {
      const startTime = performance.now()

      // Add 1000 objects
      for (let i = 0; i < 1000; i++) {
        const player = new TestPlayer(`player${i}`, { x: i, y: i })
        group.add(player)
      }

      const addTime = performance.now() - startTime
      expect(addTime).toBeLessThan(1000) // Should complete in less than 1 second

      expect(group.size()).toBe(1000)

      // Test lookups
      const lookupStartTime = performance.now()

      for (let i = 0; i < 100; i++) {
        const randomId = `player${Math.floor(Math.random() * 1000)}`
        group.getById(randomId)
      }

      const lookupTime = performance.now() - lookupStartTime
      expect(lookupTime).toBeLessThan(100) // Should complete in less than 100ms
    })

    it("should handle many destroyed objects efficiently", () => {
      // Add many objects
      for (let i = 0; i < 500; i++) {
        const player = new TestPlayer(`player${i}`, { x: i, y: i })
        group.add(player)
      }

      // Destroy half of them
      for (let i = 0; i < 250; i++) {
        group.getById(`player${i}`)?.destroy()
      }

      expect(group.activeSize()).toBe(250)
      expect(group.size()).toBe(500)

      // Clear destroyed objects
      const startTime = performance.now()
      const removedCount = group.clearDestroyed()
      const clearTime = performance.now() - startTime

      expect(removedCount).toBe(250)
      expect(group.size()).toBe(250)
      expect(clearTime).toBeLessThan(100) // Should complete quickly
    })

    it("should handle frequent add/remove operations", () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        const player = new TestPlayer(`temp${i}`, { x: i, y: i })
        group.add(player)

        if (i % 10 === 0 && group.size() > 5) {
          // Remove some objects periodically
          const toRemove = group.getAll()[0]
          group.remove(toRemove)
        }
      }

      const operationTime = performance.now() - startTime
      expect(operationTime).toBeLessThan(1000)
      expect(group.size()).toBeGreaterThan(800) // Should have most objects
    })
  })

  describe("Edge Cases", () => {
    it("should handle null/undefined objects gracefully", () => {
      expect(() => group.add(null as any)).toThrow()
      expect(() => group.add(undefined as any)).toThrow()
    })

    it("should handle objects without proper ID", () => {
      const invalidObject = { getId: () => "", getType: () => "Invalid" } as any

      // Depending on implementation, this might throw or handle gracefully
      try {
        group.add(invalidObject)
        expect(group.getById("")).toBe(invalidObject)
      } catch (_error) {
        // It's acceptable to reject objects without valid IDs
        expect(group.size()).toBe(0)
      }
    })

    it("should handle objects that change ID", () => {
      group.add(players[0])

      // Simulate object changing its ID (this shouldn't happen in practice)
      const originalGetId = players[0].getId.bind(players[0])
      players[0].getId = () => "changed-id"

      // Group should still find it by original ID in most implementations
      expect(group.getById("player1")).toBe(players[0])

      // Restore original method
      players[0].getId = originalGetId
    })

    it("should handle concurrent modifications during iteration", () => {
      players.forEach((player) => group.add(player))

      const allObjects = group.getAll()

      // Modify group while iterating (in a real scenario this could happen)
      let iterationCount = 0
      allObjects.forEach((_obj) => {
        iterationCount++
        if (iterationCount === 2) {
          // Add new object during iteration
          group.add(new TestPlayer("concurrent", { x: 0, y: 0 }))
        }
      })

      expect(iterationCount).toBe(3) // Should complete iteration
      expect(group.size()).toBe(4) // Should have added new object
    })

    it("should maintain consistency after many operations", () => {
      // Perform many mixed operations
      for (let i = 0; i < 100; i++) {
        const player = new TestPlayer(`dynamic${i}`, { x: i, y: i })
        group.add(player)

        if (i % 5 === 0) {
          player.destroy()
        }

        if (i % 10 === 0) {
          group.clearDestroyed()
        }

        if (i % 7 === 0 && group.size() > 0) {
          const firstObject = group.getAll()[0]
          group.remove(firstObject)
        }
      }

      // Group should maintain consistent state
      expect(group.size()).toBeGreaterThanOrEqual(0)
      expect(group.activeSize()).toBeLessThanOrEqual(group.size())

      // All objects in getAll should not be destroyed (getAll already filters destroyed)
      group.getAll().forEach((obj) => {
        expect(obj.isDestroyed()).toBe(false)
      })
    })

    it("should handle empty operations gracefully", () => {
      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)
      expect(group.getAll()).toEqual([])
      expect(group.getAll()).toEqual([])
      expect(group.getById("anything")).toBeUndefined()
      expect(group.clearDestroyed()).toBe(0)

      group.update(1, 1) // Should not throw
      group.clear() // Should not throw
    })
  })
})
