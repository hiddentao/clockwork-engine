import { beforeEach, describe, expect, it } from "bun:test"
import { GameEventManager } from "../../src/GameEventManager"
import { GameRecorder } from "../../src/GameRecorder"
import { RecordedEventSource } from "../../src/RecordedEventSource"
import { UserInputEventSource } from "../../src/UserInputEventSource"
import { Vector2D } from "../../src/geometry/Vector2D"
import {
  type AnyGameEvent,
  GameEventType,
  type ObjectUpdateEvent,
  type UserInputEvent,
} from "../../src/types"
import { ComplexTestEngine } from "../fixtures"

// Mock GameRecorder for testing
class MockGameRecorder extends GameRecorder {
  public recordedEvents: AnyGameEvent[] = []

  recordEvent(event: AnyGameEvent): void {
    super.recordEvent(event)
    this.recordedEvents.push({ ...event })
  }

  reset(): void {
    this.recordedEvents.length = 0
  }
}

describe("GameEventManager", () => {
  let engine: ComplexTestEngine
  let inputSource: UserInputEventSource
  let eventManager: GameEventManager
  let mockRecorder: MockGameRecorder

  beforeEach(async () => {
    engine = new ComplexTestEngine()
    await engine.reset("event-manager-test")

    inputSource = new UserInputEventSource()
    eventManager = new GameEventManager(inputSource, engine)
    mockRecorder = new MockGameRecorder()
  })

  describe("Construction and Initialization", () => {
    it("should create event manager with source and engine", () => {
      expect(eventManager.getSource()).toBe(inputSource)
      expect(eventManager.getSourceInfo().type).toBe("UserInputEventSource")
      expect(eventManager.hasMoreEvents()).toBe(false)
    })

    it("should allow setting and getting event source", () => {
      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.USER_INPUT,
          tick: 1,
          timestamp: 1000,
          inputType: "test",
          params: {},
        } as UserInputEvent,
      ]

      const recordedSource = new RecordedEventSource(recordedEvents)
      eventManager.setSource(recordedSource)

      expect(eventManager.getSource()).toBe(recordedSource)
      expect(eventManager.getSourceInfo().type).toBe("RecordedEventSource")
      expect(eventManager.hasMoreEvents()).toBe(true)
    })

    it("should allow setting and removing recorder", () => {
      eventManager.setRecorder(mockRecorder)

      // Queue and process an event to verify recorder is set
      inputSource.queueInput("test", {})
      eventManager.update(1, 1)

      expect(mockRecorder.recordedEvents).toHaveLength(1)

      // Remove recorder
      eventManager.setRecorder(undefined)

      inputSource.queueInput("test2", {})
      eventManager.update(1, 2)

      expect(mockRecorder.recordedEvents).toHaveLength(1) // Should not record new event
    })
  })

  describe("Event Processing", () => {
    it("should process user input events", () => {
      let receivedInputEvent: UserInputEvent | null = null

      eventManager.onUserInput = (event) => {
        receivedInputEvent = event
      }

      inputSource.queueInput("keyboard", { key: "W", pressed: true })
      eventManager.update(1, 5)

      expect(receivedInputEvent).not.toBeNull()
      expect(receivedInputEvent!.type).toBe(GameEventType.USER_INPUT)
      expect(receivedInputEvent!.tick).toBe(5)
      expect(receivedInputEvent!.inputType).toBe("keyboard")
      expect(receivedInputEvent!.params).toEqual({ key: "W", pressed: true })
    })

    it("should process object update events", () => {
      // Create a player to test object updates
      const player = engine.createTestPlayer("test-player", new Vector2D(0, 0))

      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1000,
          objectType: "Player",
          objectId: "test-player",
          method: "setPosition",
          params: [new Vector2D(10, 20)],
        } as ObjectUpdateEvent,
      ]

      const recordedSource = new RecordedEventSource(recordedEvents)
      eventManager.setSource(recordedSource)

      expect(player.getPosition()).toEqual(new Vector2D(0, 0))

      eventManager.update(1, 1)

      expect(player.getPosition()).toEqual(new Vector2D(10, 20))
    })

    it("should handle multiple events in single update", () => {
      const player = engine.createTestPlayer("test-player", new Vector2D(0, 0))
      let inputEventCount = 0

      eventManager.onUserInput = () => inputEventCount++

      inputSource.queueInput("key1", { key: "W" })
      inputSource.queueInput("key2", { key: "S" })

      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1000,
          objectType: "Player",
          objectId: "test-player",
          method: "setPosition",
          params: [new Vector2D(5, 5)],
        } as ObjectUpdateEvent,
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1001,
          objectType: "Player",
          objectId: "test-player",
          method: "setVelocity",
          params: [new Vector2D(1, 1)],
        } as ObjectUpdateEvent,
      ]

      // Combine input and recorded events
      eventManager.update(1, 1) // Process input events

      const recordedSource = new RecordedEventSource(recordedEvents)
      eventManager.setSource(recordedSource)
      eventManager.update(1, 1) // Process recorded events

      expect(inputEventCount).toBe(2)
      expect(player.getPosition()).toEqual(new Vector2D(5, 5))
      expect(player.getVelocity()).toEqual(new Vector2D(1, 1))
    })
  })

  describe("Event Recording Integration", () => {
    it("should record all processed events when recorder is set", () => {
      eventManager.setRecorder(mockRecorder)

      const _player = engine.createTestPlayer("test-player", new Vector2D(0, 0))

      inputSource.queueInput("keyboard", { key: "W" })

      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1000,
          objectType: "Player",
          objectId: "test-player",
          method: "takeDamage",
          params: [10],
        } as ObjectUpdateEvent,
      ]

      // First update with input events
      eventManager.update(1, 5)

      // Switch to recorded source and update
      eventManager.setSource(new RecordedEventSource(recordedEvents))
      eventManager.update(1, 5)

      expect(mockRecorder.recordedEvents).toHaveLength(2)

      const inputEvent = mockRecorder.recordedEvents.find(
        (e) => e.type === GameEventType.USER_INPUT,
      )
      const updateEvent = mockRecorder.recordedEvents.find(
        (e) => e.type === GameEventType.OBJECT_UPDATE,
      )

      expect(inputEvent).toBeDefined()
      expect(updateEvent).toBeDefined()
    })

    it("should not record events when no recorder is set", () => {
      inputSource.queueInput("keyboard", { key: "W" })
      eventManager.update(1, 5)

      // Mock recorder was never set, should remain empty
      expect(mockRecorder.recordedEvents).toHaveLength(0)
    })
  })

  describe("Error Handling", () => {
    it("should handle invalid object type gracefully", () => {
      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1000,
          objectType: "NonExistentType",
          objectId: "test-id",
          method: "testMethod",
          params: [],
        } as ObjectUpdateEvent,
      ]

      const recordedSource = new RecordedEventSource(recordedEvents)
      eventManager.setSource(recordedSource)

      // Should not throw
      expect(() => eventManager.update(1, 1)).not.toThrow()
    })

    it("should handle invalid object ID gracefully", () => {
      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1000,
          objectType: "Player",
          objectId: "non-existent-player",
          method: "setPosition",
          params: [new Vector2D(10, 20)],
        } as ObjectUpdateEvent,
      ]

      const recordedSource = new RecordedEventSource(recordedEvents)
      eventManager.setSource(recordedSource)

      // Should not throw
      expect(() => eventManager.update(1, 1)).not.toThrow()
    })

    it("should handle invalid method name gracefully", () => {
      const player = engine.createTestPlayer("test-player", new Vector2D(0, 0))

      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1000,
          objectType: "Player",
          objectId: "test-player",
          method: "nonExistentMethod",
          params: [],
        } as ObjectUpdateEvent,
      ]

      const recordedSource = new RecordedEventSource(recordedEvents)
      eventManager.setSource(recordedSource)

      // Should not throw
      expect(() => eventManager.update(1, 1)).not.toThrow()

      // Player should be unchanged
      expect(player.getPosition()).toEqual(new Vector2D(0, 0))
    })

    it("should handle method call exceptions gracefully", () => {
      const _player = engine.createTestPlayer("test-player", new Vector2D(0, 0))

      // Create event that calls takeDamage with invalid parameter
      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1000,
          objectType: "Player",
          objectId: "test-player",
          method: "takeDamage",
          params: ["invalid-damage"], // Should be number
        } as ObjectUpdateEvent,
      ]

      const recordedSource = new RecordedEventSource(recordedEvents)
      eventManager.setSource(recordedSource)

      // Should not throw even if method call fails
      expect(() => eventManager.update(1, 1)).not.toThrow()
    })

    it("should handle unknown event types gracefully", () => {
      const unknownEvent = {
        type: "UNKNOWN_TYPE",
        tick: 1,
        timestamp: 1000,
      } as any

      const recordedEvents: AnyGameEvent[] = [unknownEvent]
      const recordedSource = new RecordedEventSource(recordedEvents)
      eventManager.setSource(recordedSource)

      // Should not throw
      expect(() => eventManager.update(1, 1)).not.toThrow()
    })

    it("should catch and log user input callback exceptions", () => {
      const originalConsoleError = console.error
      const errorLogs: any[] = []
      console.error = (...args: any[]) => errorLogs.push(args)

      eventManager.onUserInput = () => {
        throw new Error("User input handler error")
      }

      inputSource.queueInput("test", { data: "test" })

      // GameEventManager catches errors and logs them
      expect(() => eventManager.update(1, 1)).not.toThrow()

      // Should have logged the error
      expect(errorLogs).toHaveLength(1)
      expect(errorLogs[0][0]).toContain("Error processing event")

      // Restore console.error
      console.error = originalConsoleError
    })
  })

  describe("Reset Functionality", () => {
    it("should reset event source", () => {
      inputSource.queueInput("test1", { data: 1 })
      inputSource.queueInput("test2", { data: 2 })

      expect(eventManager.hasMoreEvents()).toBe(true)

      eventManager.reset()

      expect(eventManager.hasMoreEvents()).toBe(false)
    })

    it("should reset recorded event source", () => {
      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.USER_INPUT,
          tick: 1,
          timestamp: 1000,
          inputType: "test",
          params: {},
        } as UserInputEvent,
      ]

      const recordedSource = new RecordedEventSource(recordedEvents)
      eventManager.setSource(recordedSource)

      // Consume event
      eventManager.update(1, 1)
      expect(eventManager.hasMoreEvents()).toBe(false)

      // Reset
      eventManager.reset()
      expect(eventManager.hasMoreEvents()).toBe(true)
    })
  })

  describe("Source Information", () => {
    it("should provide correct source information", () => {
      let sourceInfo = eventManager.getSourceInfo()
      expect(sourceInfo.type).toBe("UserInputEventSource")
      expect(sourceInfo.hasMore).toBe(false)

      inputSource.queueInput("test", {})
      sourceInfo = eventManager.getSourceInfo()
      expect(sourceInfo.hasMore).toBe(true)

      const recordedSource = new RecordedEventSource([
        {
          type: GameEventType.USER_INPUT,
          tick: 1,
          timestamp: 1000,
          inputType: "test",
          params: {},
        } as UserInputEvent,
      ])

      eventManager.setSource(recordedSource)
      sourceInfo = eventManager.getSourceInfo()
      expect(sourceInfo.type).toBe("RecordedEventSource")
      expect(sourceInfo.hasMore).toBe(true)
    })
  })

  describe("Complex Event Scenarios", () => {
    it("should handle interleaved input and recorded events", () => {
      const player = engine.createTestPlayer("test-player", new Vector2D(0, 0))
      const events: AnyGameEvent[] = []

      eventManager.onUserInput = (event) => events.push(event)

      // Start with input events
      inputSource.queueInput("move", { direction: "up" })
      eventManager.update(1, 1)

      // Switch to recorded events
      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 2,
          timestamp: 2000,
          objectType: "Player",
          objectId: "test-player",
          method: "setPosition",
          params: [new Vector2D(10, 10)],
        } as ObjectUpdateEvent,
      ]

      eventManager.setSource(new RecordedEventSource(recordedEvents))
      eventManager.update(1, 2)

      // Back to input events
      eventManager.setSource(inputSource)
      inputSource.queueInput("action", { button: "fire" })
      eventManager.update(1, 3)

      expect(events).toHaveLength(2)
      expect((events[0] as UserInputEvent).inputType).toBe("move")
      expect((events[1] as UserInputEvent).inputType).toBe("action")
      expect(player.getPosition()).toEqual(new Vector2D(10, 10))
    })

    it("should handle rapid source switching", () => {
      const input1 = new UserInputEventSource()
      const input2 = new UserInputEventSource()
      const recorded = new RecordedEventSource([
        {
          type: GameEventType.USER_INPUT,
          tick: 1,
          timestamp: 1000,
          inputType: "recorded",
          params: {},
        } as UserInputEvent,
      ])

      const processedEvents: string[] = []
      eventManager.onUserInput = (event) => {
        processedEvents.push((event as UserInputEvent).inputType)
      }

      // Switch sources rapidly
      input1.queueInput("source1", {})
      eventManager.setSource(input1)
      eventManager.update(1, 1)

      eventManager.setSource(recorded)
      eventManager.update(1, 1)

      input2.queueInput("source2", {})
      eventManager.setSource(input2)
      eventManager.update(1, 1)

      expect(processedEvents).toEqual(["source1", "recorded", "source2"])
    })

    it("should maintain event order across frame boundaries", () => {
      const player = engine.createTestPlayer("test-player", new Vector2D(0, 0))
      const processedEvents: string[] = []

      eventManager.onUserInput = (event) => {
        processedEvents.push(`input:${(event as UserInputEvent).inputType}`)
      }

      // Create complex recording with events across multiple frames
      const recordedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.USER_INPUT,
          tick: 1,
          timestamp: 1000,
          inputType: "frame1-input",
          params: {},
        } as UserInputEvent,
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1001,
          objectType: "Player",
          objectId: "test-player",
          method: "setPosition",
          params: [new Vector2D(1, 1)],
        } as ObjectUpdateEvent,
        {
          type: GameEventType.USER_INPUT,
          tick: 3,
          timestamp: 3000,
          inputType: "frame3-input",
          params: {},
        } as UserInputEvent,
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 3,
          timestamp: 3001,
          objectType: "Player",
          objectId: "test-player",
          method: "setPosition",
          params: [new Vector2D(3, 3)],
        } as ObjectUpdateEvent,
      ]

      eventManager.setSource(new RecordedEventSource(recordedEvents))

      // Process frame by frame
      eventManager.update(1, 1)
      expect(processedEvents).toEqual(["input:frame1-input"])
      expect(player.getPosition()).toEqual(new Vector2D(1, 1))

      eventManager.update(1, 2)
      expect(processedEvents).toEqual(["input:frame1-input"]) // No new events

      eventManager.update(1, 3)
      expect(processedEvents).toEqual([
        "input:frame1-input",
        "input:frame3-input",
      ])
      expect(player.getPosition()).toEqual(new Vector2D(3, 3))
    })
  })

  describe("Performance", () => {
    it("should handle large numbers of events efficiently", () => {
      const largeEventSet: AnyGameEvent[] = []

      // Create 1000 events
      for (let i = 0; i < 1000; i++) {
        largeEventSet.push({
          type: GameEventType.USER_INPUT,
          tick: 1,
          timestamp: i,
          inputType: `event${i}`,
          params: { index: i },
        } as UserInputEvent)
      }

      eventManager.setSource(new RecordedEventSource(largeEventSet))

      let eventCount = 0
      eventManager.onUserInput = () => eventCount++

      const startTime = performance.now()
      eventManager.update(1, 1)
      const processingTime = performance.now() - startTime

      expect(eventCount).toBe(1000)
      expect(processingTime).toBeLessThan(1000) // Should process quickly
    })

    it("should handle frequent source switches efficiently", () => {
      const sources = Array.from(
        { length: 100 },
        () => new UserInputEventSource(),
      )

      sources.forEach((source, index) => {
        source.queueInput(`source${index}`, { index })
      })

      let eventCount = 0
      eventManager.onUserInput = () => eventCount++

      const startTime = performance.now()

      sources.forEach((source) => {
        eventManager.setSource(source)
        eventManager.update(1, 1)
      })

      const switchingTime = performance.now() - startTime

      expect(eventCount).toBe(100)
      expect(switchingTime).toBeLessThan(1000) // Should switch quickly
    })
  })
})
