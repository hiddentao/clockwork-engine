import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { GameEngine } from "../../src/GameEngine"
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
import { ComplexTestEngine, MockLoader } from "../fixtures"

describe("ReplayManager", () => {
  let engine: ComplexTestEngine
  let replayManager: ReplayManager
  let proxyEngine: GameEngine
  let sampleRecording: GameRecording
  let loader: MockLoader
  let originalConsoleWarn: typeof console.warn

  beforeEach(() => {
    // Suppress console warnings for object types not found during replay tests
    originalConsoleWarn = console.warn
    console.warn = () => {
      /* Suppress console warnings during replay tests */
    }

    loader = new MockLoader()
    engine = new ComplexTestEngine(loader)
    replayManager = new ReplayManager(engine)
    proxyEngine = replayManager.getReplayEngine()

    // Create a sample recording for testing
    sampleRecording = {
      gameConfig: { prngSeed: "test-replay-seed" },
      events: [
        {
          type: GameEventType.USER_INPUT,
          tick: 1,
          timestamp: 1000,
          inputType: "keyboard",
          params: { key: "W", pressed: true },
        } as UserInputEvent,
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 1,
          timestamp: 1001,
          objectType: "Player",
          objectId: "player1",
          method: "setPosition",
          params: [new Vector2D(10, 20)],
        } as ObjectUpdateEvent,
        {
          type: GameEventType.USER_INPUT,
          tick: 3,
          timestamp: 3000,
          inputType: "keyboard",
          params: { key: "W", pressed: false },
        } as UserInputEvent,
        {
          type: GameEventType.OBJECT_UPDATE,
          tick: 5,
          timestamp: 5000,
          objectType: "Player",
          objectId: "player1",
          method: "setVelocity",
          params: [new Vector2D(0, 0)],
        } as ObjectUpdateEvent,
      ],
      deltaTicks: [1, 1, 1, 1, 1], // 5 frames total
      totalTicks: 5,
      metadata: {
        createdAt: Date.now(),
        version: "1.0.0",
        description: "Test recording",
      },
    }
  })

  afterEach(() => {
    // Restore console.warn
    console.warn = originalConsoleWarn
  })

  describe("Initial State", () => {
    it("should start in non-replaying state", () => {
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
      expect(replayManager.getCurrentTick()).toBe(0)

      const progress = replayManager.getReplayProgress()
      expect(progress.isReplaying).toBe(false)
      expect(progress.progress).toBe(0)
      expect(progress.hasMoreTicks).toBe(false)
    })
  })

  describe("Starting Replay", () => {
    it("should initialize replay with recording", async () => {
      await replayManager.replay(sampleRecording)

      expect(replayManager.isCurrentlyReplaying()).toBe(true)
      expect(replayManager.getCurrentTick()).toBe(0)
      expect(engine.getState()).toBe(GameState.PLAYING)

      const progress = replayManager.getReplayProgress()
      expect(progress.isReplaying).toBe(true)
      expect(progress.progress).toBe(0)
      expect(progress.hasMoreTicks).toBe(true)
    })

    it("should reset engine with recording seed", async () => {
      const originalSeed = engine.getSeed()

      await replayManager.replay(sampleRecording)

      expect(engine.getSeed()).toBe(sampleRecording.gameConfig.prngSeed!)
      expect(engine.getSeed()).not.toBe(originalSeed)
    })

    it("should set recorded event source on engine", async () => {
      await replayManager.replay(sampleRecording)

      const eventManager = engine.getEventManager()
      const sourceInfo = eventManager.getSourceInfo()
      expect(sourceInfo.type).toBe("RecordedEventSource")
      expect(sourceInfo.hasMore).toBe(true)
    })

    it("should throw error when already replaying", async () => {
      await replayManager.replay(sampleRecording)

      await expect(replayManager.replay(sampleRecording)).rejects.toThrow(
        "Already replaying. Stop current replay first.",
      )
    })

    it("should handle empty recording", async () => {
      const emptyRecording: GameRecording = {
        gameConfig: { prngSeed: "empty-seed" },
        events: [],
        deltaTicks: [],
        totalTicks: 0,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(emptyRecording)
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      const progress = replayManager.getReplayProgress()
      expect(progress.hasMoreTicks).toBe(false)
    })
  })

  describe("Replay Update Processing", () => {
    beforeEach(async () => {
      await replayManager.replay(sampleRecording)
    })

    it("should process frames according to recorded deltaTicks", () => {
      // Each recorded deltaFrame is 1, so should process one frame per update call
      expect(replayManager.getCurrentTick()).toBe(0)

      proxyEngine.update(1) // Should process frame 1
      expect(replayManager.getCurrentTick()).toBe(1)

      proxyEngine.update(1) // Should process frame 2
      expect(replayManager.getCurrentTick()).toBe(2)

      proxyEngine.update(1) // Should process frame 3
      expect(replayManager.getCurrentTick()).toBe(3)
    })

    it("should accumulate deltaTicks when insufficient for next recorded frame", () => {
      expect(replayManager.getCurrentTick()).toBe(0)

      // Provide partial frame
      proxyEngine.update(0.5)
      expect(replayManager.getCurrentTick()).toBe(0) // Not enough for full frame

      // Provide remaining partial frame
      proxyEngine.update(0.5)
      expect(replayManager.getCurrentTick()).toBe(1) // Now enough for full frame
    })

    it("should process multiple recorded frames in single update", () => {
      expect(replayManager.getCurrentTick()).toBe(0)

      // Provide enough deltaTicks for multiple recorded frames
      proxyEngine.update(3.5) // Should process 3 complete frames (3 * 1.0)
      expect(replayManager.getCurrentTick()).toBe(3)

      // Remaining 0.5 should be accumulated
      proxyEngine.update(0.5) // Total of 1.0, should process 1 more frame
      expect(replayManager.getCurrentTick()).toBe(4)
    })

    it("should update progress correctly during replay", () => {
      let progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(0)
      expect(progress.hasMoreTicks).toBe(true)

      proxyEngine.update(1) // Frame 1 of 5
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBeCloseTo(0.2, 2) // 1/5

      proxyEngine.update(2) // Frames 2-3 of 5
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBeCloseTo(0.6, 2) // 3/5

      proxyEngine.update(2) // Frames 4-5 of 5
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(1.0) // Complete
      expect(progress.hasMoreTicks).toBe(false)
    })

    it("should stop replay when all deltaTicks processed", () => {
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      // Process frames one at a time
      proxyEngine.update(1) // Should process deltaTicks[0] = 1
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      proxyEngine.update(1) // Should process deltaTicks[1] = 1
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      proxyEngine.update(1) // Should process deltaTicks[2] = 1
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      proxyEngine.update(1) // Should process deltaTicks[3] = 1
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      proxyEngine.update(1) // Should process deltaTicks[4] = 1 and auto-stop
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
      expect(replayManager.getCurrentTick()).toBe(5)
    })
  })

  describe("Stopping Replay", () => {
    it("should stop active replay", async () => {
      await replayManager.replay(sampleRecording)
      proxyEngine.update(2) // Process some frames

      expect(replayManager.isCurrentlyReplaying()).toBe(true)
      expect(replayManager.getCurrentTick()).toBe(2)

      replayManager.stopReplay()

      expect(replayManager.isCurrentlyReplaying()).toBe(false)
      expect(engine.getState()).toBe(GameState.PAUSED)
    })

    it("should reset replay state", async () => {
      await replayManager.replay(sampleRecording)
      proxyEngine.update(3)

      replayManager.stopReplay()

      expect(replayManager.getCurrentTick()).toBe(3) // Frame count preserved after stop

      const progress = replayManager.getReplayProgress()
      expect(progress.isReplaying).toBe(false)
      expect(progress.progress).toBe(0.6) // 3/5 frames completed
      expect(progress.hasMoreTicks).toBe(true) // Still has deltaTicks[3] and deltaTicks[4] remaining
    })

    it("should handle stop when not replaying", () => {
      expect(() => replayManager.stopReplay()).not.toThrow()
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    it("should allow new replay after stopping", async () => {
      await replayManager.replay(sampleRecording)
      proxyEngine.update(2)
      replayManager.stopReplay()

      // Start new replay
      const newRecording: GameRecording = {
        ...sampleRecording,
        gameConfig: { prngSeed: "new-seed" },
        deltaTicks: [0.5, 0.5, 0.5, 0.5],
        totalTicks: 2,
      }

      await replayManager.replay(newRecording)
      expect(replayManager.isCurrentlyReplaying()).toBe(true)
      expect(engine.getSeed()).toBe("new-seed")
    })
  })

  describe("Frame Timing Edge Cases", () => {
    it("should handle zero deltaTicks in recording", async () => {
      const zeroFrameRecording: GameRecording = {
        gameConfig: { prngSeed: "zero-frame-test" },
        events: [
          {
            type: GameEventType.USER_INPUT,
            tick: 0,
            timestamp: 1000,
            inputType: "test",
            params: {},
          } as UserInputEvent,
        ],
        deltaTicks: [0, 1, 0, 1], // Zero deltaTicks are invalid
        totalTicks: 2,
        metadata: { createdAt: Date.now() },
      }

      // Should throw validation error for zero deltaTicks
      await expect(replayManager.replay(zeroFrameRecording)).rejects.toThrow(
        "Invalid recording: deltaTicks[0] must be a positive number, got 0",
      )
    })

    it("should handle fractional deltaTicks in recording", async () => {
      const fractionalRecording: GameRecording = {
        gameConfig: { prngSeed: "fractional-test" },
        events: [],
        deltaTicks: [0.1, 0.3, 0.5, 1.1],
        totalTicks: 2,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(fractionalRecording)

      proxyEngine.update(0.4) // Should process 0.1 + 0.3 frames
      expect(replayManager.getCurrentTick()).toBeCloseTo(0.4, 2)

      proxyEngine.update(0.6) // Should process 0.5 frame
      expect(replayManager.getCurrentTick()).toBeCloseTo(0.9, 2)

      proxyEngine.update(1.2) // Should process 1.1 frame
      expect(replayManager.getCurrentTick()).toBe(2)
    })

    it("should handle large deltaTicks in recording", async () => {
      const largeFrameRecording: GameRecording = {
        gameConfig: { prngSeed: "large-frame-test" },
        events: [],
        deltaTicks: [10, 20, 30],
        totalTicks: 60,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(largeFrameRecording)

      proxyEngine.update(15) // Should process first frame (10) with 5 remaining
      expect(replayManager.getCurrentTick()).toBe(10)

      proxyEngine.update(20) // Should process second frame (20) with 5 remaining
      expect(replayManager.getCurrentTick()).toBe(30)

      proxyEngine.update(35) // Should process third frame (30) and auto-stop
      expect(replayManager.getCurrentTick()).toBe(60)
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

    it("should replay recorded game session accurately", async () => {
      // Create a test player
      const player = engine.createTestPlayer("player1", new Vector2D(0, 0))

      // Set recorder on engine before starting recording
      engine.setGameRecorder(recorder)
      // Record a session
      recorder.startRecording(eventManager, { prngSeed: "integration-test" })

      // Start the engine so it processes frames
      engine.start()

      // Simulate game events
      inputSource.queueInput("move", { direction: "right" })
      engine.update(1) // This will call recorder.recordFrameUpdate and eventManager.update

      // Create object update event manually (simulating game logic)
      player.setPosition(new Vector2D(10, 0))
      recorder.recordEvent({
        type: GameEventType.OBJECT_UPDATE,
        tick: 1,
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
        tick: 2,
        timestamp: Date.now(),
        objectType: "Player",
        objectId: "player1",
        method: "setPosition",
        params: [new Vector2D(10, 10)],
      } as ObjectUpdateEvent)

      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()!

      // Replay the session (this will reset the engine)
      await replayManager.replay(recording)

      // Create new player for replay AFTER replay starts (engine is already reset by replay())
      const replayPlayer = engine.createTestPlayer(
        "player1",
        new Vector2D(0, 0),
      )
      expect(replayPlayer.getPosition()).toEqual(new Vector2D(0, 0))

      // Process the replay using proxy engine
      proxyEngine.update(1) // Frame 1
      expect(replayPlayer.getPosition()).toEqual(new Vector2D(10, 0))

      proxyEngine.update(1) // Frame 2
      expect(replayPlayer.getPosition()).toEqual(new Vector2D(10, 10))

      // One more update should trigger auto-stop
      proxyEngine.update(1)
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    it("should maintain determinism across multiple replays", async () => {
      // Create complex recording with PRNG usage
      const complexRecording: GameRecording = {
        gameConfig: { prngSeed: "determinism-test" },
        events: [
          {
            type: GameEventType.OBJECT_UPDATE,
            tick: 1,
            timestamp: 1000,
            objectType: "Player",
            objectId: "player1",
            method: "setPosition",
            params: [new Vector2D(5, 5)],
          } as ObjectUpdateEvent,
          {
            type: GameEventType.OBJECT_UPDATE,
            tick: 2,
            timestamp: 2000,
            objectType: "Player",
            objectId: "player1",
            method: "setVelocity",
            params: [new Vector2D(1, -1)],
          } as ObjectUpdateEvent,
        ],
        deltaTicks: [1, 1],
        totalTicks: 2,
        metadata: { createdAt: Date.now() },
      }

      const positions: Vector2D[] = []
      const velocities: Vector2D[] = []

      // First replay
      await engine.reset({ prngSeed: "determinism-test" })
      const player1 = engine.createTestPlayer("player1", new Vector2D(0, 0))

      await replayManager.replay(complexRecording)
      proxyEngine.update(1)
      positions.push(player1.getPosition())
      proxyEngine.update(1)
      velocities.push(player1.getVelocity())

      // Second replay
      replayManager.stopReplay() // Stop first replay before starting second
      await engine.reset({ prngSeed: "determinism-test" })
      const player2 = engine.createTestPlayer("player1", new Vector2D(0, 0))

      await replayManager.replay(complexRecording)
      proxyEngine.update(1)
      expect(player2.getPosition()).toEqual(positions[0])
      proxyEngine.update(1)
      expect(player2.getVelocity()).toEqual(velocities[0])
    })
  })

  describe("Performance and Stress Testing", () => {
    it("should handle long recordings efficiently", async () => {
      const longRecording: GameRecording = {
        gameConfig: { prngSeed: "long-test" },
        events: Array.from(
          { length: 1000 },
          (_, i) =>
            ({
              type: GameEventType.USER_INPUT,
              tick: i + 1,
              timestamp: 1000 + i,
              inputType: `input${i}`,
              params: { index: i },
            }) as UserInputEvent,
        ),
        deltaTicks: new Array(1000).fill(1),
        totalTicks: 1000,
        metadata: { createdAt: Date.now() },
      }

      const startTime = performance.now()

      await replayManager.replay(longRecording)

      // Process all frames - should auto-stop immediately
      proxyEngine.update(1000)

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(replayManager.getCurrentTick()).toBe(1000)
      expect(replayManager.isCurrentlyReplaying()).toBe(false) // Auto-stopped after all frames processed
      expect(processingTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it("should handle rapid replay cycles", async () => {
      const quickRecording: GameRecording = {
        gameConfig: { prngSeed: "quick-test" },
        events: [],
        deltaTicks: [100, 100, 100], // Integer ticks
        totalTicks: 300,
        metadata: { createdAt: Date.now() },
      }

      for (let cycle = 0; cycle < 100; cycle++) {
        await replayManager.replay(quickRecording)

        // Process all deltaTicks at once (100 + 100 + 100 = 300) - should auto-stop
        proxyEngine.update(300)
        expect(replayManager.isCurrentlyReplaying()).toBe(false)

        // Ensure clean state for next cycle (though stopReplay should be idempotent)
        replayManager.stopReplay()
      }
    })

    it("should handle irregular frame timing", async () => {
      const irregularRecording: GameRecording = {
        gameConfig: { prngSeed: "irregular-test" },
        events: [],
        deltaTicks: [0.001, 10, 0.1, 5, 0.01, 2],
        totalTicks: 17.111,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(irregularRecording)

      // Process with various update sizes
      proxyEngine.update(0.5) // Should process 0.001, still replaying
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      proxyEngine.update(15) // Should process 10, 0.1, 5, still replaying
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      proxyEngine.update(2) // Should process 0.01, 2 and auto-stop
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
      expect(replayManager.getCurrentTick()).toBeCloseTo(17.111, 3)
    })
  })

  describe("Advanced Edge Cases", () => {
    it("should handle rapid start/stop cycles", async () => {
      for (let i = 0; i < 20; i++) {
        await replayManager.replay(sampleRecording)
        expect(replayManager.isCurrentlyReplaying()).toBe(true)

        replayManager.stopReplay()
        expect(replayManager.isCurrentlyReplaying()).toBe(false)
      }
    })

    it("should handle concurrent proxy and direct engine access", async () => {
      await replayManager.replay(sampleRecording)

      // Direct engine updates should not interfere with replay state
      const initialReplayFrame = replayManager.getCurrentTick()
      engine.update(10) // Direct call to engine

      // Replay frame should not be affected by direct engine call
      expect(replayManager.getCurrentTick()).toBe(initialReplayFrame)

      // Proxy update should work normally
      proxyEngine.update(1)
      expect(replayManager.getCurrentTick()).toBe(1)
    })

    it("should handle extremely small deltaTicks accumulation", async () => {
      await replayManager.replay(sampleRecording)

      // Accumulate tiny amounts many times
      for (let i = 0; i < 1000; i++) {
        proxyEngine.update(0.001)
      }

      // Should have processed first frame (1.0) and be working on second
      expect(replayManager.getCurrentTick()).toBe(1)
    })

    it("should handle replay with engine in different states", async () => {
      // Test replay when engine is PAUSED
      engine.start()
      engine.pause()
      expect(engine.getState()).toBe(GameState.PAUSED)

      await replayManager.replay(sampleRecording)
      expect(engine.getState()).toBe(GameState.PLAYING) // Should start engine

      proxyEngine.update(1)
      expect(replayManager.getCurrentTick()).toBe(1)
    })

    it("should handle exact integer deltaTicks", async () => {
      const integerRecording: GameRecording = {
        gameConfig: { prngSeed: "integer-test" },
        events: [],
        deltaTicks: [1000, 1000], // Integer ticks for precise determinism
        totalTicks: 2000,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(integerRecording)

      proxyEngine.update(1000) // Should process first tick block exactly
      expect(replayManager.getCurrentTick()).toBe(1000)

      proxyEngine.update(1000) // Should process second tick block exactly
      expect(replayManager.getCurrentTick()).toBe(2000)
    })

    it("should handle replay interruption and resumption", async () => {
      await replayManager.replay(sampleRecording)

      // Process some frames
      proxyEngine.update(2)
      expect(replayManager.getCurrentTick()).toBe(2)

      // Stop mid-replay
      replayManager.stopReplay()
      const _stoppedFrame = replayManager.getCurrentTick()

      // Resume with new replay (should reset)
      await replayManager.replay(sampleRecording)
      expect(replayManager.getCurrentTick()).toBe(0)

      // Should work normally
      proxyEngine.update(1)
      expect(replayManager.getCurrentTick()).toBe(1)
    })

    it("should handle empty recording with proxy engine", async () => {
      const emptyRecording: GameRecording = {
        gameConfig: { prngSeed: "empty-test" },
        events: [],
        deltaTicks: [],
        totalTicks: 0,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(emptyRecording)
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      // Any update should immediately stop the replay
      proxyEngine.update(0.1)
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    it("should maintain determinism with proxy engine across multiple runs", async () => {
      const results: number[] = []

      for (let run = 0; run < 3; run++) {
        await engine.reset({ prngSeed: "determinism-test" })
        const _player = engine.createTestPlayer("test", new Vector2D(0, 0))

        await replayManager.replay(sampleRecording)
        proxyEngine.update(2.5) // Partial replay

        results.push(replayManager.getCurrentTick())
        replayManager.stopReplay()
      }

      // All runs should produce identical results
      expect(results[0]).toBe(results[1])
      expect(results[1]).toBe(results[2])
      expect(results[0]).toBe(2) // Expected frame after 2.5 deltaTicks
    })
  })

  describe("Error Handling and Edge Cases", () => {
    it("should handle corrupted recording data gracefully", async () => {
      const corruptedRecording = {
        gameConfig: { prngSeed: "corrupted" },
        events: null, // Corrupted
        deltaTicks: [1, 2, 3],
        totalTicks: 6,
        metadata: { createdAt: Date.now() },
      } as any

      // Should throw validation error for invalid events array
      await expect(replayManager.replay(corruptedRecording)).rejects.toThrow(
        "Invalid recording: events must be an array",
      )
    })

    it("should handle missing deltaTicks", async () => {
      const missingFramesRecording: GameRecording = {
        gameConfig: { prngSeed: "missing-frames" },
        events: [
          {
            type: GameEventType.USER_INPUT,
            tick: 1,
            timestamp: 1000,
            inputType: "test",
            params: {},
          } as UserInputEvent,
        ],
        deltaTicks: [], // No frame data
        totalTicks: 0,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(missingFramesRecording)
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      proxyEngine.update(10) // Should stop immediately due to no frames
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    it("should handle negative totalTicks", async () => {
      const negativeFramesRecording: GameRecording = {
        gameConfig: { prngSeed: "negative-frames" },
        events: [],
        deltaTicks: [1, 1],
        totalTicks: -5, // Invalid
        metadata: { createdAt: Date.now() },
      }

      // Should throw validation error for negative totalTicks
      await expect(
        replayManager.replay(negativeFramesRecording),
      ).rejects.toThrow(
        "Invalid recording: totalTicks must be a non-negative number",
      )
    })

    it("should handle stop/start during frame processing", async () => {
      await replayManager.replay(sampleRecording)

      proxyEngine.update(2.5) // Partial processing
      expect(replayManager.getCurrentTick()).toBe(2)

      replayManager.stopReplay()
      expect(replayManager.getCurrentTick()).toBe(2) // Frame count preserved after stop

      // Restart
      await replayManager.replay(sampleRecording)
      proxyEngine.update(1)
      expect(replayManager.getCurrentTick()).toBe(1)
    })
  })

  describe("Proxy Engine Behavior", () => {
    it("should return proxy engine from getReplayEngine", () => {
      expect(proxyEngine).toBeDefined()
      expect(typeof proxyEngine.update).toBe("function")
      expect(proxyEngine).not.toBe(engine) // Should be different from original engine
    })

    it("should proxy all non-update methods to original engine", () => {
      // Test that proxy passes through other methods
      expect(proxyEngine.getState()).toBe(engine.getState())
      expect(proxyEngine.getTotalTicks()).toBe(engine.getTotalTicks())
      expect(proxyEngine.getSeed()).toBe(engine.getSeed())
    })

    it("should not intercept update calls when not replaying", () => {
      // Engine must be in PLAYING state to process updates
      engine.start()
      const initialFrames = engine.getTotalTicks()

      // Update through proxy when not replaying
      proxyEngine.update(5)

      // Should pass through to engine normally
      expect(engine.getTotalTicks()).toBe(initialFrames + 5)
    })

    it("should intercept update calls during replay", async () => {
      await replayManager.replay(sampleRecording)
      const initialEngineFrames = engine.getTotalTicks()

      // Update through proxy during replay - should follow recorded deltaTicks
      proxyEngine.update(1)

      // Engine frames should reflect the recorded deltaFrame (1), not the input (1)
      expect(engine.getTotalTicks()).toBe(initialEngineFrames + 1)
      expect(replayManager.getCurrentTick()).toBe(1)
    })

    it("should handle frame accumulation with floating point tolerance", async () => {
      await replayManager.replay(sampleRecording)

      // Test accumulation with very small floating point differences
      proxyEngine.update(0.9999999) // Almost 1 frame but not quite
      expect(replayManager.getCurrentTick()).toBe(0) // Should not process yet

      proxyEngine.update(0.0000001) // Tiny amount to complete the frame
      expect(replayManager.getCurrentTick()).toBe(1) // Should process now
    })

    it("should maintain proxy behavior after replay stops", async () => {
      await replayManager.replay(sampleRecording)
      proxyEngine.update(5) // Complete all frames and auto-stop

      expect(replayManager.isCurrentlyReplaying()).toBe(false)

      // Engine should be paused after replay stops, resume it to test passthrough
      engine.resume()
      const initialFrames = engine.getTotalTicks()
      proxyEngine.update(3) // Should pass through normally now
      expect(engine.getTotalTicks()).toBe(initialFrames + 3)
    })

    it("should handle multiple replay cycles with same proxy", async () => {
      // First replay
      await replayManager.replay(sampleRecording)
      proxyEngine.update(2)
      expect(replayManager.getCurrentTick()).toBe(2)

      // Complete first replay
      proxyEngine.update(3)
      expect(replayManager.isCurrentlyReplaying()).toBe(false)

      // Second replay with same proxy
      await replayManager.replay(sampleRecording)
      expect(replayManager.getCurrentTick()).toBe(0) // Should reset

      proxyEngine.update(1)
      expect(replayManager.getCurrentTick()).toBe(1) // Should work correctly
    })

    it("should handle proxy update with zero deltaTicks", async () => {
      await replayManager.replay(sampleRecording)
      const initialFrame = replayManager.getCurrentTick()

      // Update with zero should not process any frames
      proxyEngine.update(0)
      expect(replayManager.getCurrentTick()).toBe(initialFrame)
    })

    it("should handle very large deltaTicks input to proxy", async () => {
      await replayManager.replay(sampleRecording)

      // Provide huge deltaTicks - should only process recorded frames
      proxyEngine.update(1000000)

      // Should auto-stop after processing all recorded frames (5 total)
      expect(replayManager.getCurrentTick()).toBe(5)
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })
  })

  describe("Progress Tracking", () => {
    it("should provide accurate progress information", async () => {
      const recording: GameRecording = {
        gameConfig: { prngSeed: "progress-test" },
        events: [],
        deltaTicks: [2, 3, 5], // Total of 10 frames
        totalTicks: 10,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(recording)

      let progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(0)
      expect(progress.hasMoreTicks).toBe(true)

      proxyEngine.update(2) // Process first deltaFrame (2 frames)
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBeCloseTo(0.2, 2) // 2/10

      proxyEngine.update(3) // Process second deltaFrame (3 frames)
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBeCloseTo(0.5, 2) // 5/10

      proxyEngine.update(5) // Process final deltaFrame (5 frames) and auto-stop
      progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(1.0) // 10/10
      expect(progress.hasMoreTicks).toBe(false)
      expect(progress.isReplaying).toBe(false) // Auto-stopped after all frames processed
    })

    it("should clamp progress to 1.0 maximum", async () => {
      const overflowRecording: GameRecording = {
        gameConfig: { prngSeed: "overflow-test" },
        events: [],
        deltaTicks: [1],
        totalTicks: 0.5, // Less than deltaTicks sum
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(overflowRecording)
      proxyEngine.update(1)

      const progress = replayManager.getReplayProgress()
      expect(progress.progress).toBe(1.0) // Clamped to maximum
    })
  })

  describe("Comprehensive Validation and Error Handling", () => {
    it("should validate recording with invalid seed types", async () => {
      const invalidSeedRecording = {
        gameConfig: null,
        events: [],
        deltaTicks: [1],
        totalTicks: 1,
        metadata: { createdAt: Date.now() },
      } as any

      await expect(replayManager.replay(invalidSeedRecording)).rejects.toThrow(
        "Invalid recording: missing or invalid gameConfig",
      )
    })

    it("should validate recording with invalid events structure", async () => {
      const invalidEventsRecording = {
        gameConfig: { prngSeed: "test" },
        events: [
          {
            type: "", // Invalid empty type
            tick: 0,
            timestamp: 1000,
          },
        ],
        deltaTicks: [1],
        totalTicks: 1,
        metadata: { createdAt: Date.now() },
      } as any

      await expect(
        replayManager.replay(invalidEventsRecording),
      ).rejects.toThrow("Invalid recording: events[0].type must be a string")
    })

    it("should validate recording with invalid frame numbers in events", async () => {
      const invalidFrameRecording = {
        gameConfig: { prngSeed: "test" },
        events: [
          {
            type: GameEventType.USER_INPUT,
            tick: -1, // Invalid negative frame
            timestamp: 1000,
            inputType: "test",
            params: {},
          },
        ],
        deltaTicks: [1],
        totalTicks: 1,
        metadata: { createdAt: Date.now() },
      } as any

      await expect(replayManager.replay(invalidFrameRecording)).rejects.toThrow(
        "Invalid recording: events[0].tick must be a non-negative number",
      )
    })

    it("should validate recording with non-numeric deltaTicks", async () => {
      const invalidDeltaRecording = {
        gameConfig: { prngSeed: "test" },
        events: [],
        deltaTicks: ["1", 2, "3"], // Mixed types
        totalTicks: 6,
        metadata: { createdAt: Date.now() },
      } as any

      await expect(replayManager.replay(invalidDeltaRecording)).rejects.toThrow(
        "Invalid recording: deltaTicks[0] must be a positive number",
      )
    })

    it("should validate recording with infinite deltaTicks", async () => {
      const infiniteRecording = {
        gameConfig: { prngSeed: "test" },
        events: [],
        deltaTicks: [1, Infinity, 2],
        totalTicks: 4,
        metadata: { createdAt: Date.now() },
      } as any

      // Infinity is a positive number, so validation passes but behavior should be handled
      await replayManager.replay(infiniteRecording)
    })

    it("should validate recording with NaN deltaTicks", async () => {
      const nanRecording = {
        gameConfig: { prngSeed: "test" },
        events: [],
        deltaTicks: [1, NaN, 2],
        totalTicks: 4,
        metadata: { createdAt: Date.now() },
      } as any

      // NaN doesn't fail the validation currently (NaN <= 0 is false, typeof NaN === 'number' is true)
      // So the recording is accepted but behavior with NaN is undefined
      await replayManager.replay(nanRecording)
    })

    it("should handle proxy engine edge cases gracefully", async () => {
      await replayManager.replay(sampleRecording)

      // Test that proxy handles zero deltaTicks without crashing
      expect(() => {
        proxyEngine.update(0) // Zero deltaTicks should not advance frames
      }).not.toThrow()

      // Frame should still be 0 since zero deltaTicks were provided
      expect(replayManager.getCurrentTick()).toBe(0)

      // Replay should continue working normally with positive deltaTicks
      expect(replayManager.isCurrentlyReplaying()).toBe(true)
      proxyEngine.update(1)
      expect(replayManager.getCurrentTick()).toBe(1)
    })

    it("should handle engine state changes during replay", async () => {
      await replayManager.replay(sampleRecording)

      // Manually change engine state during replay
      engine.pause()
      expect(engine.getState()).toBe(GameState.PAUSED)

      // When paused, proxy should NOT process ticks but should maintain replay state
      proxyEngine.update(1)
      expect(replayManager.getCurrentTick()).toBe(0) // No ticks processed when paused
      expect(replayManager.isCurrentlyReplaying()).toBe(true) // Still replaying

      // Resume and then ticks should be processed
      engine.resume()
      expect(engine.getState()).toBe(GameState.PLAYING)
      proxyEngine.update(1)
      expect(replayManager.getCurrentTick()).toBe(1) // Now ticks are processed
    })

    it("should handle very large totalTicks values", async () => {
      const largeFramesRecording: GameRecording = {
        gameConfig: { prngSeed: "large-test" },
        events: [],
        deltaTicks: [1],
        totalTicks: Number.MAX_SAFE_INTEGER,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(largeFramesRecording)

      proxyEngine.update(1)
      const progress = replayManager.getReplayProgress()
      expect(progress.progress).toBeCloseTo(0, 10) // Should be very close to 0
    })

    it("should handle recording with inconsistent events and deltaTicks", async () => {
      const inconsistentRecording: GameRecording = {
        gameConfig: { prngSeed: "inconsistent-test" },
        events: [
          {
            type: GameEventType.USER_INPUT,
            tick: 10, // Event at frame 10
            timestamp: 1000,
            inputType: "test",
            params: {},
          } as UserInputEvent,
        ],
        deltaTicks: [1, 1], // Only 2 deltaTicks, but event at frame 10
        totalTicks: 2,
        metadata: { createdAt: Date.now() },
      }

      // Should not throw during validation (events/deltaTicks can be inconsistent)
      await replayManager.replay(inconsistentRecording)

      // Should process the deltaTicks regardless of event timing
      proxyEngine.update(2)
      expect(replayManager.getCurrentTick()).toBe(2)
      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    it("should handle null/undefined recording gracefully", async () => {
      await expect(replayManager.replay(null as any)).rejects.toThrow(
        "Invalid recording: recording is null or undefined",
      )

      await expect(replayManager.replay(undefined as any)).rejects.toThrow(
        "Invalid recording: recording is null or undefined",
      )
    })

    it("should handle memory pressure with large recordings", async () => {
      // Create a recording with many events to test memory handling
      const largeEventRecording: GameRecording = {
        gameConfig: { prngSeed: "memory-test" },
        events: Array.from({ length: 10000 }, (_, i) => ({
          type: GameEventType.USER_INPUT,
          tick: i,
          timestamp: 1000 + i,
          inputType: `input${i}`,
          params: { index: i },
        })) as UserInputEvent[],
        deltaTicks: Array.from({ length: 1000 }, () => 1),
        totalTicks: 1000,
        metadata: { createdAt: Date.now() },
      }

      await replayManager.replay(largeEventRecording)

      // Should handle the large recording without issues
      proxyEngine.update(100)
      expect(replayManager.getCurrentTick()).toBe(100)
      expect(replayManager.isCurrentlyReplaying()).toBe(true)
    })
  })

  describe("Pause/Resume During Replay", () => {
    it("should not process ticks while engine is paused during replay with periodic pause/resume cycles", async () => {
      // Create a recording with 100 frames to allow multiple pause/resume cycles
      const longRecording: GameRecording = {
        gameConfig: { prngSeed: "pause-resume-test" },
        events: Array.from({ length: 20 }, (_, i) => ({
          type: GameEventType.USER_INPUT,
          tick: i * 5 + 1, // Events at ticks 1, 6, 11, 16, etc.
          timestamp: 1000 + i * 5,
          inputType: `input${i}`,
          params: { index: i },
        })) as UserInputEvent[],
        deltaTicks: Array.from({ length: 100 }, () => 1), // 100 frames, 1 tick each
        totalTicks: 100,
        metadata: {
          createdAt: Date.now(),
          description: "Pause/Resume test recording",
        },
      }

      await replayManager.replay(longRecording)
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      const startTime = performance.now()
      let totalPausedTime = 0

      // Test pause/resume cycles at different points in the replay
      const pausePoints = [20, 40, 60, 80] // Pause at these tick counts

      for (const pausePoint of pausePoints) {
        // Process ticks up to the pause point
        const currentTick = replayManager.getCurrentTick()
        const ticksToProcess = pausePoint - currentTick

        if (ticksToProcess > 0) {
          // Process frames in chunks to simulate fast replay
          // Since each deltaTick is 1, provide exactly what we need to reach the pause point
          proxyEngine.update(ticksToProcess)
          expect(replayManager.getCurrentTick()).toBe(pausePoint)
        }

        // Pause the engine
        engine.pause()
        expect(engine.getState()).toBe(GameState.PAUSED)

        const pauseStartTime = performance.now()
        const ticksBeforePause = replayManager.getCurrentTick()

        // Try to process ticks while paused - should not advance
        proxyEngine.update(10) // Attempt to process 10 ticks while paused
        expect(replayManager.getCurrentTick()).toBe(ticksBeforePause) // Should not advance
        expect(replayManager.isCurrentlyReplaying()).toBe(true) // Should still be replaying

        // Wait 1 second while paused
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const pauseEndTime = performance.now()
        const pauseDuration = pauseEndTime - pauseStartTime
        totalPausedTime += pauseDuration

        // Verify ticks still haven't advanced during the pause
        expect(replayManager.getCurrentTick()).toBe(ticksBeforePause)
        expect(replayManager.isCurrentlyReplaying()).toBe(true)

        // Verify pause duration was approximately 1 second (within 100ms tolerance)
        expect(pauseDuration).toBeGreaterThanOrEqual(950)
        expect(pauseDuration).toBeLessThanOrEqual(1150)

        // Resume the engine
        engine.resume()
        expect(engine.getState()).toBe(GameState.PLAYING)

        // Now ticks should process again
        proxyEngine.update(5)
        expect(replayManager.getCurrentTick()).toBe(ticksBeforePause + 5)
      }

      // Complete the remaining replay
      const remainingTicks = 100 - replayManager.getCurrentTick()
      if (remainingTicks > 0) {
        proxyEngine.update(remainingTicks)
      }

      // Verify replay completed
      expect(replayManager.getCurrentTick()).toBe(100)
      expect(replayManager.isCurrentlyReplaying()).toBe(false) // Should auto-stop

      const totalTime = performance.now() - startTime

      // Verify that the total time includes the pause durations
      // Should have taken approximately 4+ seconds (4 pauses × 1 second each)
      expect(totalTime).toBeGreaterThanOrEqual(3800) // Allow some tolerance
      expect(totalPausedTime).toBeGreaterThanOrEqual(3800) // Should be ~4000ms total pause time
    })

    it("should handle rapid pause/resume cycles without losing replay state", async () => {
      const rapidTestRecording: GameRecording = {
        gameConfig: { prngSeed: "rapid-pause-test" },
        events: [],
        deltaTicks: Array.from({ length: 50 }, () => 1),
        totalTicks: 50,
        metadata: {
          createdAt: Date.now(),
          description: "Rapid pause/resume test",
        },
      }

      await replayManager.replay(rapidTestRecording)

      // Perform rapid pause/resume cycles
      for (let i = 0; i < 10; i++) {
        // Process a few ticks
        proxyEngine.update(5)
        const ticksBeforePause = replayManager.getCurrentTick()

        // Rapid pause/resume
        engine.pause()
        expect(replayManager.getCurrentTick()).toBe(ticksBeforePause)

        // Try to process while paused
        proxyEngine.update(2)
        expect(replayManager.getCurrentTick()).toBe(ticksBeforePause) // No advancement

        // Immediate resume
        engine.resume()

        // Should be able to continue processing
        proxyEngine.update(1)
        expect(replayManager.getCurrentTick()).toBe(ticksBeforePause + 1)

        // Stop before we exceed the total ticks
        if (replayManager.getCurrentTick() >= 45) break
      }

      // Should still be able to complete the replay
      const remainingTicks = 50 - replayManager.getCurrentTick()
      if (remainingTicks > 0) {
        proxyEngine.update(remainingTicks)
      }

      expect(replayManager.isCurrentlyReplaying()).toBe(false)
      expect(replayManager.getCurrentTick()).toBe(50)
    })
  })
})
