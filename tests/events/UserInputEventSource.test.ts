import { beforeEach, describe, expect, it } from "bun:test"
import { UserInputEventSource } from "../../src/UserInputEventSource"
import { GameEventType, type UserInputEvent } from "../../src/types"

describe("UserInputEventSource", () => {
  let inputSource: UserInputEventSource

  beforeEach(() => {
    inputSource = new UserInputEventSource()
  })

  describe("Basic Input Queueing", () => {
    it("should queue input data correctly", () => {
      inputSource.queueInput("direction", { x: 1, y: 0 })

      expect(inputSource.hasMoreEvents()).toBe(true)
      expect(inputSource.getQueueLength()).toBe(1)
    })

    it("should queue multiple inputs", () => {
      inputSource.queueInput("direction", { x: 1, y: 0 })
      inputSource.queueInput("button", { action: "jump" })
      inputSource.queueInput("direction", { x: 0, y: -1 })

      expect(inputSource.hasMoreEvents()).toBe(true)
      expect(inputSource.getQueueLength()).toBe(3)
    })

    it("should handle empty queue", () => {
      expect(inputSource.hasMoreEvents()).toBe(false)
      expect(inputSource.getQueueLength()).toBe(0)
      expect(inputSource.getQueuedData()).toEqual([])
    })
  })

  describe("Event Generation", () => {
    it("should convert queued data to game events", () => {
      const currentFrame = 10

      inputSource.queueInput("direction", { x: 1, y: 0 })
      inputSource.queueInput("button", { action: "jump" })

      const events = inputSource.getNextEvents(currentFrame)

      expect(events).toHaveLength(2)

      // Check first event
      expect(events[0].type).toBe(GameEventType.USER_INPUT)
      expect(events[0].tick).toBe(currentFrame)
      expect((events[0] as UserInputEvent).inputType).toBe("direction")
      expect(events[0].params).toEqual({ x: 1, y: 0 })
      expect(typeof events[0].timestamp).toBe("number")

      // Check second event
      expect(events[1].type).toBe(GameEventType.USER_INPUT)
      expect(events[1].tick).toBe(currentFrame)
      expect((events[1] as UserInputEvent).inputType).toBe("button")
      expect(events[1].params).toEqual({ action: "jump" })
      expect(typeof events[1].timestamp).toBe("number")
    })

    it("should clear queue after generating events", () => {
      inputSource.queueInput("direction", { x: 1, y: 0 })
      inputSource.queueInput("button", { action: "jump" })

      expect(inputSource.hasMoreEvents()).toBe(true)
      expect(inputSource.getQueueLength()).toBe(2)

      const events = inputSource.getNextEvents(5)
      expect(events).toHaveLength(2)

      // Queue should be cleared
      expect(inputSource.hasMoreEvents()).toBe(false)
      expect(inputSource.getQueueLength()).toBe(0)
    })

    it("should return empty array when no events queued", () => {
      const events = inputSource.getNextEvents(10)

      expect(events).toEqual([])
      expect(inputSource.hasMoreEvents()).toBe(false)
    })

    it("should handle rapid event generation", () => {
      // Queue many inputs
      for (let i = 0; i < 100; i++) {
        inputSource.queueInput(`input${i}`, { value: i })
      }

      const events = inputSource.getNextEvents(50)

      expect(events).toHaveLength(100)
      expect(inputSource.hasMoreEvents()).toBe(false)

      // Check that all events have the correct frame
      events.forEach((event) => {
        expect(event.tick).toBe(50)
        expect(event.type).toBe(GameEventType.USER_INPUT)
      })
    })
  })

  describe("Queue Management", () => {
    it("should provide read-only access to queued data", () => {
      inputSource.queueInput("test1", { value: 1 })
      inputSource.queueInput("test2", { value: 2 })
      inputSource.queueInput("test3", { value: 3 })

      const queuedData = inputSource.getQueuedData()

      expect(queuedData).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }])

      // Modifying returned array should not affect internal queue
      ;(queuedData as any[]).push({ value: 4 })
      expect(inputSource.getQueueLength()).toBe(3)
    })

    it("should remove data matching predicate", () => {
      inputSource.queueInput("direction", { x: 1, y: 0 })
      inputSource.queueInput("button", { action: "jump" })
      inputSource.queueInput("direction", { x: -1, y: 0 })
      inputSource.queueInput("button", { action: "shoot" })

      // Remove all button inputs
      const removed = inputSource.removeData(
        (data) => data.action === "jump" || data.action === "shoot",
      )

      expect(removed).toBe(2)
      expect(inputSource.getQueueLength()).toBe(2)

      const remaining = inputSource.getQueuedData()
      expect(remaining).toEqual([
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ])
    })

    it("should handle removing non-matching data", () => {
      inputSource.queueInput("test", { value: 1 })
      inputSource.queueInput("test", { value: 2 })

      const removed = inputSource.removeData((data) => data.value > 10)

      expect(removed).toBe(0)
      expect(inputSource.getQueueLength()).toBe(2)
    })

    it("should clear all data", () => {
      inputSource.queueInput("test1", { value: 1 })
      inputSource.queueInput("test2", { value: 2 })
      inputSource.queueInput("test3", { value: 3 })

      inputSource.clear()

      expect(inputSource.hasMoreEvents()).toBe(false)
      expect(inputSource.getQueueLength()).toBe(0)
      expect(inputSource.getQueuedData()).toEqual([])
    })
  })

  describe("Reset Functionality", () => {
    it("should reset queue to empty state", () => {
      inputSource.queueInput("test1", { value: 1 })
      inputSource.queueInput("test2", { value: 2 })

      inputSource.reset()

      expect(inputSource.hasMoreEvents()).toBe(false)
      expect(inputSource.getQueueLength()).toBe(0)
      expect(inputSource.getQueuedData()).toEqual([])
    })

    it("should reset after event generation", () => {
      inputSource.queueInput("test", { value: 1 })

      // Generate events (clears queue)
      inputSource.getNextEvents(10)
      expect(inputSource.hasMoreEvents()).toBe(false)

      // Reset should still work
      inputSource.reset()
      expect(inputSource.hasMoreEvents()).toBe(false)
    })
  })

  describe("Timestamp Handling", () => {
    it("should assign timestamps to queued inputs", async () => {
      const startTime = Date.now()

      inputSource.queueInput("test", { value: 1 })

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 5))

      inputSource.queueInput("test", { value: 2 })

      const events = inputSource.getNextEvents(10)

      expect(events).toHaveLength(2)
      expect(events[0].timestamp).toBeGreaterThanOrEqual(startTime)
      expect(events[1].timestamp).toBeGreaterThan(events[0].timestamp)
    })

    it("should preserve timestamp order", async () => {
      const timestamps: number[] = []

      // Queue inputs with small delays
      for (let i = 0; i < 5; i++) {
        inputSource.queueInput(`input${i}`, { value: i })
        await new Promise((resolve) => setTimeout(resolve, 1))
      }

      const events = inputSource.getNextEvents(10)

      events.forEach((event) => timestamps.push(event.timestamp))

      // Timestamps should be in ascending order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
      }
    })
  })

  describe("Input Type Handling", () => {
    it("should handle different input types", () => {
      inputSource.queueInput("keyboard", { key: "W", pressed: true })
      inputSource.queueInput("mouse", { button: "left", x: 100, y: 200 })
      inputSource.queueInput("gamepad", { button: 0, value: 1.0 })
      inputSource.queueInput("touch", { id: 1, x: 150, y: 300, phase: "start" })

      const events = inputSource.getNextEvents(10)

      expect(events).toHaveLength(4)

      const inputTypes = events.map((e) => (e as UserInputEvent).inputType)
      expect(inputTypes).toEqual(["keyboard", "mouse", "gamepad", "touch"])

      expect(events[0].params).toEqual({ key: "W", pressed: true })
      expect(events[1].params).toEqual({ button: "left", x: 100, y: 200 })
      expect(events[2].params).toEqual({ button: 0, value: 1.0 })
      expect(events[3].params).toEqual({
        id: 1,
        x: 150,
        y: 300,
        phase: "start",
      })
    })

    it("should handle complex input data structures", () => {
      const complexInput = {
        type: "composite",
        data: {
          movement: { x: 0.5, y: -0.8 },
          actions: ["jump", "shoot"],
          modifiers: { shift: true, ctrl: false },
          timestamp: Date.now(),
          metadata: {
            source: "gamepad",
            confidence: 0.95,
          },
        },
      }

      inputSource.queueInput("complex", complexInput)

      const events = inputSource.getNextEvents(10)

      expect(events).toHaveLength(1)
      expect(events[0].params).toEqual(complexInput)
    })
  })

  describe("Performance", () => {
    it("should handle large numbers of inputs efficiently", () => {
      const startTime = performance.now()

      // Queue 1000 inputs
      for (let i = 0; i < 1000; i++) {
        inputSource.queueInput(`input${i}`, {
          value: i,
          type: i % 4 === 0 ? "special" : "normal",
          data: new Array(10).fill(i),
        })
      }

      const queueTime = performance.now() - startTime
      expect(queueTime).toBeLessThan(100) // Should queue quickly

      const generateStartTime = performance.now()
      const events = inputSource.getNextEvents(10)
      const generateTime = performance.now() - generateStartTime

      expect(events).toHaveLength(1000)
      expect(generateTime).toBeLessThan(100) // Should generate quickly
    })

    it("should handle rapid queue/clear cycles", () => {
      for (let cycle = 0; cycle < 100; cycle++) {
        // Queue some inputs
        for (let i = 0; i < 10; i++) {
          inputSource.queueInput("test", { cycle, input: i })
        }

        // Clear via event generation
        const events = inputSource.getNextEvents(cycle)
        expect(events).toHaveLength(10)
        expect(inputSource.hasMoreEvents()).toBe(false)
      }
    })
  })

  describe("Edge Cases", () => {
    it("should handle null and undefined input data", () => {
      inputSource.queueInput("null-test", null)
      inputSource.queueInput("undefined-test", undefined)
      inputSource.queueInput("empty-object", {})
      inputSource.queueInput("empty-array", [])

      const events = inputSource.getNextEvents(10)

      expect(events).toHaveLength(4)
      expect(events[0].params).toBe(null)
      expect(events[1].params).toBe(undefined)
      expect(events[2].params).toEqual({})
      expect(events[3].params).toEqual([])
    })

    it("should handle empty input type strings", () => {
      inputSource.queueInput("", { test: true })
      inputSource.queueInput(" ", { test: true })

      const events = inputSource.getNextEvents(10)

      expect(events).toHaveLength(2)
      expect((events[0] as UserInputEvent).inputType).toBe("")
      expect((events[1] as UserInputEvent).inputType).toBe(" ")
    })

    it("should handle concurrent operations", async () => {
      const promises = []

      // Simulate concurrent input queueing
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              inputSource.queueInput(`concurrent${i}`, { value: i })
              resolve(null)
            }, Math.random() * 10)
          }),
        )
      }

      await Promise.all(promises)

      expect(inputSource.getQueueLength()).toBe(10)

      const events = inputSource.getNextEvents(10)
      expect(events).toHaveLength(10)
    })
  })
})
