import { beforeEach, describe, expect, it } from "bun:test"
import { GameEventManager } from "../../src/GameEventManager"
import { GameRecorder } from "../../src/GameRecorder"
import { ReplayManager } from "../../src/ReplayManager"
import { UserInputEventSource } from "../../src/UserInputEventSource"
import { Vector2D } from "../../src/geometry/Vector2D"
import {
  GameEventType,
  type GameRecording,
  GameState,
  type ObjectUpdateEvent,
  type UserInputEvent,
} from "../../src/types"
import { ComplexTestEngine } from "../fixtures"

describe("ReplayManager", () => {
  let engine: ComplexTestEngine
  let replayManager: ReplayManager
  let sampleRecording: GameRecording

  beforeEach(() => {
    engine = new ComplexTestEngine()
    replayManager = new ReplayManager(engine)

    // Create a sample recording for testing
    sampleRecording = {
      seed: "test-replay-seed",
      events: [
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
          params: [new Vector2D(10, 20)],
        } as ObjectUpdateEvent,
        {
          type: GameEventType.USER_INPUT,
          frame: 3,
          timestamp: 3000,
          inputType: "keyboard",
          params: { key: "W", pressed: false },
        } as UserInputEvent,
        {
          type: GameEventType.OBJECT_UPDATE,
          frame: 5,
          timestamp: 5000,
          objectType: "Player",
          objectId: "player1",
          method: "setVelocity",
          params: [new Vector2D(0, 0)],
        } as ObjectUpdateEvent,
      ],
      deltaFrames: [1, 1, 1, 1, 1], // 5 frames total
      totalFrames: 5,
      metadata: {
        createdAt: Date.now(),
        version: "1.0.0",
        description: "Test recording",
      },
    }
  })

  describe("Initial State", () => {
    it("should start in non-replaying state", () => {
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
      expect(replayManager.getCurrentFrame()).toBe(0)

      const progress = replayManager.getReplayProgress()
      expect(progress.isReplaying).toBe(false)
      expect(progress.progress).toBe(0)
      expect(progress.hasMoreFrames).toBe(false)
    })
  })

  describe("Starting Replay", () => {
    it("should initialize replay with recording", () => {
      replayManager.replay(sampleRecording)

      expect(replayManager.isCurrentlyReplaying()).toBe(true)
      expect(replayManager.getCurrentFrame()).toBe(0)
      expect(engine.getState()).toBe(GameState.PLAYING)

      const progress = replayManager.getReplayProgress()
      expect(progress.isReplaying).toBe(true)
      expect(progress.progress).toBe(0)
      expect(progress.hasMoreFrames).toBe(true)
    })

    it("should reset engine with recording seed", () => {
      const originalSeed = engine.getSeed()

      replayManager.replay(sampleRecording)

      expect(engine.getSeed()).toBe(sampleRecording.seed)
      expect(engine.getSeed()).not.toBe(originalSeed)
    })

    it("should set recorded event source on engine", () => {
      replayManager.replay(sampleRecording)

      const eventManager = engine.getEventManager()
      const sourceInfo = eventManager.getSourceInfo()
      expect(sourceInfo.type).toBe("RecordedEventSource")
      expect(sourceInfo.hasMore).toBe(true)
    })

    it("should throw error when already replaying", () => {
      replayManager.replay(sampleRecording)

      expect(() => {
        replayManager.replay(sampleRecording)
      }).toThrow("Already replaying. Stop current replay first.")
    })

    it("should handle empty recording", () => {
      const emptyRecording: GameRecording = {
        seed: "empty-seed",
        events: [],
        deltaFrames: [],
        totalFrames: 0,
        metadata: { createdAt: Date.now() },
      }

      expect(() => replayManager.replay(emptyRecording)).not.toThrow()
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      const progress = replayManager.getReplayProgress()
      expect(progress.hasMoreFrames).toBe(false)
    })
  })

  describe("Replay Update Processing", () => {
    beforeEach(() => {
      replayManager.replay(sampleRecording)
    })

    it("should process frames according to recorded deltaFrames", () => {
      // Each recorded deltaFrame is 1, so should process one frame per update call
      expect(replayManager.getCurrentFrame()).toBe(0)

      replayManager.update(1) // Should process frame 1
      expect(replayManager.getCurrentFrame()).toBe(1)

      replayManager.update(1) // Should process frame 2
      expect(replayManager.getCurrentFrame()).toBe(2)

      replayManager.update(1) // Should process frame 3
      expect(replayManager.getCurrentFrame()).toBe(3)
    })

    it("should accumulate deltaFrames when insufficient for next recorded frame", () => {
      expect(replayManager.getCurrentFrame()).toBe(0)

      // Provide partial frame
      replayManager.update(0.5)
      expect(replayManager.getCurrentFrame()).toBe(0) // Not enough for full frame

      // Provide remaining partial frame
      replayManager.update(0.5)
      expect(replayManager.getCurrentFrame()).toBe(1) // Now enough for full frame
    })

    it("should process multiple recorded frames in single update", () => {
      expect(replayManager.getCurrentFrame()).toBe(0)

      // Provide enough deltaFrames for multiple recorded frames
      replayManager.update(3.5) // Should process 3 complete frames (3 * 1.0)
      expect(replayManager.getCurrentFrame()).toBe(3)

      // Remaining 0.5 should be accumulated
      replayManager.update(0.5) // Total of 1.0, should process 1 more frame
      expect(replayManager.getCurrentFrame()).toBe(4)
    })

    it("should update progress correctly during replay", () => {
      let progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(0)
      expect(progress.hasMoreFrames).toBe(true)

      replayManager.update(1) // Frame 1 of 5
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBeCloseTo(0.2, 2) // 1/5

      replayManager.update(2) // Frames 2-3 of 5
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBeCloseTo(0.6, 2) // 3/5

      replayManager.update(2) // Frames 4-5 of 5
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(1.0) // Complete
      expect(progress.hasMoreFrames).toBe(false)
    })

    it("should stop replay when all deltaFrames processed", () => {
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      // Process frames one at a time
      replayManager.update(1) // Should process deltaFrames[0] = 1
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      replayManager.update(1) // Should process deltaFrames[1] = 1
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      replayManager.update(1) // Should process deltaFrames[2] = 1
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      replayManager.update(1) // Should process deltaFrames[3] = 1
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      replayManager.update(1) // Should process deltaFrames[4] = 1 and auto-stop
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
      expect(replayManager.getCurrentFrame()).toBe(5)
    })

    it("should not process frames when not replaying", () => {
      replayManager.stopReplay()

      const initialFrame = replayManager.getCurrentFrame()
      replayManager.update(10) // Large update

      expect(replayManager.getCurrentFrame()).toBe(initialFrame)
    })
  })

  describe("Stopping Replay", () => {
    it("should stop active replay", () => {
      replayManager.replay(sampleRecording)
      replayManager.update(2) // Process some frames

      expect(replayManager.isCurrentlyReplaying()).toBe(true)
      expect(replayManager.getCurrentFrame()).toBe(2)

      replayManager.stopReplay()

      expect(replayManager.isCurrentlyReplaying()).toBe(false)
      expect(engine.getState()).toBe(GameState.PAUSED)
    })

    it("should reset replay state", () => {
      replayManager.replay(sampleRecording)
      replayManager.update(3)

      replayManager.stopReplay()

      expect(replayManager.getCurrentFrame()).toBe(3) // Frame count preserved after stop

      const progress = replayManager.getReplayProgress()
      expect(progress.isReplaying).toBe(false)
      expect(progress.progress).toBe(0.6) // 3/5 frames completed
      expect(progress.hasMoreFrames).toBe(true) // Still has deltaFrames[3] and deltaFrames[4] remaining
    })

    it("should handle stop when not replaying", () => {
      expect(() => replayManager.stopReplay()).not.toThrow()
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    it("should allow new replay after stopping", () => {
      replayManager.replay(sampleRecording)
      replayManager.update(2)
      replayManager.stopReplay()

      // Start new replay
      const newRecording: GameRecording = {
        ...sampleRecording,
        seed: "new-seed",
        deltaFrames: [0.5, 0.5, 0.5, 0.5],
        totalFrames: 2,
      }

      expect(() => replayManager.replay(newRecording)).not.toThrow()
      expect(replayManager.isCurrentlyReplaying()).toBe(true)
      expect(engine.getSeed()).toBe("new-seed")
    })
  })

  describe("Frame Timing Edge Cases", () => {
    it("should handle zero deltaFrames in recording", () => {
      const zeroFrameRecording: GameRecording = {
        seed: "zero-frame-test",
        events: [
          {
            type: GameEventType.USER_INPUT,
            frame: 0,
            timestamp: 1000,
            inputType: "test",
            params: {},
          } as UserInputEvent,
        ],
        deltaFrames: [0, 1, 0, 1], // Zero deltaFrames are invalid
        totalFrames: 2,
        metadata: { createdAt: Date.now() },
      }

      // Should throw validation error for zero deltaFrames
      expect(() => replayManager.replay(zeroFrameRecording)).toThrow(
        "Invalid recording: deltaFrames[0] must be a positive number, got 0",
      )
    })

    it("should handle fractional deltaFrames in recording", () => {
      const fractionalRecording: GameRecording = {
        seed: "fractional-test",
        events: [],
        deltaFrames: [0.1, 0.3, 0.5, 1.1],
        totalFrames: 2,
        metadata: { createdAt: Date.now() },
      }

      replayManager.replay(fractionalRecording)

      replayManager.update(0.4) // Should process 0.1 + 0.3 frames
      expect(replayManager.getCurrentFrame()).toBeCloseTo(0.4, 2)

      replayManager.update(0.6) // Should process 0.5 frame
      expect(replayManager.getCurrentFrame()).toBeCloseTo(0.9, 2)

      replayManager.update(1.2) // Should process 1.1 frame
      expect(replayManager.getCurrentFrame()).toBe(2)
    })

    it("should handle large deltaFrames in recording", () => {
      const largeFrameRecording: GameRecording = {
        seed: "large-frame-test",
        events: [],
        deltaFrames: [10, 20, 30],
        totalFrames: 60,
        metadata: { createdAt: Date.now() },
      }

      replayManager.replay(largeFrameRecording)

      replayManager.update(15) // Should process first frame (10) with 5 remaining
      expect(replayManager.getCurrentFrame()).toBe(10)

      replayManager.update(20) // Should process second frame (20) with 5 remaining
      expect(replayManager.getCurrentFrame()).toBe(30)

      replayManager.update(35) // Should process third frame (30) and auto-stop
      expect(replayManager.getCurrentFrame()).toBe(60)
      expect(replayManager.isCurrentlyReplaying()).toBe(false) // Auto-stopped after all frames processed
    })
  })

  describe("Integration with GameEngine", () => {
    let recorder: GameRecorder
    let inputSource: UserInputEventSource
    let eventManager: GameEventManager

    beforeEach(() => {
      // Set up recording infrastructure
      inputSource = new UserInputEventSource()
      eventManager = new GameEventManager(inputSource, engine)
      recorder = new GameRecorder()
    })

    it("should replay recorded game session accurately", () => {
      // Create a test player
      const player = engine.createTestPlayer("player1", new Vector2D(0, 0))

      // Set recorder on engine before starting recording
      engine.setGameRecorder(recorder)
      // Record a session
      recorder.startRecording(eventManager, "integration-test")

      // Start the engine so it processes frames
      engine.start()

      // Simulate game events
      inputSource.queueInput("move", { direction: "right" })
      engine.update(1) // This will call recorder.recordFrameUpdate and eventManager.update

      // Create object update event manually (simulating game logic)
      player.setPosition(new Vector2D(10, 0))
      recorder.recordEvent({
        type: GameEventType.OBJECT_UPDATE,
        frame: 1,
        timestamp: Date.now(),
        objectType: "Player",
        objectId: "player1",
        method: "setPosition",
        params: [new Vector2D(10, 0)],
      } as ObjectUpdateEvent)

      inputSource.queueInput("move", { direction: "up" })
      engine.update(1) // This will call recorder.recordFrameUpdate and eventManager.update

      player.setPosition(new Vector2D(10, 10))
      recorder.recordEvent({
        type: GameEventType.OBJECT_UPDATE,
        frame: 2,
        timestamp: Date.now(),
        objectType: "Player",
        objectId: "player1",
        method: "setPosition",
        params: [new Vector2D(10, 10)],
      } as ObjectUpdateEvent)

      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()!

      // Replay the session (this will reset the engine)
      replayManager.replay(recording)

      // Create new player for replay AFTER replay starts (engine is already reset by replay())
      const replayPlayer = engine.createTestPlayer(
        "player1",
        new Vector2D(0, 0),
      )
      expect(replayPlayer.getPosition()).toEqual(new Vector2D(0, 0))

      // Process the replay
      replayManager.update(1) // Frame 1
      expect(replayPlayer.getPosition()).toEqual(new Vector2D(10, 0))

      replayManager.update(1) // Frame 2
      expect(replayPlayer.getPosition()).toEqual(new Vector2D(10, 10))

      // One more update should trigger auto-stop
      replayManager.update(1)
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    it("should maintain determinism across multiple replays", () => {
      // Create complex recording with PRNG usage
      const complexRecording: GameRecording = {
        seed: "determinism-test",
        events: [
          {
            type: GameEventType.OBJECT_UPDATE,
            frame: 1,
            timestamp: 1000,
            objectType: "Player",
            objectId: "player1",
            method: "setPosition",
            params: [new Vector2D(5, 5)],
          } as ObjectUpdateEvent,
          {
            type: GameEventType.OBJECT_UPDATE,
            frame: 2,
            timestamp: 2000,
            objectType: "Player",
            objectId: "player1",
            method: "setVelocity",
            params: [new Vector2D(1, -1)],
          } as ObjectUpdateEvent,
        ],
        deltaFrames: [1, 1],
        totalFrames: 2,
        metadata: { createdAt: Date.now() },
      }

      const positions: Vector2D[] = []
      const velocities: Vector2D[] = []

      // First replay
      engine.reset("determinism-test")
      const player1 = engine.createTestPlayer("player1", new Vector2D(0, 0))

      replayManager.replay(complexRecording)
      replayManager.update(1)
      positions.push(player1.getPosition())
      replayManager.update(1)
      velocities.push(player1.getVelocity())

      // Second replay
      replayManager.stopReplay() // Stop first replay before starting second
      engine.reset("determinism-test")
      const player2 = engine.createTestPlayer("player1", new Vector2D(0, 0))

      replayManager.replay(complexRecording)
      replayManager.update(1)
      expect(player2.getPosition()).toEqual(positions[0])
      replayManager.update(1)
      expect(player2.getVelocity()).toEqual(velocities[0])
    })
  })

  describe("Performance and Stress Testing", () => {
    it("should handle long recordings efficiently", () => {
      const longRecording: GameRecording = {
        seed: "long-test",
        events: Array.from(
          { length: 1000 },
          (_, i) =>
            ({
              type: GameEventType.USER_INPUT,
              frame: i + 1,
              timestamp: 1000 + i,
              inputType: `input${i}`,
              params: { index: i },
            }) as UserInputEvent,
        ),
        deltaFrames: new Array(1000).fill(1),
        totalFrames: 1000,
        metadata: { createdAt: Date.now() },
      }

      const startTime = performance.now()

      replayManager.replay(longRecording)

      // Process all frames - should auto-stop immediately
      replayManager.update(1000)

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(replayManager.getCurrentFrame()).toBe(1000)
      expect(replayManager.isCurrentlyReplaying()).toBe(false) // Auto-stopped after all frames processed
      expect(processingTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it("should handle rapid replay cycles", () => {
      const quickRecording: GameRecording = {
        seed: "quick-test",
        events: [],
        deltaFrames: [0.1, 0.1, 0.1],
        totalFrames: 0.3,
        metadata: { createdAt: Date.now() },
      }

      for (let cycle = 0; cycle < 100; cycle++) {
        replayManager.replay(quickRecording)

        // Process all deltaFrames at once (0.1 + 0.1 + 0.1 = 0.3) - should auto-stop
        replayManager.update(0.3)
        expect(replayManager.isCurrentlyReplaying()).toBe(false)

        // Ensure clean state for next cycle (though stopReplay should be idempotent)
        replayManager.stopReplay()
      }
    })

    it("should handle irregular frame timing", () => {
      const irregularRecording: GameRecording = {
        seed: "irregular-test",
        events: [],
        deltaFrames: [0.001, 10, 0.1, 5, 0.01, 2],
        totalFrames: 17.111,
        metadata: { createdAt: Date.now() },
      }

      replayManager.replay(irregularRecording)

      // Process with various update sizes
      replayManager.update(0.5) // Should process 0.001, still replaying
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      replayManager.update(15) // Should process 10, 0.1, 5, still replaying
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      replayManager.update(2) // Should process 0.01, 2 and auto-stop
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
      expect(replayManager.getCurrentFrame()).toBeCloseTo(17.111, 3)
    })
  })

  describe("Error Handling and Edge Cases", () => {
    it("should handle corrupted recording data gracefully", () => {
      const corruptedRecording = {
        seed: "corrupted",
        events: null, // Corrupted
        deltaFrames: [1, 2, 3],
        totalFrames: 6,
        metadata: { createdAt: Date.now() },
      } as any

      // Should throw validation error for invalid events array
      expect(() => replayManager.replay(corruptedRecording)).toThrow(
        "Invalid recording: events must be an array",
      )
    })

    it("should handle missing deltaFrames", () => {
      const missingFramesRecording: GameRecording = {
        seed: "missing-frames",
        events: [
          {
            type: GameEventType.USER_INPUT,
            frame: 1,
            timestamp: 1000,
            inputType: "test",
            params: {},
          } as UserInputEvent,
        ],
        deltaFrames: [], // No frame data
        totalFrames: 0,
        metadata: { createdAt: Date.now() },
      }

      replayManager.replay(missingFramesRecording)
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      replayManager.update(10) // Should stop immediately due to no frames
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    it("should handle negative totalFrames", () => {
      const negativeFramesRecording: GameRecording = {
        seed: "negative-frames",
        events: [],
        deltaFrames: [1, 1],
        totalFrames: -5, // Invalid
        metadata: { createdAt: Date.now() },
      }

      // Should throw validation error for negative totalFrames
      expect(() => replayManager.replay(negativeFramesRecording)).toThrow(
        "Invalid recording: totalFrames must be a non-negative number",
      )
    })

    it("should handle stop/start during frame processing", () => {
      replayManager.replay(sampleRecording)

      replayManager.update(2.5) // Partial processing
      expect(replayManager.getCurrentFrame()).toBe(2)

      replayManager.stopReplay()
      expect(replayManager.getCurrentFrame()).toBe(2) // Frame count preserved after stop

      // Restart
      replayManager.replay(sampleRecording)
      replayManager.update(1)
      expect(replayManager.getCurrentFrame()).toBe(1)
    })
  })

  describe("Progress Tracking", () => {
    it("should provide accurate progress information", () => {
      const recording: GameRecording = {
        seed: "progress-test",
        events: [],
        deltaFrames: [2, 3, 5], // Total of 10 frames
        totalFrames: 10,
        metadata: { createdAt: Date.now() },
      }

      replayManager.replay(recording)

      let progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(0)
      expect(progress.hasMoreFrames).toBe(true)

      replayManager.update(2) // Process first deltaFrame (2 frames)
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBeCloseTo(0.2, 2) // 2/10

      replayManager.update(3) // Process second deltaFrame (3 frames)
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBeCloseTo(0.5, 2) // 5/10

      replayManager.update(5) // Process final deltaFrame (5 frames) and auto-stop
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(1.0) // 10/10
      expect(progress.hasMoreFrames).toBe(false)
      expect(progress.isReplaying).toBe(false) // Auto-stopped after all frames processed
    })

    it("should clamp progress to 1.0 maximum", () => {
      const overflowRecording: GameRecording = {
        seed: "overflow-test",
        events: [],
        deltaFrames: [1],
        totalFrames: 0.5, // Less than deltaFrames sum
        metadata: { createdAt: Date.now() },
      }

      replayManager.replay(overflowRecording)
      replayManager.update(1)

      const progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(1.0) // Clamped to maximum
    })
  })
})
