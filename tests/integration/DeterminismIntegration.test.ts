import { beforeEach, describe, expect, test } from "bun:test"
import { Serializer } from "../../src/Serializer"
import { Vector2D } from "../../src/geometry/Vector2D"
import { ComplexTestEngine } from "../fixtures/ComplexTestEngine"
import { TestProjectile } from "../fixtures/TestProjectile"
import { MockTicker } from "../helpers/MockTicker"
import { StateComparator } from "../helpers/StateComparator"

describe("Determinism Integration Tests", () => {
  let engine1: ComplexTestEngine
  let engine2: ComplexTestEngine
  let ticker1: MockTicker
  let ticker2: MockTicker
  let serializer: Serializer

  beforeEach(() => {
    engine1 = new ComplexTestEngine()
    engine2 = new ComplexTestEngine()
    ticker1 = new MockTicker()
    ticker2 = new MockTicker()
    serializer = new Serializer()

    // Register types for serialization
    serializer.registerType("Vector2D", Vector2D)
  })

  describe("identical setup determinism", () => {
    test("should produce identical results with same seed and inputs", async () => {
      const seed = "determinism-test-123"

      // Initialize both engines with identical setup
      engine1.reset(seed)
      engine2.reset(seed)

      // Add identical objects
      for (let i = 0; i < 5; i++) {
        const pos1 = new Vector2D(i * 10, i * 5)
        const pos2 = new Vector2D(i * 10, i * 5)

        new TestProjectile(
          `proj${i}`,
          pos1,
          new Vector2D(2, 1),
          10,
          100,
          "",
          engine1,
        )
        new TestProjectile(
          `proj${i}`,
          pos2,
          new Vector2D(2, 1),
          10,
          100,
          "",
          engine2,
        )
      }

      // Connect tickers and start
      ticker1.add((deltaTicks) => engine1.update(deltaTicks))
      ticker2.add((deltaTicks) => engine2.update(deltaTicks))

      engine1.start()
      engine2.start()

      // Run identical sequences
      for (let frame = 0; frame < 100; frame++) {
        await ticker1.tick(1)
        await ticker2.tick(1)

        // Compare states every 10 frames
        if (frame % 10 === 0) {
          const state1 = engine1.captureState()
          const state2 = engine2.captureState()

          const comparison = StateComparator.compare(state1, state2, {
            tolerance: 1e-10,
          })
          expect(comparison.equal).toBe(true)
        }
      }

      // Final state comparison
      const finalState1 = engine1.captureState()
      const finalState2 = engine2.captureState()

      const finalComparison = StateComparator.compare(
        finalState1,
        finalState2,
        { tolerance: 1e-10 },
      )
      expect(finalComparison.equal).toBe(true)
    })

    test("should produce different results with different seeds", async () => {
      // Initialize with different seeds
      engine1.reset("seed-A")
      engine2.reset("seed-B")

      // Test that different seeds produce different random sequences
      const randomValues1 = []
      const randomValues2 = []

      for (let i = 0; i < 10; i++) {
        randomValues1.push(engine1.getPRNG().random())
        randomValues2.push(engine2.getPRNG().random())
      }

      // The random sequences should be different
      expect(randomValues1).not.toEqual(randomValues2)
    })

    test("should be deterministic across multiple runs", async () => {
      const seed = "multi-run-test"
      const results: any[] = []

      // Run the same simulation 3 times
      for (let run = 0; run < 3; run++) {
        const engine = new ComplexTestEngine()
        const ticker = new MockTicker()

        engine.reset(seed)

        // Add objects with some randomization that should be deterministic
        for (let i = 0; i < 5; i++) {
          const randomX = engine.getPRNG().random() * 100
          const randomY = engine.getPRNG().random() * 100
          const pos = new Vector2D(randomX, randomY)
          const _proj = new TestProjectile(
            `proj${i}`,
            pos,
            new Vector2D(1, 1),
            10,
            100,
            "",
            engine,
          )
        }

        ticker.add((deltaTicks) => engine.update(deltaTicks))
        engine.start()

        // Run simulation
        for (let frame = 0; frame < 30; frame++) {
          await ticker.tick(1)
        }

        results.push(engine.captureState())
      }

      // All runs should produce identical results
      for (let i = 1; i < results.length; i++) {
        const comparison = StateComparator.compare(results[0], results[i], {
          tolerance: 1e-10,
        })
        expect(comparison.equal).toBe(true)
      }
    })
  })

  describe("frame timing determinism", () => {
    test("should be deterministic regardless of frame timing variations", async () => {
      const seed = "frame-timing-test"

      // Initialize engines
      engine1.reset(seed)
      engine2.reset(seed)

      // Add identical objects
      const _proj1 = new TestProjectile(
        "proj1",
        new Vector2D(0, 0),
        new Vector2D(2, 1),
        10,
        100,
        "",
        engine1,
      )
      const _proj2 = new TestProjectile(
        "proj1",
        new Vector2D(0, 0),
        new Vector2D(2, 1),
        10,
        100,
        "",
        engine2,
      )

      ticker1.add((deltaTicks) => engine1.update(deltaTicks))
      ticker2.add((deltaTicks) => engine2.update(deltaTicks))

      engine1.start()
      engine2.start()

      // Engine 1: Regular 1-frame updates
      for (let i = 0; i < 60; i++) {
        await ticker1.tick(1)
      }

      // Engine 2: Varied frame updates that sum to same total
      await ticker2.tick(2) // 2 frames
      await ticker2.tick(3) // 5 total
      await ticker2.tick(1) // 6 total
      await ticker2.tick(4) // 10 total
      for (let i = 0; i < 10; i++) {
        await ticker2.tick(5) // 60 total frames
      }

      // Should produce identical results
      const state1 = engine1.captureState()
      const state2 = engine2.captureState()

      const comparison = StateComparator.compare(state1, state2, {
        tolerance: 1e-10,
      })
      expect(comparison.equal).toBe(true)
    })

    test("should handle zero-frame updates correctly", async () => {
      const seed = "zero-frame-test"
      engine1.reset(seed)

      const _proj = new TestProjectile(
        "proj",
        new Vector2D(5, 5),
        new Vector2D(1, 0),
        10,
        100,
        "",
        engine1,
      )
      ticker1.add((deltaTicks) => engine1.update(deltaTicks))

      engine1.start()

      const initialState = engine1.captureState()

      // Multiple zero-frame updates should not change state
      await ticker1.tick(0)
      await ticker1.tick(0)
      await ticker1.tick(0)

      const afterZeroFrames = engine1.captureState()

      const comparison = StateComparator.compare(
        initialState,
        afterZeroFrames,
        { tolerance: 1e-10 },
      )
      expect(comparison.equal).toBe(true)

      // Now do a real update
      await ticker1.tick(1)

      const afterUpdate = engine1.captureState()
      const finalComparison = StateComparator.compare(initialState, afterUpdate)
      expect(finalComparison.equal).toBe(false)
    })
  })

  describe("object lifecycle determinism", () => {
    test("should handle object creation and destruction deterministically", async () => {
      const seed = "lifecycle-test"

      engine1.reset(seed)
      engine2.reset(seed)

      ticker1.add((deltaTicks) => engine1.update(deltaTicks))
      ticker2.add((deltaTicks) => engine2.update(deltaTicks))

      engine1.start()
      engine2.start()

      // Create objects at predetermined frames
      const createFrames = [5, 10, 15, 25, 40]
      const destroyFrames = [20, 30, 45, 50, 60]

      let createdObjects1: TestProjectile[] = []
      let createdObjects2: TestProjectile[] = []

      for (let frame = 0; frame < 70; frame++) {
        // Create objects
        if (createFrames.includes(frame)) {
          const pos = new Vector2D(frame, frame)
          const obj1 = new TestProjectile(
            `obj${frame}`,
            pos,
            new Vector2D(1, 0),
            10,
            100,
            "",
            engine1,
          )
          const obj2 = new TestProjectile(
            `obj${frame}`,
            pos,
            new Vector2D(1, 0),
            10,
            100,
            "",
            engine2,
          )
          createdObjects1.push(obj1)
          createdObjects2.push(obj2)
        }

        // Destroy objects
        if (destroyFrames.includes(frame)) {
          const toDestroy = Math.floor(createdObjects1.length / 2)
          for (let i = 0; i < toDestroy; i++) {
            if (createdObjects1[i]) {
              createdObjects1[i].destroy()
              createdObjects2[i].destroy()
            }
          }
        }

        await ticker1.tick(1)
        await ticker2.tick(1)

        // Compare states every 10 frames
        if (frame % 10 === 0) {
          const state1 = engine1.captureState()
          const state2 = engine2.captureState()

          const comparison = StateComparator.compare(state1, state2, {
            tolerance: 1e-10,
          })
          expect(comparison.equal).toBe(true)
        }
      }
    })

    test("should handle rapid object creation/destruction cycles", async () => {
      const seed = "rapid-cycle-test"

      engine1.reset(seed)
      ticker1.add((deltaTicks) => engine1.update(deltaTicks))
      engine1.start()

      let objects: TestProjectile[] = []

      for (let frame = 0; frame < 50; frame++) {
        // Every frame: create one, destroy one (if any exist)
        const newPos = new Vector2D(frame * 2, frame)
        const newObj = new TestProjectile(
          `frame${frame}`,
          newPos,
          new Vector2D(1, 1),
          10,
          100,
          "",
          engine1,
        )
        objects.push(newObj)

        // Destroy oldest object if we have more than 5
        if (objects.length > 5) {
          const toDestroy = objects.shift()
          if (toDestroy) {
            toDestroy.destroy()
          }
        }

        await ticker1.tick(1)

        // Verify engine is still in consistent state
        expect(engine1.getTotalTicks()).toBe(frame + 1)
        const activeObjects =
          engine1.getGameObjectGroup("TestProjectile")?.getAllActive() || []
        expect(activeObjects.length).toBeLessThanOrEqual(5)
      }
    })
  })

  describe("PRNG determinism", () => {
    test("should produce identical random sequences", async () => {
      const seed = "prng-test-123"

      engine1.reset(seed)
      engine2.reset(seed)

      // Generate identical random sequences
      const sequence1: number[] = []
      const sequence2: number[] = []

      for (let i = 0; i < 100; i++) {
        sequence1.push(engine1.getPRNG().random())
        sequence2.push(engine2.getPRNG().random())
      }

      // Sequences should be identical
      expect(sequence1).toEqual(sequence2)
    })

    test("should maintain PRNG state across engine operations", async () => {
      const seed = "prng-state-test"

      engine1.reset(seed)
      ticker1.add((deltaTicks) => engine1.update(deltaTicks))

      // Get some random numbers before starting
      const preStart = []
      for (let i = 0; i < 10; i++) {
        preStart.push(engine1.getPRNG().random())
      }

      engine1.start()

      // Run simulation that uses PRNG
      for (let i = 0; i < 20; i++) {
        // Create object at random position
        const randomX = engine1.getPRNG().random() * 100
        const randomY = engine1.getPRNG().random() * 100
        const pos = new Vector2D(randomX, randomY)
        const _proj = new TestProjectile(
          `random${i}`,
          pos,
          new Vector2D(1, 0),
          10,
          100,
          "",
          engine1,
        )

        await ticker1.tick(1)
      }

      // Get more numbers after simulation
      const postSim = []
      for (let i = 0; i < 10; i++) {
        postSim.push(engine1.getPRNG().random())
      }

      // Now create second engine and repeat exactly
      engine2.reset(seed)
      ticker2.add((deltaTicks) => engine2.update(deltaTicks))

      // Should get same pre-start sequence
      const preStart2 = []
      for (let i = 0; i < 10; i++) {
        preStart2.push(engine2.getPRNG().random())
      }
      expect(preStart2).toEqual(preStart)

      engine2.start()

      // Same simulation
      for (let i = 0; i < 20; i++) {
        const randomX = engine2.getPRNG().random() * 100
        const randomY = engine2.getPRNG().random() * 100
        const pos = new Vector2D(randomX, randomY)
        const _proj = new TestProjectile(
          `random${i}`,
          pos,
          new Vector2D(1, 0),
          10,
          100,
          "",
          engine2,
        )

        await ticker2.tick(1)
      }

      // Should get same post-simulation sequence
      const postSim2 = []
      for (let i = 0; i < 10; i++) {
        postSim2.push(engine2.getPRNG().random())
      }
      expect(postSim2).toEqual(postSim)

      // Final states should be identical
      const state1 = engine1.captureState()
      const state2 = engine2.captureState()

      const comparison = StateComparator.compare(state1, state2, {
        tolerance: 1e-10,
      })
      expect(comparison.equal).toBe(true)
    })
  })

  describe("complex interaction determinism", () => {
    test("should handle complex object interactions deterministically", async () => {
      const seed = "interaction-test"

      engine1.reset(seed)
      engine2.reset(seed)

      // Create complex scenario with multiple interacting objects
      const projectiles1: TestProjectile[] = []
      const projectiles2: TestProjectile[] = []

      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI * 2) / 10
        const radius = 20
        const pos = new Vector2D(
          50 + Math.cos(angle) * radius,
          50 + Math.sin(angle) * radius,
        )
        const velocity = new Vector2D(
          Math.cos(angle + Math.PI) * 2,
          Math.sin(angle + Math.PI) * 2,
        )

        const proj1 = new TestProjectile(
          `proj${i}`,
          pos,
          velocity,
          10,
          100,
          "",
          engine1,
        )
        const proj2 = new TestProjectile(
          `proj${i}`,
          pos,
          velocity,
          10,
          100,
          "",
          engine2,
        )

        projectiles1.push(proj1)
        projectiles2.push(proj2)
      }

      ticker1.add((deltaTicks) => engine1.update(deltaTicks))
      ticker2.add((deltaTicks) => engine2.update(deltaTicks))

      engine1.start()
      engine2.start()

      // Run simulation with complex interactions
      for (let frame = 0; frame < 100; frame++) {
        await ticker1.tick(1)
        await ticker2.tick(1)

        // Every 20 frames, add some randomization
        if (frame % 20 === 0) {
          for (let i = 0; i < projectiles1.length; i++) {
            if (
              !projectiles1[i].isDestroyed() &&
              !projectiles2[i].isDestroyed()
            ) {
              const randomVelX = engine1.getPRNG().random() * 4 - 2
              const randomVelY = engine1.getPRNG().random() * 4 - 2

              const randomVelX2 = engine2.getPRNG().random() * 4 - 2
              const randomVelY2 = engine2.getPRNG().random() * 4 - 2

              // These should be identical due to same seed
              expect(randomVelX).toBeCloseTo(randomVelX2, 10)
              expect(randomVelY).toBeCloseTo(randomVelY2, 10)

              projectiles1[i].setVelocity(new Vector2D(randomVelX, randomVelY))
              projectiles2[i].setVelocity(
                new Vector2D(randomVelX2, randomVelY2),
              )
            }
          }
        }

        // Compare every 25 frames
        if (frame % 25 === 0) {
          const state1 = engine1.captureState()
          const state2 = engine2.captureState()

          const comparison = StateComparator.compare(state1, state2, {
            tolerance: 1e-10,
          })
          if (!comparison.equal) {
            console.log(
              "State mismatch at frame",
              frame,
              comparison.differences,
            )
          }
          expect(comparison.equal).toBe(true)
        }
      }
    })
  })
})
