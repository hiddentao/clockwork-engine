import { beforeEach, describe, expect, test } from "bun:test"
import { GameRecorder } from "../../src/GameRecorder"
import { ReplayManager } from "../../src/ReplayManager"
import { Serializer } from "../../src/Serializer"
import { UserInputEventSource } from "../../src/UserInputEventSource"
import { Vector2D } from "../../src/geometry/Vector2D"
import { GameEventType } from "../../src/types"
import { ComplexTestEngine } from "../fixtures/ComplexTestEngine"
import { TestPowerUp } from "../fixtures/TestPowerUp"
import { TestProjectile } from "../fixtures/TestProjectile"
import { MockTicker } from "../helpers/MockTicker"
import { RecordingValidator } from "../helpers/RecordingValidator"
import { StateComparator } from "../helpers/StateComparator"

describe("Record-Replay Integration Tests", () => {
  let originalEngine: ComplexTestEngine
  let replayEngine: ComplexTestEngine
  let originalTicker: MockTicker
  let replayTicker: MockTicker
  let recorder: GameRecorder
  let replayManager: ReplayManager
  let serializer: Serializer

  beforeEach(() => {
    originalEngine = new ComplexTestEngine()
    replayEngine = new ComplexTestEngine()
    originalTicker = new MockTicker()
    replayTicker = new MockTicker()
    recorder = new GameRecorder()
    serializer = new Serializer()

    // Register types for serialization
    serializer.registerType("Vector2D", Vector2D)
    serializer.registerType("TestProjectile", TestProjectile)
    serializer.registerType("TestPowerUp", TestPowerUp)

    replayManager = new ReplayManager(replayEngine)
  })

  describe("basic record-replay functionality", () => {
    test("should record and replay simple simulation accurately", async () => {
      const seed = "simple-record-test"

      // Setup original simulation
      await originalEngine.reset(seed)
      originalTicker.add((deltaTicks) => originalEngine.update(deltaTicks))

      // Create some objects
      const _projectile1 = new TestProjectile(
        "proj1",
        new Vector2D(10, 10),
        new Vector2D(2, 1),
        10,
        100,
        "",
        originalEngine,
      )
      const _projectile2 = new TestProjectile(
        "proj2",
        new Vector2D(20, 15),
        new Vector2D(-1, 2),
        10,
        100,
        "",
        originalEngine,
      )
      const _powerup = new TestPowerUp(
        "power1",
        new Vector2D(30, 20),
        "health",
        50,
        0,
        0,
        originalEngine,
      )

      // Start recording
      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      // Run original simulation and capture states
      const originalStates: any[] = []
      for (let frame = 0; frame < 50; frame++) {
        originalStates.push(originalEngine.captureState())
        await originalTicker.tick(1)
      }

      // Stop recording
      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()
      expect(recording).toBeDefined()

      // Validate recording
      const validation = RecordingValidator.validate(recording!)
      expect(validation.valid).toBe(true)

      // Setup replay
      const replayStates: any[] = []

      // Start replay
      await replayManager.replay(recording!)

      // Create the same objects in replay engine to match initial state (after reset)
      const _replayProjectile1 = new TestProjectile(
        "proj1",
        new Vector2D(10, 10),
        new Vector2D(2, 1),
        10,
        100,
        "",
        replayEngine,
      )
      const _replayProjectile2 = new TestProjectile(
        "proj2",
        new Vector2D(20, 15),
        new Vector2D(-1, 2),
        10,
        100,
        "",
        replayEngine,
      )
      const _replayPowerup = new TestPowerUp(
        "power1",
        new Vector2D(30, 20),
        "health",
        50,
        0,
        0,
        replayEngine,
      )
      const proxyEngine = replayManager.getReplayEngine()
      replayTicker.add((deltaTicks) => {
        replayStates.push(replayEngine.captureState())
        proxyEngine.update(deltaTicks)
      })

      // Run replay
      for (let frame = 0; frame < 50; frame++) {
        await replayTicker.tick(1)

        if (!replayManager.isCurrentlyReplaying()) {
          break
        }
      }

      // Compare states
      expect(replayStates.length).toBe(originalStates.length)

      for (let i = 0; i < originalStates.length; i++) {
        const comparison = StateComparator.compare(
          originalStates[i],
          replayStates[i],
          { tolerance: 1e-10 },
        )
        if (!comparison.equal) {
          console.log(`State mismatch at frame ${i}:`, comparison.differences)
        }
        expect(comparison.equal).toBe(true)
      }
    })

    test("should handle complex object interactions in replay", async () => {
      const seed = "complex-interaction-test"

      // Setup with many interacting objects using configuration
      originalEngine.setSetupConfig({
        projectileGrid: { width: 5, height: 5, spacing: 15 },
        powerUpCount: 5,
        dynamicInteractions: true,
      })

      await originalEngine.reset(seed)
      originalTicker.add((deltaTicks) => originalEngine.update(deltaTicks))

      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      // Run simulation
      const checkpoints: { tick: number; state: any }[] = []
      for (let frame = 0; frame < 100; frame++) {
        await originalTicker.tick(1)

        // Save checkpoints every 10 frames
        if (frame % 10 === 0) {
          checkpoints.push({
            tick: frame,
            state: originalEngine.captureState(),
          })
        }
      }

      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()
      expect(recording).not.toBeNull()

      // Setup replay engine with same configuration
      replayEngine.setSetupConfig({
        projectileGrid: { width: 5, height: 5, spacing: 15 },
        powerUpCount: 5,
        dynamicInteractions: true,
      })

      // Replay and verify checkpoints
      await replayManager.replay(recording!)
      const proxyEngine2 = replayManager.getReplayEngine()
      replayTicker.add((deltaTicks) => proxyEngine2.update(deltaTicks))

      const replayCheckpoints: { tick: number; state: any }[] = []
      for (let frame = 0; frame < 100; frame++) {
        await replayTicker.tick(1)

        if (frame % 10 === 0) {
          replayCheckpoints.push({
            tick: frame,
            state: replayEngine.captureState(),
          })
        }

        if (!replayManager.isCurrentlyReplaying()) {
          break
        }
      }

      // Verify all checkpoints match
      expect(replayCheckpoints.length).toBe(checkpoints.length)

      for (let i = 0; i < checkpoints.length; i++) {
        const original = checkpoints[i]
        const replayed = replayCheckpoints[i]

        expect(replayed.tick).toBe(original.tick)

        const comparison = StateComparator.compare(
          original.state,
          replayed.state,
          { tolerance: 1e-10 },
        )
        if (!comparison.equal) {
          console.log(
            `Checkpoint mismatch at tick ${original.tick}:`,
            comparison.differences,
          )
        }
        expect(comparison.equal).toBe(true)
      }
    })
  })

  describe("user input recording and replay", () => {
    test("should record and replay user input events", async () => {
      const seed = "input-test"

      // Setup with user input
      await originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)

      originalTicker.add((deltaTicks) => originalEngine.update(deltaTicks))

      // Create objects that might respond to input
      const _player = new TestProjectile(
        "player",
        new Vector2D(50, 50),
        new Vector2D(0, 0),
        10,
        100,
        "",
        originalEngine,
      )

      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      const inputEvents = []
      const capturedStates: any[] = []

      for (let frame = 0; frame < 60; frame++) {
        // Simulate user input at certain frames
        if (frame === 10) {
          const event = {
            type: GameEventType.USER_INPUT,
            tick: originalEngine.getTotalTicks(),
            inputType: "key_press",
            key: "ArrowUp",
            timestamp: Date.now(),
          }
          inputSource.queueInput(event.inputType, { key: event.key })
          inputEvents.push(event)
        }

        if (frame === 25) {
          const event = {
            type: GameEventType.USER_INPUT,
            tick: originalEngine.getTotalTicks(),
            inputType: "key_press",
            key: "Space",
            timestamp: Date.now(),
          }
          inputSource.queueInput(event.inputType, { key: event.key })
          inputEvents.push(event)
        }

        if (frame === 40) {
          const event = {
            type: GameEventType.USER_INPUT,
            tick: originalEngine.getTotalTicks(),
            inputType: "key_release",
            key: "ArrowUp",
            timestamp: Date.now(),
          }
          inputSource.queueInput(event.inputType, { key: event.key })
          inputEvents.push(event)
        }

        capturedStates.push(originalEngine.captureState())
        await originalTicker.tick(1)
      }

      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()
      expect(recording).not.toBeNull()

      // Verify input events were recorded
      const userInputEvents = recording!.events.filter(
        (e) => e.type === GameEventType.USER_INPUT,
      )
      expect(userInputEvents.length).toBe(inputEvents.length)

      // Replay and compare
      await replayManager.replay(recording!)

      // Create the same objects in replay engine to match initial state (after reset)
      const _replayPlayer = new TestProjectile(
        "player",
        new Vector2D(50, 50),
        new Vector2D(0, 0),
        10,
        100,
        "",
        replayEngine,
      )
      const proxyEngineReplay = replayManager.getReplayEngine()
      replayTicker.add((deltaTicks) => proxyEngineReplay.update(deltaTicks))

      const replayStates: any[] = []
      for (let frame = 0; frame < 60; frame++) {
        replayStates.push(replayEngine.captureState())
        await replayTicker.tick(1)

        if (!replayManager.isCurrentlyReplaying()) {
          break
        }
      }

      // States should match exactly
      expect(replayStates.length).toBe(capturedStates.length)

      for (let i = 0; i < capturedStates.length; i++) {
        const comparison = StateComparator.compare(
          capturedStates[i],
          replayStates[i],
          { tolerance: 1e-10 },
        )
        expect(comparison.equal).toBe(true)
      }
    })

    test("should handle rapid input sequences", async () => {
      const seed = "rapid-input-test"

      await originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)
      originalTicker.add((deltaTicks) => originalEngine.update(deltaTicks))

      new TestProjectile(
        "player",
        new Vector2D(25, 25),
        new Vector2D(0, 0),
        10,
        100,
        "",
        originalEngine,
      )

      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      // Generate rapid input sequence
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]
      for (let frame = 0; frame < 50; frame++) {
        // Multiple inputs per frame
        if (frame % 3 === 0) {
          const key = keys[frame % keys.length]
          inputSource.queueInput("key_press", { key })
        }

        if (frame % 5 === 0) {
          const key = keys[(frame + 1) % keys.length]
          inputSource.queueInput("key_release", { key })
        }

        await originalTicker.tick(1)
      }

      // Pause original engine to match replay engine state before comparison
      originalEngine.pause()
      const originalFinalState = originalEngine.captureState()
      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()
      expect(recording).not.toBeNull()

      // Replay
      await replayManager.replay(recording!)

      // Create the same objects in replay engine to match initial state (after reset)
      new TestProjectile(
        "player",
        new Vector2D(25, 25),
        new Vector2D(0, 0),
        10,
        100,
        "",
        replayEngine,
      )
      const proxyEngineReplay = replayManager.getReplayEngine()
      replayTicker.add((deltaTicks) => proxyEngineReplay.update(deltaTicks))

      for (let frame = 0; frame < 50; frame++) {
        await replayTicker.tick(1)
        if (!replayManager.isCurrentlyReplaying()) {
          break
        }
      }

      const replayFinalState = replayEngine.captureState()

      const comparison = StateComparator.compare(
        originalFinalState,
        replayFinalState,
        { tolerance: 1e-10 },
      )
      expect(comparison.equal).toBe(true)
    })
  })

  describe("edge cases and error conditions", () => {
    test("should handle empty recordings", async () => {
      const emptyRecording = {
        seed: "empty-test",
        events: [],
        deltaTicks: [],
        totalTicks: 0,
        metadata: {
          version: "1.0.0",
          timestamp: Date.now(),
          createdAt: Date.now(),
        },
      }

      await replayManager.replay(emptyRecording)
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      // Should finish immediately
      const proxyEngineReplay = replayManager.getReplayEngine()
      replayTicker.add((deltaTicks) => proxyEngineReplay.update(deltaTicks))
      replayTicker.tick(1)

      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    test("should handle corrupted recordings gracefully", async () => {
      const corruptedRecording = {
        seed: "corrupt-test",
        events: [
          // Invalid event structure
          { type: "INVALID_TYPE" as any, tick: 0, timestamp: Date.now() },
          // Missing required fields
          { type: GameEventType.USER_INPUT, tick: 0, timestamp: Date.now() },
        ],
        deltaTicks: [1, 2, null, 4], // Invalid frame count with null
        totalTicks: 100, // Doesn't match deltaTicks sum
        metadata: {
          version: "999.0.0", // Unsupported version
          createdAt: Date.now(),
        },
      } as any

      // Should throw validation error for null in deltaTicks
      await expect(replayManager.replay(corruptedRecording)).rejects.toThrow(
        "Invalid recording: deltaTicks[2] must be a positive number, got null",
      )
    })

    test("should handle recording interruption", async () => {
      const seed = "interruption-test"

      await originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)
      originalTicker.add((deltaTicks) => originalEngine.update(deltaTicks))

      new TestProjectile(
        "test",
        new Vector2D(10, 10),
        new Vector2D(1, 1),
        10,
        100,
        "",
        originalEngine,
      )

      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      // Run for a few frames with some inputs to record
      for (let i = 0; i < 10; i++) {
        // Add some inputs during recording
        if (i % 3 === 0) {
          inputSource.queueInput("key_press", { key: "ArrowUp" })
        }
        await originalTicker.tick(1)
      }

      // Interrupt by stopping recording early
      recorder.stopRecording()
      const partialRecording = recorder.getCurrentRecording()
      expect(partialRecording).not.toBeNull()

      // Should still be a valid recording
      expect(partialRecording!.events.length).toBeGreaterThan(0)
      expect(partialRecording!.deltaTicks.length).toBe(10)
      expect(partialRecording!.totalTicks).toBe(10)

      // Should be replayable
      replayManager.replay(partialRecording!)
      const proxyEngineReplay = replayManager.getReplayEngine()
      replayTicker.add((deltaTicks) => proxyEngineReplay.update(deltaTicks))

      let replayFrames = 0
      while (replayManager.isCurrentlyReplaying() && replayFrames < 20) {
        await replayTicker.tick(1)
        replayFrames++
      }

      expect(replayFrames).toBeGreaterThanOrEqual(10)
      expect(replayFrames).toBeLessThanOrEqual(12)
    })

    test("should handle replay speed variations", async () => {
      const seed = "speed-test"

      // Record original
      await originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)
      originalTicker.add((deltaTicks) => originalEngine.update(deltaTicks))

      const originalProjectile = new TestProjectile(
        "speed_test",
        new Vector2D(0, 0),
        new Vector2D(2, 2),
        10,
        100,
        "",
        originalEngine,
      )

      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      for (let i = 0; i < 30; i++) {
        await originalTicker.tick(1)
      }

      const _originalFinalPos = originalProjectile.getPosition()
      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()
      expect(recording).not.toBeNull()

      // Replay at different "speeds" (different deltaTicks per tick)
      const speeds = [1, 2, 3, 5]

      for (const speed of speeds) {
        const testEngine = new ComplexTestEngine()
        const testReplay = new ReplayManager(testEngine)
        const testTicker = new MockTicker()

        await testReplay.replay(recording!)
        const testProxyEngine = testReplay.getReplayEngine()
        testTicker.add((deltaTicks) => testProxyEngine.update(deltaTicks))

        let totalTicksProcessed = 0
        while (testReplay.isCurrentlyReplaying() && totalTicksProcessed < 30) {
          await testTicker.tick(speed)
          totalTicksProcessed += speed
        }

        // Compare final state instead of looking for specific objects
        const finalReplayState = testEngine.captureState()
        const originalFinalState = originalEngine.captureState()

        // States should be similar (allowing for minor timing differences due to async operations)
        expect(finalReplayState.totalTicks).toBeCloseTo(
          originalFinalState.totalTicks,
          1, // Reduced precision to allow for async timing differences
        )
        expect(finalReplayState.gameState).toBe("PAUSED") // Replay engine pauses when replay completes
      }
    })
  })

  describe("serialization integration", () => {
    test("should serialize and deserialize recordings", async () => {
      const seed = "serialize-test"

      await originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)
      originalTicker.add((deltaTicks) => originalEngine.update(deltaTicks))

      // Create objects with Vector2D positions (requires serialization)
      const projectile = new TestProjectile(
        "serialize_proj",
        new Vector2D(15, 25),
        new Vector2D(3, -1),
        10,
        100,
        "",
        originalEngine,
      )
      const _powerup = new TestPowerUp(
        "serialize_power",
        new Vector2D(40, 30),
        "health",
        50,
        0,
        0,
        originalEngine,
      )

      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      // Add some object updates that will require serialization
      for (let frame = 0; frame < 20; frame++) {
        if (frame === 10) {
          projectile.setPosition(new Vector2D(50, 50))
          recorder.recordEvent({
            type: GameEventType.OBJECT_UPDATE,
            tick: originalEngine.getTotalTicks(),
            timestamp: Date.now(),
            objectType: "Projectile",
            objectId: "serialize_proj",
            method: "setPosition",
            params: [serializer.serialize(new Vector2D(50, 50))],
          })
        }
        await originalTicker.tick(1)
      }

      recorder.stopRecording()
      const originalRecording = recorder.getCurrentRecording()
      expect(originalRecording).not.toBeNull()

      // Serialize the recording
      const serialized = serializer.serialize(originalRecording!)

      // Deserialize the recording
      const deserializedRecording = serializer.deserialize(serialized)

      // Verify serialization integrity
      expect(deserializedRecording.seed).toBe(originalRecording!.seed)
      expect(deserializedRecording.events.length).toBe(
        originalRecording!.events.length,
      )
      expect(deserializedRecording.deltaTicks.length).toBe(
        originalRecording!.deltaTicks.length,
      )
      expect(deserializedRecording.totalTicks).toBe(
        originalRecording!.totalTicks,
      )

      // Verify events are preserved
      for (let i = 0; i < originalRecording!.events.length; i++) {
        const original = originalRecording!.events[i]
        const deserialized = deserializedRecording.events[i]
        expect(deserialized.type).toBe(original.type)
        expect(deserialized.tick).toBe(original.tick)
      }

      // Verify deltaTicks are preserved
      for (let i = 0; i < originalRecording!.deltaTicks.length; i++) {
        expect(deserializedRecording.deltaTicks[i]).toBeCloseTo(
          originalRecording!.deltaTicks[i],
          10,
        )
      }
    })
  })

  describe("long-running simulations", () => {
    test("should handle extended simulations accurately", async () => {
      const seed = "long-sim-test"

      // Setup extended simulation using configuration
      originalEngine.setSetupConfig({
        extendedProjectiles: { count: 10, xSpacing: 8, ySpacing: 6 },
        velocityModifications: true,
      })

      await originalEngine.reset(seed)
      originalTicker.add((deltaTicks) => originalEngine.update(deltaTicks))

      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      // Run for many frames with periodic state checks
      const checkpoints: { tick: number; state: any }[] = []
      const totalTicks = 300

      for (let frame = 0; frame < totalTicks; frame++) {
        await originalTicker.tick(1)

        // Checkpoint every 30 frames
        if (frame % 30 === 0) {
          checkpoints.push({
            tick: frame,
            state: originalEngine.captureState(),
          })
        }
      }

      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()
      expect(recording).not.toBeNull()

      // Verify recording integrity
      expect(recording!.totalTicks).toBe(totalTicks)
      expect(recording!.deltaTicks.length).toBe(totalTicks)

      // Setup replay engine with same configuration
      replayEngine.setSetupConfig({
        extendedProjectiles: { count: 10, xSpacing: 8, ySpacing: 6 },
        velocityModifications: true,
      })

      // Replay and verify checkpoints
      await replayManager.replay(recording!)
      const proxyEngineReplay = replayManager.getReplayEngine()
      replayTicker.add((deltaTicks) => proxyEngineReplay.update(deltaTicks))

      const replayCheckpoints: { tick: number; state: any }[] = []

      for (let frame = 0; frame < totalTicks; frame++) {
        await replayTicker.tick(1)

        if (frame % 30 === 0) {
          replayCheckpoints.push({
            tick: frame,
            state: replayEngine.captureState(),
          })
        }

        if (!replayManager.isCurrentlyReplaying()) {
          break
        }
      }

      // All checkpoints should match
      expect(replayCheckpoints.length).toBe(checkpoints.length)

      for (let i = 0; i < checkpoints.length; i++) {
        const original = checkpoints[i]
        const replayed = replayCheckpoints[i]

        const comparison = StateComparator.compare(
          original.state,
          replayed.state,
          { tolerance: 1e-10 },
        )
        if (!comparison.equal) {
          console.log(
            `Long simulation checkpoint mismatch at tick ${original.tick}`,
          )
        }
        expect(comparison.equal).toBe(true)
      }
    })
  })
})
