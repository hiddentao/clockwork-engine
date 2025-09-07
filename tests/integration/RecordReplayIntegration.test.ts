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
      originalEngine.reset(seed)
      originalTicker.add((deltaFrames) => originalEngine.update(deltaFrames))

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
      replayManager.replay(recording!)
      replayTicker.add((deltaFrames) => {
        replayStates.push(replayEngine.captureState())
        replayManager.update(deltaFrames)
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

      // Setup with many interacting objects
      originalEngine.reset(seed)
      originalTicker.add((deltaFrames) => originalEngine.update(deltaFrames))

      const objects: (TestProjectile | TestPowerUp)[] = []

      // Create grid of projectiles
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          const pos = new Vector2D(x * 15, y * 15)
          const velocity = new Vector2D(
            (originalEngine.getPRNG().random() - 0.5) * 4,
            (originalEngine.getPRNG().random() - 0.5) * 4,
          )
          objects.push(
            new TestProjectile(
              `proj_${x}_${y}`,
              pos,
              velocity,
              10,
              100,
              "",
              originalEngine,
            ),
          )
        }
      }

      // Add some power-ups
      for (let i = 0; i < 5; i++) {
        const pos = new Vector2D(
          originalEngine.getPRNG().random() * 75,
          originalEngine.getPRNG().random() * 75,
        )
        objects.push(
          new TestPowerUp(`power${i}`, pos, "health", 50, 0, 0, originalEngine),
        )
      }

      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      // Run with dynamic interactions
      const checkpoints: { frame: number; state: any }[] = []
      for (let frame = 0; frame < 100; frame++) {
        // Every 20 frames, destroy some objects and create new ones
        if (frame % 20 === 0 && frame > 0) {
          // Destroy some objects
          let destroyCount = 0
          for (const obj of objects) {
            if (!obj.isDestroyed() && originalEngine.getPRNG().random() > 0.8) {
              obj.destroy()
              destroyCount++
              if (destroyCount >= 3) break
            }
          }

          // Create new objects
          for (let i = 0; i < 2; i++) {
            const pos = new Vector2D(
              originalEngine.getPRNG().random() * 80,
              originalEngine.getPRNG().random() * 80,
            )
            const velocity = new Vector2D(
              (originalEngine.getPRNG().random() - 0.5) * 3,
              (originalEngine.getPRNG().random() - 0.5) * 3,
            )
            objects.push(
              new TestProjectile(
                `new_${frame}_${i}`,
                pos,
                velocity,
                10,
                100,
                "",
                originalEngine,
              ),
            )
          }
        }

        await originalTicker.tick(1)

        // Save checkpoints every 10 frames
        if (frame % 10 === 0) {
          checkpoints.push({
            frame,
            state: originalEngine.captureState(),
          })
        }
      }

      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()
      expect(recording).not.toBeNull()

      // Replay and verify checkpoints
      replayManager.replay(recording!)
      replayTicker.add((deltaFrames) => replayManager.update(deltaFrames))

      const replayCheckpoints: { frame: number; state: any }[] = []
      for (let frame = 0; frame < 100; frame++) {
        await replayTicker.tick(1)

        if (frame % 10 === 0) {
          replayCheckpoints.push({
            frame,
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

        expect(replayed.frame).toBe(original.frame)

        const comparison = StateComparator.compare(
          original.state,
          replayed.state,
          { tolerance: 1e-10 },
        )
        if (!comparison.equal) {
          console.log(
            `Checkpoint mismatch at frame ${original.frame}:`,
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
      originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)

      originalTicker.add((deltaFrames) => originalEngine.update(deltaFrames))

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
            frame: originalEngine.getTotalFrames(),
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
            frame: originalEngine.getTotalFrames(),
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
            frame: originalEngine.getTotalFrames(),
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
      replayManager.replay(recording!)
      replayTicker.add((deltaFrames) => replayManager.update(deltaFrames))

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

      originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)
      originalTicker.add((deltaFrames) => originalEngine.update(deltaFrames))

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
      replayManager.replay(recording!)
      replayTicker.add((deltaFrames) => replayManager.update(deltaFrames))

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
    test("should handle empty recordings", () => {
      const emptyRecording = {
        seed: "empty-test",
        events: [],
        deltaFrames: [],
        totalFrames: 0,
        metadata: {
          version: "1.0.0",
          timestamp: Date.now(),
          createdAt: Date.now(),
        },
      }

      expect(() => replayManager.replay(emptyRecording)).not.toThrow()
      expect(replayManager.isCurrentlyReplaying()).toBe(true)

      // Should finish immediately
      replayTicker.add((deltaFrames) => replayManager.update(deltaFrames))
      replayTicker.tick(1)

      expect(replayManager.isCurrentlyReplaying()).toBe(false)
    })

    test("should handle corrupted recordings gracefully", () => {
      const corruptedRecording = {
        seed: "corrupt-test",
        events: [
          // Invalid event structure
          { type: "INVALID_TYPE" as any, frame: 0, timestamp: Date.now() },
          // Missing required fields
          { type: GameEventType.USER_INPUT, frame: 0, timestamp: Date.now() },
        ],
        deltaFrames: [1, 2, null, 4], // Invalid frame count
        totalFrames: 100, // Doesn't match deltaFrames sum
        metadata: {
          version: "999.0.0", // Unsupported version
          createdAt: Date.now(),
        },
      } as any

      // Should not crash but may not replay correctly
      expect(() => replayManager.replay(corruptedRecording)).not.toThrow()
    })

    test("should handle recording interruption", async () => {
      const seed = "interruption-test"

      originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)
      originalTicker.add((deltaFrames) => originalEngine.update(deltaFrames))

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
      expect(partialRecording!.deltaFrames.length).toBe(10)
      expect(partialRecording!.totalFrames).toBe(10)

      // Should be replayable
      replayManager.replay(partialRecording!)
      replayTicker.add((deltaFrames) => replayManager.update(deltaFrames))

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
      originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)
      originalTicker.add((deltaFrames) => originalEngine.update(deltaFrames))

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

      // Replay at different "speeds" (different deltaFrames per tick)
      const speeds = [1, 2, 3, 5]

      for (const speed of speeds) {
        const testEngine = new ComplexTestEngine()
        const testReplay = new ReplayManager(testEngine)
        const testTicker = new MockTicker()

        testReplay.replay(recording!)
        testTicker.add((deltaFrames) => testReplay.update(deltaFrames))

        let totalFramesProcessed = 0
        while (testReplay.isCurrentlyReplaying() && totalFramesProcessed < 30) {
          await testTicker.tick(speed)
          totalFramesProcessed += speed
        }

        // Compare final state instead of looking for specific objects
        const finalReplayState = testEngine.captureState()
        const originalFinalState = originalEngine.captureState()

        // States should be similar (allowing for minor timing differences)
        expect(finalReplayState.totalFrames).toBeCloseTo(
          originalFinalState.totalFrames,
          5,
        )
        expect(finalReplayState.gameState).toBe("PAUSED") // Replay engine pauses when replay completes
      }
    })
  })

  describe("serialization integration", () => {
    test("should serialize and deserialize recordings", async () => {
      const seed = "serialize-test"

      originalEngine.reset(seed)
      const inputSource = new UserInputEventSource()
      originalEngine.getEventManager().setSource(inputSource)
      originalTicker.add((deltaFrames) => originalEngine.update(deltaFrames))

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
            frame: originalEngine.getTotalFrames(),
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
      expect(deserializedRecording.deltaFrames.length).toBe(
        originalRecording!.deltaFrames.length,
      )
      expect(deserializedRecording.totalFrames).toBe(
        originalRecording!.totalFrames,
      )

      // Verify events are preserved
      for (let i = 0; i < originalRecording!.events.length; i++) {
        const original = originalRecording!.events[i]
        const deserialized = deserializedRecording.events[i]
        expect(deserialized.type).toBe(original.type)
        expect(deserialized.frame).toBe(original.frame)
      }

      // Verify deltaFrames are preserved
      for (let i = 0; i < originalRecording!.deltaFrames.length; i++) {
        expect(deserializedRecording.deltaFrames[i]).toBeCloseTo(
          originalRecording!.deltaFrames[i],
          10,
        )
      }
    })
  })

  describe("long-running simulations", () => {
    test("should handle extended simulations accurately", async () => {
      const seed = "long-sim-test"

      originalEngine.reset(seed)
      originalTicker.add((deltaFrames) => originalEngine.update(deltaFrames))

      // Create initial objects
      const objects: TestProjectile[] = []
      for (let i = 0; i < 10; i++) {
        const pos = new Vector2D(i * 8, i * 6)
        const velocity = new Vector2D(
          (originalEngine.getPRNG().random() - 0.5) * 2,
          (originalEngine.getPRNG().random() - 0.5) * 2,
        )
        objects.push(
          new TestProjectile(
            `long_${i}`,
            pos,
            velocity,
            10,
            100,
            "",
            originalEngine,
          ),
        )
      }

      originalEngine.setGameRecorder(recorder)
      recorder.startRecording(originalEngine.getEventManager(), seed)
      originalEngine.start()

      // Run for many frames with periodic state checks
      const checkpoints: { frame: number; state: any }[] = []
      const totalFrames = 300

      for (let frame = 0; frame < totalFrames; frame++) {
        // Add dynamics to keep simulation interesting
        if (frame % 50 === 0 && frame > 0) {
          // Randomly modify some object velocities
          for (const obj of objects) {
            if (!obj.isDestroyed() && originalEngine.getPRNG().random() > 0.7) {
              const newVel = new Vector2D(
                (originalEngine.getPRNG().random() - 0.5) * 3,
                (originalEngine.getPRNG().random() - 0.5) * 3,
              )
              obj.setVelocity(newVel)
            }
          }
        }

        await originalTicker.tick(1)

        // Checkpoint every 30 frames
        if (frame % 30 === 0) {
          checkpoints.push({
            frame,
            state: originalEngine.captureState(),
          })
        }
      }

      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()
      expect(recording).not.toBeNull()

      // Verify recording integrity
      expect(recording!.totalFrames).toBe(totalFrames)
      expect(recording!.deltaFrames.length).toBe(totalFrames)

      // Replay and verify checkpoints
      replayManager.replay(recording!)
      replayTicker.add((deltaFrames) => replayManager.update(deltaFrames))

      const replayCheckpoints: { frame: number; state: any }[] = []

      for (let frame = 0; frame < totalFrames; frame++) {
        await replayTicker.tick(1)

        if (frame % 30 === 0) {
          replayCheckpoints.push({
            frame,
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
            `Long simulation checkpoint mismatch at frame ${original.frame}`,
          )
        }
        expect(comparison.equal).toBe(true)
      }
    })
  })
})
