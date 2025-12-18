import { beforeEach, describe, expect, it } from "bun:test"
import { GameEventManager } from "../../src/GameEventManager"
import { GameRecorder } from "../../src/GameRecorder"
import { UserInputEventSource } from "../../src/UserInputEventSource"
import {
  type AnyGameEvent,
  type GameConfig,
  GameEventType,
  type ObjectUpdateEvent,
  type UserInputEvent,
} from "../../src/types"
import { ComplexTestEngine, MockLoader } from "../fixtures"

// Mock GameEventManager for testing
class MockGameEventManager {
  public recorder: GameRecorder | undefined

  setRecorder(recorder: GameRecorder | undefined): void {
    this.recorder = recorder
  }
}

describe("GameRecorder", () => {
  let recorder: GameRecorder
  let mockEventManager: MockGameEventManager

  beforeEach(() => {
    recorder = new GameRecorder()
    mockEventManager = new MockGameEventManager()
  })

  describe("Recording State Management", () => {
    it("should start in non-recording state", () => {
      expect(recorder.isCurrentlyRecording()).toBe(false)
      expect(recorder.getCurrentRecording()).toBeNull()
    })

    it("should start recording with metadata", () => {
      const gameConfig: GameConfig = { prngSeed: "test-seed-123" }
      const description = "Test recording session"

      recorder.startRecording(mockEventManager as any, gameConfig, description)

      expect(recorder.isCurrentlyRecording()).toBe(true)
      expect(mockEventManager.recorder).toBe(recorder)

      const recording = recorder.getCurrentRecording()
      expect(recording).not.toBeNull()
      expect(recording!.gameConfig).toEqual(gameConfig)
      expect(recording!.events).toEqual([])
      expect(recording!.deltaTicks).toEqual([])
      expect(recording!.totalTicks).toBe(0)
      expect(recording!.metadata?.description).toBe(description)
      expect(recording!.metadata?.version).toBe("1.0.0")
      expect(typeof recording!.metadata?.createdAt).toBe("number")
    })

    it("should start recording without optional description", () => {
      const gameConfig: GameConfig = { prngSeed: "minimal-test" }

      recorder.startRecording(mockEventManager as any, gameConfig)

      const recording = recorder.getCurrentRecording()
      expect(recording!.metadata?.description).toBeUndefined()
      expect(recording!.gameConfig).toEqual(gameConfig)
    })

    it("should stop recording and preserve data", () => {
      recorder.startRecording(mockEventManager as any, {
        prngSeed: "test-seed",
      })

      // Record some test data
      const testEvent: UserInputEvent = {
        type: GameEventType.USER_INPUT,
        tick: 1,
        inputType: "keyboard",
        params: { key: "W" },
      }
      recorder.recordEvent(testEvent)
      recorder.recordFrameUpdate(1, 1)

      recorder.stopRecording()

      expect(recorder.isCurrentlyRecording()).toBe(false)
      expect(mockEventManager.recorder).toBeUndefined()

      const recording = recorder.getCurrentRecording()
      expect(recording).not.toBeNull()
      expect(recording!.events).toHaveLength(1)
      expect(recording!.deltaTicks).toEqual([1])
      expect(recording!.totalTicks).toBe(1)
    })

    it("should handle stop recording when not recording", () => {
      expect(() => recorder.stopRecording()).not.toThrow()
      expect(recorder.isCurrentlyRecording()).toBe(false)
    })

    it("should allow multiple recording sessions", () => {
      // First recording session
      recorder.startRecording(mockEventManager as any, { prngSeed: "session1" })
      recorder.recordEvent({
        type: GameEventType.USER_INPUT,
        tick: 1,
        timestamp: 1000,
        inputType: "test1",
        params: {},
      } as UserInputEvent)
      recorder.stopRecording()

      const firstRecording = recorder.getCurrentRecording()
      expect(firstRecording!.events).toHaveLength(1)
      expect(firstRecording!.gameConfig.prngSeed).toBe("session1")

      // Second recording session
      recorder.startRecording(mockEventManager as any, { prngSeed: "session2" })
      recorder.recordEvent({
        type: GameEventType.USER_INPUT,
        tick: 1,
        timestamp: 2000,
        inputType: "test2",
        params: {},
      } as UserInputEvent)
      recorder.recordEvent({
        type: GameEventType.USER_INPUT,
        tick: 2,
        timestamp: 3000,
        inputType: "test3",
        params: {},
      } as UserInputEvent)
      recorder.stopRecording()

      const secondRecording = recorder.getCurrentRecording()
      expect(secondRecording!.events).toHaveLength(2)
      expect(secondRecording!.gameConfig.prngSeed).toBe("session2")

      // First recording should not be affected
      expect(firstRecording!.events).toHaveLength(1)
    })
  })

  describe("Event Recording", () => {
    beforeEach(() => {
      recorder.startRecording(mockEventManager as any, {
        prngSeed: "test-seed",
      })
    })

    it("should record user input events", () => {
      const userInputEvent: UserInputEvent = {
        type: GameEventType.USER_INPUT,
        tick: 1,
        inputType: "keyboard",
        params: { key: "SPACE", pressed: true },
      }

      recorder.recordEvent(userInputEvent)

      const recording = recorder.getCurrentRecording()
      expect(recording!.events).toHaveLength(1)
      expect(recording!.events[0]).toEqual(userInputEvent)
    })

    it("should record object update events", () => {
      const objectUpdateEvent: ObjectUpdateEvent = {
        type: GameEventType.OBJECT_UPDATE,
        tick: 2,
        objectType: "Player",
        objectId: "player1",
        method: "setPosition",
        params: [{ x: 100, y: 200 }],
      }

      recorder.recordEvent(objectUpdateEvent)

      const recording = recorder.getCurrentRecording()
      expect(recording!.events).toHaveLength(1)
      expect(recording!.events[0]).toEqual(objectUpdateEvent)
    })

    it("should record multiple events in order", () => {
      const events: AnyGameEvent[] = [
        {
          type: GameEventType.USER_INPUT,
          tick: 1,
          timestamp: 1000,
          inputType: "keyboard",
          params: { key: "W" },
        } as UserInputEvent,
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1001,
          objectType: "Player",
          objectId: "player1",
          method: "setVelocity",
          params: [{ x: 0, y: -1 }],
        } as ObjectUpdateEvent,
        {
          type: GameEventType.USER_INPUT,
          tick: 2,
          timestamp: 2000,
          inputType: "mouse",
          params: { button: "left", x: 100, y: 50 },
        } as UserInputEvent,
      ]

      events.forEach((event) => recorder.recordEvent(event))

      const recording = recorder.getCurrentRecording()
      expect(recording!.events).toEqual(events)
    })

    it("should perform shallow cloning of events", () => {
      const originalEvent: UserInputEvent = {
        type: GameEventType.USER_INPUT,
        tick: 1,
        inputType: "keyboard",
        params: { key: "W", pressed: true },
      }

      recorder.recordEvent(originalEvent)

      // Modify original event's top-level properties
      originalEvent.tick = 999
      originalEvent.inputType = "modified"

      const recording = recorder.getCurrentRecording()
      const recordedEvent = recording!.events[0] as UserInputEvent

      // Top-level properties should be protected by shallow copy
      expect(recordedEvent.tick).toBe(1)
      expect(recordedEvent.inputType).toBe("keyboard")

      // But nested objects are still shared (shallow copy limitation)
      originalEvent.params.pressed = false
      expect(recordedEvent.params.pressed).toBe(false) // This shows shallow copy behavior
    })

    it("should not record events when not recording", () => {
      recorder.stopRecording()

      const event: UserInputEvent = {
        type: GameEventType.USER_INPUT,
        tick: 1,
        inputType: "test",
        params: {},
      }

      recorder.recordEvent(event)

      const recording = recorder.getCurrentRecording()
      expect(recording!.events).toHaveLength(0)
    })

    it("should handle complex event parameters", () => {
      const complexEvent: ObjectUpdateEvent = {
        type: GameEventType.OBJECT_UPDATE,
        tick: 1,
        objectType: "ComplexObject",
        objectId: "complex1",
        method: "complexMethod",
        params: [
          { nested: { data: [1, 2, 3] } },
          "string parameter",
          42,
          true,
          null,
          undefined,
          new Array(5).fill({ value: "test" }),
        ],
      }

      recorder.recordEvent(complexEvent)

      const recording = recorder.getCurrentRecording()
      const recordedEvent = recording!.events[0] as ObjectUpdateEvent
      expect(recordedEvent.params).toEqual(complexEvent.params)
    })
  })

  describe("Frame Recording", () => {
    beforeEach(() => {
      recorder.startRecording(mockEventManager as any, {
        prngSeed: "test-seed",
      })
    })

    it("should record frame updates", () => {
      recorder.recordFrameUpdate(1, 1)
      recorder.recordFrameUpdate(1.5, 2.5)
      recorder.recordFrameUpdate(0.8, 3.3)

      recorder.stopRecording() // Copies frame data to recording

      const recording = recorder.getCurrentRecording()
      expect(recording!.deltaTicks).toEqual([1, 1.5, 0.8])
      expect(recording!.totalTicks).toBe(3.3)
    })

    it("should not record frames when not recording", () => {
      recorder.stopRecording()

      recorder.recordFrameUpdate(10, 100)

      const recording = recorder.getCurrentRecording()
      expect(recording!.deltaTicks).toEqual([])
      expect(recording!.totalTicks).toBe(0)
    })

    it("should handle zero delta frames", () => {
      recorder.recordFrameUpdate(0, 0)
      recorder.recordFrameUpdate(0, 0)
      recorder.recordFrameUpdate(1, 1)

      recorder.stopRecording()

      const recording = recorder.getCurrentRecording()
      expect(recording!.deltaTicks).toEqual([0, 0, 1])
      expect(recording!.totalTicks).toBe(1)
    })

    it("should handle negative delta frames", () => {
      recorder.recordFrameUpdate(-1, 0)
      recorder.recordFrameUpdate(2, 1)

      recorder.stopRecording()

      const recording = recorder.getCurrentRecording()
      expect(recording!.deltaTicks).toEqual([-1, 2])
      expect(recording!.totalTicks).toBe(1)
    })

    it("should preserve frame data during active recording", () => {
      recorder.recordFrameUpdate(1, 1)
      recorder.recordFrameUpdate(2, 3)

      // Frame data should not be copied to recording until stopped
      const activeRecording = recorder.getCurrentRecording()
      expect(activeRecording!.deltaTicks).toEqual([])
      expect(activeRecording!.totalTicks).toBe(0)
    })
  })

  describe("Reset Functionality", () => {
    it("should reset all recording state", () => {
      recorder.startRecording(mockEventManager as any, {
        prngSeed: "test-seed",
      })

      recorder.recordEvent({
        type: GameEventType.USER_INPUT,
        tick: 1,
        timestamp: 1000,
        inputType: "test",
        params: {},
      } as UserInputEvent)
      recorder.recordFrameUpdate(1, 1)

      recorder.reset()

      expect(recorder.isCurrentlyRecording()).toBe(false)
      expect(recorder.getCurrentRecording()).toBeNull()
      expect(mockEventManager.recorder).toBeUndefined()
    })

    it("should reset when not recording", () => {
      expect(() => recorder.reset()).not.toThrow()
      expect(recorder.getCurrentRecording()).toBeNull()
    })

    it("should allow new recording after reset", () => {
      recorder.startRecording(mockEventManager as any, { prngSeed: "first" })
      recorder.recordEvent({
        type: GameEventType.USER_INPUT,
        tick: 1,
        timestamp: 1000,
        inputType: "test",
        params: {},
      } as UserInputEvent)

      recorder.reset()

      recorder.startRecording(mockEventManager as any, { prngSeed: "second" })
      recorder.recordEvent({
        type: GameEventType.USER_INPUT,
        tick: 1,
        timestamp: 2000,
        inputType: "test2",
        params: {},
      } as UserInputEvent)

      const recording = recorder.getCurrentRecording()
      expect(recording!.gameConfig.prngSeed).toBe("second")
      expect(recording!.events).toHaveLength(1)
      expect((recording!.events[0] as UserInputEvent).inputType).toBe("test2")
    })
  })

  describe("Integration with GameEventManager", () => {
    let engine: ComplexTestEngine
    let eventManager: GameEventManager
    let inputSource: UserInputEventSource

    beforeEach(async () => {
      const testLoader = new MockLoader()
      engine = new ComplexTestEngine(testLoader)
      await engine.reset({ prngSeed: "recorder-test" })

      inputSource = new UserInputEventSource()
      eventManager = new GameEventManager(inputSource, engine)
    })

    it("should record events from GameEventManager", () => {
      recorder.startRecording(eventManager, { prngSeed: "integration-test" })

      // Queue input events
      inputSource.queueInput("keyboard", { key: "A", pressed: true })
      inputSource.queueInput("keyboard", { key: "A", pressed: false })

      // Process events through event manager
      eventManager.update(1, 1)
      eventManager.update(1, 2)

      const recording = recorder.getCurrentRecording()
      expect(recording!.events).toHaveLength(2)

      const firstEvent = recording!.events[0] as UserInputEvent
      expect(firstEvent.type).toBe(GameEventType.USER_INPUT)
      expect(firstEvent.inputType).toBe("keyboard")
      expect(firstEvent.params.key).toBe("A")
      expect(firstEvent.params.pressed).toBe(true)

      const secondEvent = recording!.events[1] as UserInputEvent
      expect(secondEvent.params.pressed).toBe(false)
    })

    it("should stop recording events after stopRecording", () => {
      recorder.startRecording(eventManager, { prngSeed: "stop-test" })

      inputSource.queueInput("test1", {})
      eventManager.update(1, 1)

      recorder.stopRecording()

      inputSource.queueInput("test2", {})
      eventManager.update(1, 2)

      const recording = recorder.getCurrentRecording()
      expect(recording!.events).toHaveLength(1)
      expect((recording!.events[0] as UserInputEvent).inputType).toBe("test1")
    })
  })

  describe("Edge Cases and Error Handling", () => {
    it("should handle rapid start/stop cycles", () => {
      for (let i = 0; i < 10; i++) {
        recorder.startRecording(mockEventManager as any, {
          prngSeed: `seed${i}`,
        })
        recorder.recordEvent({
          type: GameEventType.USER_INPUT,
          tick: 1,
          timestamp: 1000 + i,
          inputType: `test${i}`,
          params: {},
        } as UserInputEvent)
        recorder.stopRecording()

        const recording = recorder.getCurrentRecording()
        expect(recording!.gameConfig.prngSeed).toBe(`seed${i}`)
        expect(recording!.events).toHaveLength(1)
      }
    })

    it("should handle empty recordings", () => {
      recorder.startRecording(mockEventManager as any, {
        prngSeed: "empty-test",
      })
      recorder.stopRecording()

      const recording = recorder.getCurrentRecording()
      expect(recording!.events).toEqual([])
      expect(recording!.deltaTicks).toEqual([])
      expect(recording!.totalTicks).toBe(0)
    })

    it("should handle very long recordings", () => {
      recorder.startRecording(mockEventManager as any, {
        prngSeed: "long-test",
      })

      // Record many events
      for (let i = 0; i < 10000; i++) {
        recorder.recordEvent({
          type: GameEventType.USER_INPUT,
          tick: i + 1,
          timestamp: 1000 + i,
          inputType: `event${i}`,
          params: { index: i },
        } as UserInputEvent)

        recorder.recordFrameUpdate(1, i + 1)
      }

      recorder.stopRecording()

      const recording = recorder.getCurrentRecording()
      expect(recording!.events).toHaveLength(10000)
      expect(recording!.deltaTicks).toHaveLength(10000)
      expect(recording!.totalTicks).toBe(10000)
    })

    it("should handle concurrent operations", () => {
      recorder.startRecording(mockEventManager as any, {
        prngSeed: "concurrent-test",
      })

      // Simulate concurrent event recording
      const events: AnyGameEvent[] = []
      for (let i = 0; i < 100; i++) {
        const event: UserInputEvent = {
          type: GameEventType.USER_INPUT,
          tick: Math.floor(i / 10) + 1,
          inputType: `concurrent${i}`,
          params: { value: i },
        }
        events.push(event)
        recorder.recordEvent(event)
        recorder.recordFrameUpdate(0.1, (i + 1) * 0.1)
      }

      recorder.stopRecording()

      const recording = recorder.getCurrentRecording()
      expect(recording!.events).toHaveLength(100)
      expect(recording!.deltaTicks).toHaveLength(100)
    })
  })

  describe("Data Integrity", () => {
    it("should maintain event order across recording sessions", () => {
      recorder.startRecording(mockEventManager as any, {
        prngSeed: "order-test",
      })

      for (let i = 0; i < 5; i++) {
        recorder.recordEvent({
          type: GameEventType.USER_INPUT,
          tick: i + 1,
          inputType: `event${i}`,
          params: {},
        } as UserInputEvent)
      }

      recorder.stopRecording()

      const recording = recorder.getCurrentRecording()
      const recordedInputTypes = recording!.events.map(
        (e) => (e as UserInputEvent).inputType,
      )
      expect(recordedInputTypes).toEqual([
        "event0",
        "event1",
        "event2",
        "event3",
        "event4",
      ])
    })

    it("should create shallow copies of recording data", () => {
      recorder.startRecording(mockEventManager as any, {
        prngSeed: "copy-test",
      })

      const originalEvent: UserInputEvent = {
        type: GameEventType.USER_INPUT,
        tick: 1,
        inputType: "keyboard",
        params: { nested: { data: [1, 2, 3] } },
      }

      recorder.recordEvent(originalEvent)
      recorder.stopRecording()

      const recording1 = recorder.getCurrentRecording()
      const recording2 = recorder.getCurrentRecording()

      // Recording objects should be separate (shallow copy of recording)
      expect(recording1).not.toBe(recording2)

      // But events array and deltaTicks are shared references (shallow copy)
      expect(recording1!.events).toBe(recording2!.events)
      expect(recording1!.deltaTicks).toBe(recording2!.deltaTicks)

      // Content should be equal
      expect(recording1).toEqual(recording2)
    })
  })

  describe("Arbitrary Metadata", () => {
    let recorder: GameRecorder
    let mockEventManager: MockGameEventManager

    beforeEach(() => {
      recorder = new GameRecorder()
      mockEventManager = new MockGameEventManager()
    })

    it("should accept arbitrary metadata properties as object", () => {
      recorder.startRecording(
        mockEventManager as any,
        { prngSeed: "test-seed" },
        {
          description: "Test recording",
          gameMode: "survival",
          difficulty: "hard",
          playerName: "Alice",
          customField: { nested: "value" },
        },
      )

      const recording = recorder.getCurrentRecording()
      expect(recording!.metadata?.description).toBe("Test recording")
      expect(recording!.metadata?.gameMode).toBe("survival")
      expect(recording!.metadata?.difficulty).toBe("hard")
      expect(recording!.metadata?.playerName).toBe("Alice")
      expect(recording!.metadata?.customField).toEqual({ nested: "value" })
      expect(recording!.metadata?.version).toBe("1.0.0")
      expect(typeof recording!.metadata?.createdAt).toBe("number")
    })

    it("should still support backward compatible string description", () => {
      recorder.startRecording(
        mockEventManager as any,
        { prngSeed: "test-seed" },
        "Simple description",
      )

      const recording = recorder.getCurrentRecording()
      expect(recording!.metadata?.description).toBe("Simple description")
      expect(recording!.metadata?.version).toBe("1.0.0")
      expect(typeof recording!.metadata?.createdAt).toBe("number")
    })

    it("should support description string with additional metadata", () => {
      recorder.startRecording(
        mockEventManager as any,
        { prngSeed: "test-seed" },
        "Description",
        {
          gameMode: "arcade",
          score: 1000,
        },
      )

      const recording = recorder.getCurrentRecording()
      expect(recording!.metadata?.description).toBe("Description")
      expect(recording!.metadata?.gameMode).toBe("arcade")
      expect(recording!.metadata?.score).toBe(1000)
    })

    it("should override default version if provided in metadata", () => {
      recorder.startRecording(
        mockEventManager as any,
        { prngSeed: "test-seed" },
        {
          version: "2.0.0",
          customField: "test",
        },
      )

      const recording = recorder.getCurrentRecording()
      expect(recording!.metadata?.version).toBe("2.0.0")
      expect(recording!.metadata?.customField).toBe("test")
    })

    it("should preserve createdAt if provided in metadata", () => {
      const customTime = Date.now() - 10000
      recorder.startRecording(
        mockEventManager as any,
        { prngSeed: "test-seed" },
        {
          createdAt: customTime,
          description: "Custom time",
        },
      )

      const recording = recorder.getCurrentRecording()
      expect(recording!.metadata?.createdAt).toBe(customTime)
    })

    it("should handle empty metadata object", () => {
      recorder.startRecording(
        mockEventManager as any,
        { prngSeed: "test-seed" },
        {},
      )

      const recording = recorder.getCurrentRecording()
      expect(recording!.metadata?.version).toBe("1.0.0")
      expect(typeof recording!.metadata?.createdAt).toBe("number")
    })

    it("should handle null and undefined metadata gracefully", () => {
      recorder.startRecording(
        mockEventManager as any,
        { prngSeed: "test-seed" },
        undefined,
      )

      const recording = recorder.getCurrentRecording()
      expect(recording!.metadata?.version).toBe("1.0.0")
      expect(typeof recording!.metadata?.createdAt).toBe("number")
      expect(recording!.metadata?.description).toBeUndefined()
    })
  })
})
