import { beforeEach, describe, expect, it } from "bun:test"
import {
  GameObjectGroup,
  GameObjectGroupEventType,
} from "../../src/GameObjectGroup"
import { Vector2D } from "../../src/geometry/Vector2D"
import {
  ComplexTestEngine,
  MockLoader,
  TestEnemy,
  TestPlayer,
} from "../fixtures"

describe("GameObjectGroup", () => {
  let group: GameObjectGroup
  let engine: ComplexTestEngine
  let players: TestPlayer[]
  let enemies: TestEnemy[]
  let loader: MockLoader

  beforeEach(async () => {
    group = new GameObjectGroup()
    loader = new MockLoader()
    engine = new ComplexTestEngine(loader)
    await engine.reset({ prngSeed: "group-test" })

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
      expect(group.getAllActive()).toEqual([])
    })

    it("should add objects correctly", () => {
      group.add(players[0])

      expect(group.size()).toBe(1)
      expect(group.activeSize()).toBe(1)
      expect(group.getAllActive()).toContain(players[0])
    })

    it("should add multiple objects", () => {
      players.forEach((player) => group.add(player))

      expect(group.size()).toBe(3)
      expect(group.activeSize()).toBe(3)
      expect(group.getAllActive()).toEqual(players)
    })

    it("should handle adding same object multiple times", () => {
      group.add(players[0])
      group.add(players[0]) // Add same object again

      expect(group.size()).toBe(1) // Should not duplicate
      expect(group.getAllActive()).toEqual([players[0]])
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

    it("should check if object ID exists using hasId", () => {
      group.add(players[0])
      group.add(players[1])

      expect(group.hasId("player1")).toBe(true)
      expect(group.hasId("player2")).toBe(true)
      expect(group.hasId("player3")).toBe(false)
      expect(group.hasId("nonexistent")).toBe(false)
    })

    it("should remove objects correctly", () => {
      players.forEach((player) => group.add(player))

      const removed = group.remove(players[1])

      expect(removed).toBe(true)
      expect(group.size()).toBe(2)
      expect(group.getAllActive()).not.toContain(players[1])
      expect(group.getAllActive()).toContain(players[0])
      expect(group.getAllActive()).toContain(players[2])
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
      expect(group.getAllActive()).toEqual([])
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

      const activeObjects = group.getAllActive()

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
      const allObjects = group.getAllActive()
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
      expect(group.getAllActive()).toEqual([players[1]])
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
        player.update = (deltaTicks: number, totalTicks: number) => {
          updateOrder.push(player.getId())
          originalUpdate(deltaTicks, totalTicks)
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
        .getAllActive()
        .filter((obj) => obj.getType() === "Player")
      const enemyObjects = group
        .getAllActive()
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
        .getAllActive()
        .filter((obj) => obj.getType() === "Player" && obj.getHealth() < 60)
      const fullHealthPlayers = group
        .getAllActive()
        .filter((obj) => obj.getType() === "Player" && obj.getHealth() === 100)

      expect(lowHealthPlayers).toHaveLength(1)
      expect(lowHealthPlayers[0]).toBe(players[1])
      expect(fullHealthPlayers).toHaveLength(1)
      expect(fullHealthPlayers[0]).toBe(players[0])
    })

    it("should find objects by position range", () => {
      const nearOrigin = group.getAllActive().filter((obj) => {
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
        .getAllActive()
        .filter((obj) => obj.getType() === "Player" && obj.getHealth() > 80)

      expect(healthyActivePlayers).toHaveLength(1)
      expect(healthyActivePlayers[0]).toBe(players[0])
    })

    it("should handle empty query results", () => {
      const nonExistentType = group
        .getAllActive()
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
          const toRemove = group.getAllActive()[0]
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

      const allObjects = group.getAllActive()

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
          const firstObject = group.getAllActive()[0]
          group.remove(firstObject)
        }
      }

      // Group should maintain consistent state
      expect(group.size()).toBeGreaterThanOrEqual(0)
      expect(group.activeSize()).toBeLessThanOrEqual(group.size())

      // All objects in getAll should not be destroyed (getAll already filters destroyed)
      group.getAllActive().forEach((obj) => {
        expect(obj.isDestroyed()).toBe(false)
      })
    })

    it("should handle empty operations gracefully", () => {
      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)
      expect(group.getAllActive()).toEqual([])
      expect(group.getAllActive()).toEqual([])
      expect(group.getById("anything")).toBeUndefined()
      expect(group.clearDestroyed()).toBe(0)

      group.update(1, 1) // Should not throw
      group.clear() // Should not throw
    })
  })

  describe("Event Emissions", () => {
    let eventLog: Array<{ event: string; data: any }>

    beforeEach(() => {
      eventLog = []

      // Set up event listeners
      group.on(GameObjectGroupEventType.ITEM_ADDED, (gameObject) => {
        eventLog.push({
          event: "ITEM_ADDED",
          data: { id: gameObject.getId(), type: gameObject.getType() },
        })
      })

      group.on(GameObjectGroupEventType.ITEM_REMOVED, (gameObjectId) => {
        eventLog.push({ event: "ITEM_REMOVED", data: { id: gameObjectId } })
      })

      group.on(GameObjectGroupEventType.LIST_CLEARED, () => {
        eventLog.push({ event: "LIST_CLEARED", data: {} })
      })

      group.on(
        GameObjectGroupEventType.DESTROYED_ITEMS_CLEARED,
        (gameObjects) => {
          eventLog.push({
            event: "DESTROYED_ITEMS_CLEARED",
            data: { objects: gameObjects },
          })
        },
      )
    })

    describe("ITEM_ADDED Events", () => {
      it("should emit ITEM_ADDED when add() is called", () => {
        group.add(players[0])

        expect(eventLog).toHaveLength(1)
        expect(eventLog[0]).toEqual({
          event: "ITEM_ADDED",
          data: { id: "player1", type: "Player" },
        })
      })

      it("should emit ITEM_ADDED for each object added", () => {
        group.add(players[0])
        group.add(players[1])
        group.add(enemies[0])

        expect(eventLog).toHaveLength(3)
        expect(eventLog[0]).toEqual({
          event: "ITEM_ADDED",
          data: { id: "player1", type: "Player" },
        })
        expect(eventLog[1]).toEqual({
          event: "ITEM_ADDED",
          data: { id: "player2", type: "Player" },
        })
        expect(eventLog[2]).toEqual({
          event: "ITEM_ADDED",
          data: { id: "enemy1", type: "Enemy" },
        })
      })

      it("should not emit ITEM_ADDED when adding same object multiple times", () => {
        group.add(players[0])
        group.add(players[0]) // Add same object again

        expect(eventLog).toHaveLength(1)
        expect(eventLog[0]).toEqual({
          event: "ITEM_ADDED",
          data: { id: "player1", type: "Player" },
        })
      })
    })

    describe("ITEM_REMOVED Events", () => {
      beforeEach(() => {
        players.forEach((player) => group.add(player))
        eventLog = [] // Clear events from setup
      })

      it("should emit ITEM_REMOVED when remove() returns true", () => {
        const wasRemoved = group.remove(players[1])

        expect(wasRemoved).toBe(true)
        expect(eventLog).toHaveLength(1)
        expect(eventLog[0]).toEqual({
          event: "ITEM_REMOVED",
          data: { id: "player2" },
        })
      })

      it("should not emit ITEM_REMOVED when remove() returns false", () => {
        const nonExistentPlayer = new TestPlayer("nonexistent", { x: 0, y: 0 })
        const wasRemoved = group.remove(nonExistentPlayer)

        expect(wasRemoved).toBe(false)
        expect(eventLog).toHaveLength(0)
      })

      it("should emit ITEM_REMOVED for multiple removals", () => {
        group.remove(players[0])
        group.remove(players[2])

        expect(eventLog).toHaveLength(2)
        expect(eventLog[0]).toEqual({
          event: "ITEM_REMOVED",
          data: { id: "player1" },
        })
        expect(eventLog[1]).toEqual({
          event: "ITEM_REMOVED",
          data: { id: "player3" },
        })
      })
    })

    describe("LIST_CLEARED Events", () => {
      it("should emit LIST_CLEARED when clear() is called", () => {
        players.forEach((player) => group.add(player))
        eventLog = [] // Clear events from setup

        group.clear()

        expect(eventLog).toHaveLength(1)
        expect(eventLog[0]).toEqual({
          event: "LIST_CLEARED",
          data: {},
        })
      })

      it("should emit LIST_CLEARED even when group is empty", () => {
        group.clear()

        expect(eventLog).toHaveLength(1)
        expect(eventLog[0]).toEqual({
          event: "LIST_CLEARED",
          data: {},
        })
      })
    })

    describe("DESTROYED_ITEMS_CLEARED Events", () => {
      beforeEach(() => {
        players.forEach((player) => group.add(player))
        eventLog = [] // Clear events from setup
      })

      it("should emit DESTROYED_ITEMS_CLEARED for all destroyed items", () => {
        players[0].destroy()
        players[2].destroy()

        group.clearDestroyed()

        expect(eventLog).toHaveLength(1)
        expect(eventLog[0]).toEqual({
          event: "DESTROYED_ITEMS_CLEARED",
          data: { objects: [players[0], players[2]] },
        })
      })

      it("should not emit DESTROYED_ITEMS_CLEARED when no objects are destroyed", () => {
        group.clearDestroyed()

        expect(eventLog).toHaveLength(0)
      })

      it("should emit single event with all destroyed items in correct order", () => {
        players[1].destroy()
        enemies.forEach((enemy) => group.add(enemy))
        enemies[0].destroy()

        eventLog = [] // Clear events from setup
        group.clearDestroyed()

        expect(eventLog).toHaveLength(1)
        // Single event should contain all destroyed items in the order they appear in the map
        expect(eventLog[0]).toEqual({
          event: "DESTROYED_ITEMS_CLEARED",
          data: { objects: [players[1], enemies[0]] },
        })
      })

      it("should emit DESTROYED_ITEMS_CLEARED after objects are deleted from group", () => {
        players[0].destroy()
        players[1].destroy()

        // Track whether objects were already deleted when event was emitted
        const deletionStatuses: Array<{ id: string; wasDeleted: boolean }> = []

        // Set up event listener that checks if objects are still in group
        group.on(
          GameObjectGroupEventType.DESTROYED_ITEMS_CLEARED,
          (gameObjects) => {
            gameObjects.forEach((gameObject) => {
              const wasDeleted = group.getById(gameObject.getId()) === undefined
              deletionStatuses.push({ id: gameObject.getId(), wasDeleted })
            })
          },
        )

        group.clearDestroyed()

        expect(deletionStatuses).toHaveLength(2)
        expect(deletionStatuses[0]).toEqual({
          id: "player1",
          wasDeleted: true,
        })
        expect(deletionStatuses[1]).toEqual({
          id: "player2",
          wasDeleted: true,
        })
      })
    })

    describe("Multiple Listeners", () => {
      let secondEventLog: Array<{ event: string; data: any }>

      beforeEach(() => {
        secondEventLog = []

        // Add a second listener for ITEM_ADDED
        group.on(GameObjectGroupEventType.ITEM_ADDED, (gameObject) => {
          secondEventLog.push({
            event: "ITEM_ADDED_SECOND",
            data: { id: gameObject.getId() },
          })
        })
      })

      it("should call all listeners for the same event", () => {
        group.add(players[0])

        expect(eventLog).toHaveLength(1)
        expect(eventLog[0]).toEqual({
          event: "ITEM_ADDED",
          data: { id: "player1", type: "Player" },
        })

        expect(secondEventLog).toHaveLength(1)
        expect(secondEventLog[0]).toEqual({
          event: "ITEM_ADDED_SECOND",
          data: { id: "player1" },
        })
      })
    })

    describe("Event Order and Timing", () => {
      it("should emit events in correct sequence during complex operations", () => {
        // Add objects
        group.add(players[0])
        group.add(players[1])

        // Destroy one
        players[0].destroy()

        // Remove one
        group.remove(players[1])

        // Clear destroyed
        group.clearDestroyed()

        // Clear all
        group.clear()

        expect(eventLog).toHaveLength(5)
        expect(eventLog[0].event).toBe("ITEM_ADDED") // player1 added
        expect(eventLog[1].event).toBe("ITEM_ADDED") // player2 added
        expect(eventLog[2].event).toBe("ITEM_REMOVED") // player2 removed
        expect(eventLog[3].event).toBe("DESTROYED_ITEMS_CLEARED") // player1 destroyed and cleared
        expect(eventLog[4].event).toBe("LIST_CLEARED") // all cleared
      })
    })
  })

  describe("clearAndDestroy() Method", () => {
    let eventLog: Array<{ event: string; data: any }>

    beforeEach(() => {
      eventLog = []

      // Set up event listeners to track destruction events for all test objects
      const allTestObjects = [...players, ...enemies]
      allTestObjects.forEach((gameObject) => {
        gameObject.on("destroyed", (destroyedObject) => {
          eventLog.push({
            event: "OBJECT_DESTROYED",
            data: {
              id: destroyedObject.getId(),
              type: destroyedObject.getType(),
            },
          })
        })
      })

      group.on(GameObjectGroupEventType.LIST_CLEARED, () => {
        eventLog.push({ event: "LIST_CLEARED", data: {} })
      })
    })

    it("should destroy all active objects and then clear the group", () => {
      group.add(players[0])
      group.add(players[1])
      group.add(players[2])

      expect(group.size()).toBe(3)
      expect(group.activeSize()).toBe(3)

      group.clearAndDestroy()

      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)
      expect(group.getAllActive()).toEqual([])

      // All objects should be destroyed
      expect(players[0].isDestroyed()).toBe(true)
      expect(players[1].isDestroyed()).toBe(true)
      expect(players[2].isDestroyed()).toBe(true)
    })

    it("should emit DESTROYED events for each object followed by LIST_CLEARED", () => {
      group.add(players[0])
      group.add(players[1])

      eventLog = [] // Clear setup events
      group.clearAndDestroy()

      // Should emit destruction events followed by clear event
      expect(eventLog).toHaveLength(3)
      expect(eventLog[0]).toEqual({
        event: "OBJECT_DESTROYED",
        data: { id: "player1", type: "Player" },
      })
      expect(eventLog[1]).toEqual({
        event: "OBJECT_DESTROYED",
        data: { id: "player2", type: "Player" },
      })
      expect(eventLog[2]).toEqual({
        event: "LIST_CLEARED",
        data: {},
      })
    })

    it("should handle already destroyed objects gracefully", () => {
      group.add(players[0])
      group.add(players[1])
      group.add(players[2])

      // Destroy one object manually
      players[1].destroy()

      expect(group.size()).toBe(3)
      expect(group.activeSize()).toBe(2)

      eventLog = [] // Clear events from manual destroy
      group.clearAndDestroy()

      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)

      // Should only emit destruction events for previously active objects
      expect(eventLog).toHaveLength(3) // 2 destructions + 1 clear
      expect(eventLog[0]).toEqual({
        event: "OBJECT_DESTROYED",
        data: { id: "player1", type: "Player" },
      })
      expect(eventLog[1]).toEqual({
        event: "OBJECT_DESTROYED",
        data: { id: "player3", type: "Player" },
      })
      expect(eventLog[2]).toEqual({
        event: "LIST_CLEARED",
        data: {},
      })
    })

    it("should handle empty group gracefully", () => {
      expect(group.size()).toBe(0)

      eventLog = []
      group.clearAndDestroy()

      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)

      // Should only emit LIST_CLEARED event
      expect(eventLog).toHaveLength(1)
      expect(eventLog[0]).toEqual({
        event: "LIST_CLEARED",
        data: {},
      })
    })

    it("should handle group with only destroyed objects", () => {
      group.add(players[0])
      group.add(players[1])

      // Destroy all objects manually
      players[0].destroy()
      players[1].destroy()

      expect(group.size()).toBe(2)
      expect(group.activeSize()).toBe(0)

      eventLog = [] // Clear events from manual destroys
      group.clearAndDestroy()

      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)

      // Should only emit LIST_CLEARED event (no additional destructions)
      expect(eventLog).toHaveLength(1)
      expect(eventLog[0]).toEqual({
        event: "LIST_CLEARED",
        data: {},
      })
    })

    it("should handle large numbers of objects efficiently", () => {
      const startTime = performance.now()

      // Add many objects
      const manyPlayers: TestPlayer[] = []
      for (let i = 0; i < 1000; i++) {
        const player = new TestPlayer(`bulkPlayer${i}`, { x: i, y: i })
        manyPlayers.push(player)
        group.add(player)
      }

      expect(group.size()).toBe(1000)
      expect(group.activeSize()).toBe(1000)

      const clearStartTime = performance.now()
      group.clearAndDestroy()
      const clearTime = performance.now() - clearStartTime

      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)
      expect(clearTime).toBeLessThan(1000) // Should complete in less than 1 second

      // All objects should be destroyed
      manyPlayers.forEach((player) => {
        expect(player.isDestroyed()).toBe(true)
      })

      const totalTime = performance.now() - startTime
      expect(totalTime).toBeLessThan(2000) // Total operation should be fast
    })

    it("should maintain consistency after clearAndDestroy", () => {
      group.add(players[0])
      group.add(players[1])
      group.add(enemies[0])

      group.clearAndDestroy()

      // Group should be completely empty and consistent
      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)
      expect(group.getAllActive()).toEqual([])
      expect(group.getById("player1")).toBeUndefined()
      expect(group.getById("player2")).toBeUndefined()
      expect(group.getById("enemy1")).toBeUndefined()

      // Should be able to add new objects after clearAndDestroy
      const newPlayer = new TestPlayer("newPlayer", { x: 0, y: 0 })
      group.add(newPlayer)

      expect(group.size()).toBe(1)
      expect(group.activeSize()).toBe(1)
      expect(group.getById("newPlayer")).toBe(newPlayer)
    })

    it("should handle mixed active and destroyed objects", () => {
      group.add(players[0])
      group.add(players[1])
      group.add(players[2])
      group.add(enemies[0])
      group.add(enemies[1])

      // Destroy some objects manually
      players[1].destroy()
      enemies[1].destroy()

      expect(group.size()).toBe(5)
      expect(group.activeSize()).toBe(3) // 3 active objects

      eventLog = [] // Clear events from manual destroys
      group.clearAndDestroy()

      expect(group.size()).toBe(0)
      expect(group.activeSize()).toBe(0)

      // Should emit destruction events only for previously active objects + clear event
      expect(eventLog).toHaveLength(4) // 3 destructions + 1 clear

      const destructionEvents = eventLog.filter(
        (e) => e.event === "OBJECT_DESTROYED",
      )
      const clearEvents = eventLog.filter((e) => e.event === "LIST_CLEARED")

      expect(destructionEvents).toHaveLength(3)
      expect(clearEvents).toHaveLength(1)

      // Check that only active objects were destroyed
      const destroyedIds = destructionEvents.map((e) => e.data.id).sort()
      expect(destroyedIds).toEqual(["enemy1", "player1", "player3"])
    })
  })
})
