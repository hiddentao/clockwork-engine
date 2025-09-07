import { beforeEach, describe, expect, it } from "bun:test"
import { RecordedEventSource } from "../../src/RecordedEventSource"
import {
  type AnyGameEvent,
  GameEventType,
  type ObjectUpdateEvent,
  type UserInputEvent,
} from "../../src/types"

describe("RecordedEventSource", () => {
  let sampleEvents: AnyGameEvent[]
  let eventSource: RecordedEventSource

  beforeEach(() => {
    // Create sample events for testing
    sampleEvents = [
      {
        type: GameEventType.USER_INPUT,
        frame: 1,
        timestamp: 1000,
        inputType: "keyboard",
        params: { key: "W", pressed: true },
      } as UserInputEvent,
      {
        type: GameEventType.OBJECT_UPDATE,
        frame: 1,
        timestamp: 1001,
        objectType: "Player",
        objectId: "player1",
        method: "setPosition",
        params: [{ x: 10, y: 20 }],
      } as ObjectUpdateEvent,
      {
        type: GameEventType.USER_INPUT,
        frame: 3,
        timestamp: 3000,
        inputType: "mouse",
        params: { button: "left", x: 100, y: 200 },
      } as UserInputEvent,
      {
        type: GameEventType.OBJECT_UPDATE,
        frame: 5,
        timestamp: 5000,
        objectType: "Enemy",
        objectId: "enemy1",
        method: "takeDamage",
        params: [25],
      } as ObjectUpdateEvent,
      {
        type: GameEventType.USER_INPUT,
        frame: 5,
        timestamp: 5001,
        inputType: "keyboard",
        params: { key: "SPACE", pressed: false },
      } as UserInputEvent,
    ]

    eventSource = new RecordedEventSource(sampleEvents)
  })

  describe("Construction and Initialization", () => {
    it("should create event source from array", () => {
      expect(eventSource.hasMoreEvents()).toBe(true)
    })

    it("should clone events to prevent external modification", () => {
      // Modify original array
      sampleEvents[0].frame = 999
      sampleEvents.push({
        type: GameEventType.USER_INPUT,
        frame: 10,
        timestamp: 10000,
        inputType: "test",
        params: {},
      } as UserInputEvent)

      // Event source should not be affected
      const events = eventSource.getNextEvents(1)
      expect(events[0].frame).toBe(1) // Not 999

      // Complete playback to check total event count
      eventSource.reset()
      let totalEvents = 0
      for (let frame = 1; frame <= 10; frame++) {
        totalEvents += eventSource.getNextEvents(frame).length
      }
      expect(totalEvents).toBe(5) // Original count, not 6
    })

    it("should handle empty event array", () => {
      const emptySource = new RecordedEventSource([])

      expect(emptySource.hasMoreEvents()).toBe(false)
      expect(emptySource.getNextEvents(1)).toEqual([])
    })
  })

  describe("Frame-based Event Retrieval", () => {
    it("should return events for exact frame matches", () => {
      const events = eventSource.getNextEvents(1)

      expect(events).toHaveLength(2)
      expect(events[0].frame).toBe(1)
      expect(events[1].frame).toBe(1)
      expect(events[0].type).toBe(GameEventType.USER_INPUT)
      expect(events[1].type).toBe(GameEventType.OBJECT_UPDATE)
    })

    it("should return events for current and earlier frames", () => {
      const events = eventSource.getNextEvents(3)

      expect(events).toHaveLength(3) // Frame 1 (2 events) + Frame 3 (1 event)
      expect(events[0].frame).toBe(1)
      expect(events[1].frame).toBe(1)
      expect(events[2].frame).toBe(3)
    })

    it("should not return events for future frames", () => {
      const events = eventSource.getNextEvents(0)

      expect(events).toEqual([])
      expect(eventSource.hasMoreEvents()).toBe(true)
    })

    it("should handle frame progression correctly", () => {
      // Get frame 1 events
      let events = eventSource.getNextEvents(1)
      expect(events).toHaveLength(2)

      // Get frame 2 events (should be empty)
      events = eventSource.getNextEvents(2)
      expect(events).toEqual([])

      // Get frame 3 events
      events = eventSource.getNextEvents(3)
      expect(events).toHaveLength(1)
      expect(events[0].frame).toBe(3)

      // Get frame 4 events (should be empty)
      events = eventSource.getNextEvents(4)
      expect(events).toEqual([])

      // Get frame 5 events
      events = eventSource.getNextEvents(5)
      expect(events).toHaveLength(2)
      expect(events[0].frame).toBe(5)
      expect(events[1].frame).toBe(5)
    })
  })

  describe("Event Ordering and State", () => {
    it("should maintain event order within same frame", () => {
      const events = eventSource.getNextEvents(1)

      expect(events).toHaveLength(2)
      expect(events[0].timestamp).toBe(1000) // Earlier timestamp
      expect(events[1].timestamp).toBe(1001) // Later timestamp
    })

    it("should track current position correctly", () => {
      expect(eventSource.hasMoreEvents()).toBe(true)

      // Consume first batch
      eventSource.getNextEvents(1)
      expect(eventSource.hasMoreEvents()).toBe(true)

      // Consume second batch
      eventSource.getNextEvents(3)
      expect(eventSource.hasMoreEvents()).toBe(true)

      // Consume final batch
      eventSource.getNextEvents(5)
      expect(eventSource.hasMoreEvents()).toBe(false)
    })

    it("should handle large frame jumps", () => {
      const events = eventSource.getNextEvents(100)

      expect(events).toHaveLength(5) // All events
      expect(eventSource.hasMoreEvents()).toBe(false)
    })
  })

  describe("Reset Functionality", () => {
    it("should reset to beginning of recording", () => {
      // Consume some events
      eventSource.getNextEvents(3)
      expect(eventSource.hasMoreEvents()).toBe(true)

      // Reset
      eventSource.reset()
      expect(eventSource.hasMoreEvents()).toBe(true)

      // Should get same events as initial state
      const events = eventSource.getNextEvents(1)
      expect(events).toHaveLength(2)
      expect(events[0].type).toBe(GameEventType.USER_INPUT)
      expect(events[1].type).toBe(GameEventType.OBJECT_UPDATE)
    })

    it("should reset after complete playback", () => {
      // Consume all events
      eventSource.getNextEvents(100)
      expect(eventSource.hasMoreEvents()).toBe(false)

      // Reset
      eventSource.reset()
      expect(eventSource.hasMoreEvents()).toBe(true)

      // Should be able to replay
      const events = eventSource.getNextEvents(1)
      expect(events).toHaveLength(2)
    })

    it("should handle multiple resets", () => {
      for (let i = 0; i < 5; i++) {
        eventSource.reset()
        expect(eventSource.hasMoreEvents()).toBe(true)

        const events = eventSource.getNextEvents(1)
        expect(events).toHaveLength(2)
      }
    })
  })

  describe("Event Content Preservation", () => {
    it("should preserve user input event details", () => {
      const events = eventSource.getNextEvents(1)
      const userInputEvent = events.find(
        (e) => e.type === GameEventType.USER_INPUT,
      ) as UserInputEvent

      expect(userInputEvent).toBeDefined()
      expect(userInputEvent.inputType).toBe("keyboard")
      expect(userInputEvent.params).toEqual({ key: "W", pressed: true })
      expect(userInputEvent.timestamp).toBe(1000)
    })

    it("should preserve object update event details", () => {
      const events = eventSource.getNextEvents(1)
      const objectUpdateEvent = events.find(
        (e) => e.type === GameEventType.OBJECT_UPDATE,
      ) as ObjectUpdateEvent

      expect(objectUpdateEvent).toBeDefined()
      expect(objectUpdateEvent.objectType).toBe("Player")
      expect(objectUpdateEvent.objectId).toBe("player1")
      expect(objectUpdateEvent.method).toBe("setPosition")
      expect(objectUpdateEvent.params).toEqual([{ x: 10, y: 20 }])
      expect(objectUpdateEvent.timestamp).toBe(1001)
    })

    it("should handle complex parameter types", () => {
      const complexEvents: AnyGameEvent[] = [
        {
          type: GameEventType.OBJECT_UPDATE,
          frame: 1,
          timestamp: 1000,
          objectType: "Complex",
          objectId: "complex1",
          method: "complexMethod",
          params: [
            { nested: { data: [1, 2, 3] } },
            "string",
            42,
            true,
            null,
            undefined,
            { array: [{ a: 1 }, { b: 2 }] },
          ],
        } as ObjectUpdateEvent,
      ]

      const complexSource = new RecordedEventSource(complexEvents)
      const events = complexSource.getNextEvents(1)

      expect(events).toHaveLength(1)
      const event = events[0] as ObjectUpdateEvent
      expect(event.params).toEqual([
        { nested: { data: [1, 2, 3] } },
        "string",
        42,
        true,
        null,
        undefined,
        { array: [{ a: 1 }, { b: 2 }] },
      ])
    })
  })

  describe("Replay Scenarios", () => {
    it("should support complete replay", () => {
      const firstPlayback: AnyGameEvent[] = []
      const secondPlayback: AnyGameEvent[] = []

      // First playback
      for (let frame = 1; frame <= 10; frame++) {
        firstPlayback.push(...eventSource.getNextEvents(frame))
      }

      // Reset and second playback
      eventSource.reset()
      for (let frame = 1; frame <= 10; frame++) {
        secondPlayback.push(...eventSource.getNextEvents(frame))
      }

      expect(firstPlayback).toEqual(secondPlayback)
      expect(firstPlayback).toHaveLength(5)
    })

    it("should support partial replay", () => {
      // Play first part
      const part1 = eventSource.getNextEvents(2)
      expect(part1).toHaveLength(2)

      // Reset and replay differently
      eventSource.reset()
      const replayPart1 = eventSource.getNextEvents(3)

      expect(replayPart1).toHaveLength(3) // Different number due to different cutoff
      expect(replayPart1.slice(0, 2)).toEqual(part1)
    })

    it("should handle interleaved reset and playback", () => {
      const results: number[] = []

      for (let i = 0; i < 3; i++) {
        results.push(eventSource.getNextEvents(1).length)
        results.push(eventSource.getNextEvents(3).length)
        eventSource.reset()
      }

      expect(results).toEqual([2, 1, 2, 1, 2, 1])
    })
  })

  describe("Edge Cases", () => {
    it("should handle events with same frame and timestamp", () => {
      const duplicateFrameEvents: AnyGameEvent[] = [
        {
          type: GameEventType.USER_INPUT,
          frame: 1,
          timestamp: 1000,
          inputType: "input1",
          params: {},
        } as UserInputEvent,
        {
          type: GameEventType.USER_INPUT,
          frame: 1,
          timestamp: 1000,
          inputType: "input2",
          params: {},
        } as UserInputEvent,
      ]

      const duplicateSource = new RecordedEventSource(duplicateFrameEvents)
      const events = duplicateSource.getNextEvents(1)

      expect(events).toHaveLength(2)
      expect((events[0] as UserInputEvent).inputType).toBe("input1")
      expect((events[1] as UserInputEvent).inputType).toBe("input2")
    })

    it("should handle unsorted events according to sequential processing", () => {
      const unsortedEvents: AnyGameEvent[] = [
        {
          type: GameEventType.USER_INPUT,
          frame: 3,
          timestamp: 3000,
          inputType: "frame3",
          params: {},
        } as UserInputEvent,
        {
          type: GameEventType.USER_INPUT,
          frame: 1,
          timestamp: 1000,
          inputType: "frame1",
          params: {},
        } as UserInputEvent,
        {
          type: GameEventType.USER_INPUT,
          frame: 2,
          timestamp: 2000,
          inputType: "frame2",
          params: {},
        } as UserInputEvent,
      ]

      const unsortedSource = new RecordedEventSource(unsortedEvents)

      // When asking for frame 1, the first event (frame 3) is not ready yet
      // so no events are returned and the index doesn't advance
      const frame1 = unsortedSource.getNextEvents(1)
      expect(frame1).toHaveLength(0)

      // Asking for frame 3 returns all events because all are <= frame 3
      const frame3 = unsortedSource.getNextEvents(3)
      expect(frame3).toHaveLength(3) // All events returned
      expect((frame3[0] as UserInputEvent).inputType).toBe("frame3") // First event in array
      expect((frame3[1] as UserInputEvent).inputType).toBe("frame1") // Second event in array
      expect((frame3[2] as UserInputEvent).inputType).toBe("frame2") // Third event in array

      // No more events after processing all
      expect(unsortedSource.hasMoreEvents()).toBe(false)
    })

    it("should handle very large frame numbers", () => {
      const largeFrameEvents: AnyGameEvent[] = [
        {
          type: GameEventType.USER_INPUT,
          frame: 999999,
          timestamp: 1000,
          inputType: "large",
          params: {},
        } as UserInputEvent,
      ]

      const largeFrameSource = new RecordedEventSource(largeFrameEvents)

      // Should not return event for smaller frames
      expect(largeFrameSource.getNextEvents(1000)).toEqual([])
      expect(largeFrameSource.hasMoreEvents()).toBe(true)

      // Should return event for exact or larger frame
      const events = largeFrameSource.getNextEvents(999999)
      expect(events).toHaveLength(1)
    })

    it("should handle negative frame numbers", () => {
      const negativeFrameEvents: AnyGameEvent[] = [
        {
          type: GameEventType.USER_INPUT,
          frame: -5,
          timestamp: 1000,
          inputType: "negative",
          params: {},
        } as UserInputEvent,
        {
          type: GameEventType.USER_INPUT,
          frame: 0,
          timestamp: 2000,
          inputType: "zero",
          params: {},
        } as UserInputEvent,
      ]

      const negativeFrameSource = new RecordedEventSource(negativeFrameEvents)

      // Should handle negative frames
      const events = negativeFrameSource.getNextEvents(0)
      expect(events).toHaveLength(2)
      expect((events[0] as UserInputEvent).inputType).toBe("negative")
      expect((events[1] as UserInputEvent).inputType).toBe("zero")
    })
  })

  describe("Performance", () => {
    it("should handle large event recordings efficiently", () => {
      const largeEventList: AnyGameEvent[] = []

      // Create 10000 events across 1000 frames
      for (let frame = 1; frame <= 1000; frame++) {
        for (let i = 0; i < 10; i++) {
          largeEventList.push({
            type: GameEventType.USER_INPUT,
            frame: frame,
            timestamp: frame * 1000 + i,
            inputType: `input${i}`,
            params: { frame, index: i },
          } as UserInputEvent)
        }
      }

      const largeSource = new RecordedEventSource(largeEventList)

      const startTime = performance.now()

      // Process all events
      for (let frame = 1; frame <= 1000; frame++) {
        const events = largeSource.getNextEvents(frame)
        expect(events).toHaveLength(10)
      }

      const processingTime = performance.now() - startTime
      expect(processingTime).toBeLessThan(1000) // Should complete in under 1 second
      expect(largeSource.hasMoreEvents()).toBe(false)
    })

    it("should handle rapid reset cycles efficiently", () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        eventSource.reset()
        eventSource.getNextEvents(1)
        eventSource.getNextEvents(5)
      }

      const cycleTime = performance.now() - startTime
      expect(cycleTime).toBeLessThan(1000) // Should complete quickly
    })
  })
})
