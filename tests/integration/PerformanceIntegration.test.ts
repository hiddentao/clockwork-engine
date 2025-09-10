import { beforeEach, describe, expect, test } from "bun:test"
import { GameRecorder } from "../../src/GameRecorder"
import { Serializer } from "../../src/Serializer"
import { Vector2D } from "../../src/geometry/Vector2D"
import { ComplexTestEngine } from "../fixtures/ComplexTestEngine"
import { TestProjectile } from "../fixtures/TestProjectile"
import { MemoryProfiler } from "../helpers/MemoryProfiler"
import { MockTicker } from "../helpers/MockTicker"

describe("Performance Integration Tests", () => {
  let engine: ComplexTestEngine
  let ticker: MockTicker
  let profiler: MemoryProfiler
  let serializer: Serializer

  beforeEach(() => {
    engine = new ComplexTestEngine()
    ticker = new MockTicker()
    profiler = new MemoryProfiler()
    serializer = new Serializer()

    serializer.registerType("Vector2D", Vector2D)
  })

  describe("engine performance", () => {
    test("should handle large numbers of objects efficiently", async () => {
      engine.reset("performance-test")
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      const startTime = performance.now()
      profiler.start()

      // Create many objects
      const objects: TestProjectile[] = []
      for (let i = 0; i < 1000; i++) {
        const pos = new Vector2D(i % 100, Math.floor(i / 100))
        const velocity = new Vector2D(
          (engine.getPRNG().random() - 0.5) * 4,
          (engine.getPRNG().random() - 0.5) * 4,
        )
        objects.push(
          new TestProjectile(`obj${i}`, pos, velocity, 10, 100, "", engine),
        )
      }

      engine.start()
      profiler.takeSnapshot() // Take snapshot after setup

      // Run simulation
      for (let frame = 0; frame < 100; frame++) {
        await ticker.tick(1)
        if (frame % 25 === 0) {
          profiler.takeSnapshot() // Periodic snapshots
        }
      }

      const endTime = performance.now()
      const profile = profiler.stop()

      const totalTime = endTime - startTime
      const avgFrameTime = totalTime / 100

      // Performance expectations (adjust based on your needs)
      expect(totalTime).toBeLessThan(5000) // Should complete in under 5 seconds
      expect(avgFrameTime).toBeLessThan(50) // Average frame under 50ms

      // Memory should not grow excessively
      expect(profile.memoryGrowth).toBeLessThan(100 * 1024 * 1024) // Less than 100MB growth

      console.log(
        `Performance: ${totalTime}ms total, ${avgFrameTime.toFixed(2)}ms/frame`,
      )
      console.log(`Memory: ${profile.memoryGrowth / 1024 / 1024}MB growth`)
    })

    test("should maintain consistent frame times", async () => {
      engine.reset("frame-time-test")
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      // Create moderate number of objects
      for (let i = 0; i < 200; i++) {
        const pos = new Vector2D(i * 2, i * 1.5)
        const velocity = new Vector2D(1, 0.5)
        new TestProjectile(`obj${i}`, pos, velocity, 10, 100, "", engine)
      }

      engine.start()

      const frameTimes: number[] = []

      // Measure frame times
      for (let frame = 0; frame < 60; frame++) {
        const frameStart = performance.now()
        await ticker.tick(1)
        const frameEnd = performance.now()

        frameTimes.push(frameEnd - frameStart)
      }

      // Calculate statistics
      const avgFrameTime =
        frameTimes.reduce((a, b) => a + b) / frameTimes.length
      const maxFrameTime = Math.max(...frameTimes)
      const _minFrameTime = Math.min(...frameTimes)
      const variance =
        frameTimes.reduce(
          (acc, time) => acc + Math.pow(time - avgFrameTime, 2),
          0,
        ) / frameTimes.length
      const stdDev = Math.sqrt(variance)

      // Frame times should be consistent
      expect(avgFrameTime).toBeLessThan(20) // Average under 20ms
      expect(maxFrameTime).toBeLessThan(50) // Max under 50ms
      expect(stdDev).toBeLessThan(10) // Low variation

      console.log(
        `Frame time stats: avg=${avgFrameTime.toFixed(2)}ms, max=${maxFrameTime.toFixed(2)}ms, stddev=${stdDev.toFixed(2)}ms`,
      )
    })

    test("should scale performance linearly with object count", async () => {
      const objectCounts = [50, 100, 200, 400]
      const results: { count: number; avgFrameTime: number }[] = []

      for (const count of objectCounts) {
        const testEngine = new ComplexTestEngine()
        const testTicker = new MockTicker()

        testEngine.reset(`scale-test-${count}`)
        testTicker.add((deltaFrames) => testEngine.update(deltaFrames))

        // Create objects
        for (let i = 0; i < count; i++) {
          const pos = new Vector2D(i % 20, Math.floor(i / 20))
          const velocity = new Vector2D(1, 1)
          new TestProjectile(`obj${i}`, pos, velocity, 10, 100, "", testEngine)
        }

        testEngine.start()

        // Measure performance for 30 frames
        const frameTimes: number[] = []
        for (let frame = 0; frame < 30; frame++) {
          const frameStart = performance.now()
          await testTicker.tick(1)
          const frameEnd = performance.now()
          frameTimes.push(frameEnd - frameStart)
        }

        const avgFrameTime =
          frameTimes.reduce((a, b) => a + b) / frameTimes.length
        results.push({ count, avgFrameTime })

        console.log(`${count} objects: ${avgFrameTime.toFixed(2)}ms/frame`)
      }

      // Check that scaling is roughly linear (not exponential)
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1]
        const curr = results[i]
        const objectRatio = curr.count / prev.count
        const timeRatio = curr.avgFrameTime / prev.avgFrameTime

        // Time ratio should not be much higher than object ratio
        expect(timeRatio).toBeLessThan(objectRatio * 2)
      }
    })
  })

  describe("memory management", () => {
    test("should not leak memory with object lifecycle", async () => {
      engine.reset("memory-test")
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      profiler.start()
      engine.start()
      profiler.takeSnapshot() // Take snapshot after setup

      const objects: TestProjectile[] = []

      // Create and destroy objects over time
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create batch of objects
        for (let i = 0; i < 100; i++) {
          const pos = new Vector2D(i, cycle * 10)
          const obj = new TestProjectile(
            `cycle${cycle}_obj${i}`,
            pos,
            new Vector2D(1, 0),
            10,
            100,
            "",
            engine,
          )
          objects.push(obj)
        }

        // Run for a few frames
        for (let frame = 0; frame < 10; frame++) {
          await ticker.tick(1)
        }

        // Destroy half the objects
        for (let i = 0; i < 50; i++) {
          if (objects[i] && !objects[i].isDestroyed()) {
            objects[i].destroy()
          }
        }

        // Clear destroyed objects from our tracking
        objects.splice(0, 50)

        // Force cleanup cycle
        if (global.gc) {
          global.gc()
        }
        if (cycle % 3 === 0) {
          profiler.takeSnapshot() // Periodic snapshots
        }
      }

      const profile = profiler.stop()

      // Memory growth should be reasonable
      expect(profile.memoryGrowth).toBeLessThan(50 * 1024 * 1024) // Less than 50MB

      console.log(
        `Memory lifecycle test: ${profile.memoryGrowth / 1024 / 1024}MB growth`,
      )
    })

    test("should handle rapid object creation/destruction", async () => {
      engine.reset("rapid-memory-test")
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      profiler.start()
      engine.start()
      profiler.takeSnapshot() // Take snapshot after setup

      // Rapid create/destroy cycle
      for (let frame = 0; frame < 100; frame++) {
        const objects: TestProjectile[] = []

        // Create many objects
        for (let i = 0; i < 50; i++) {
          const pos = new Vector2D(i, frame)
          const obj = new TestProjectile(
            `frame${frame}_obj${i}`,
            pos,
            new Vector2D(1, 1),
            10,
            100,
            "",
            engine,
          )
          objects.push(obj)
        }

        await ticker.tick(1)

        // Destroy all objects immediately
        for (const obj of objects) {
          obj.destroy()
        }

        // Force GC occasionally
        if (frame % 20 === 0 && global.gc) {
          global.gc()
          profiler.takeSnapshot() // Snapshot during GC cycles
        }
      }

      const profile = profiler.stop()

      // Should not accumulate too much memory
      expect(profile.memoryGrowth).toBeLessThan(30 * 1024 * 1024) // Less than 30MB

      console.log(
        `Rapid lifecycle test: ${profile.memoryGrowth / 1024 / 1024}MB growth`,
      )
    })
  })

  describe("recording performance", () => {
    test("should handle recording with minimal performance impact", async () => {
      const recorder = new GameRecorder()

      engine.reset("recording-perf-test")
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      // Create objects
      for (let i = 0; i < 300; i++) {
        const pos = new Vector2D(i % 30, Math.floor(i / 30))
        const velocity = new Vector2D(1, 0.5)
        new TestProjectile(`obj${i}`, pos, velocity, 10, 100, "", engine)
      }

      engine.start()

      // Measure without recording
      const noRecordingTimes: number[] = []
      for (let frame = 0; frame < 30; frame++) {
        const start = performance.now()
        await ticker.tick(1)
        const end = performance.now()
        noRecordingTimes.push(end - start)
      }

      // Reset and measure with recording
      engine.reset("recording-perf-test")
      for (let i = 0; i < 300; i++) {
        const pos = new Vector2D(i % 30, Math.floor(i / 30))
        const velocity = new Vector2D(1, 0.5)
        new TestProjectile(`obj${i}`, pos, velocity, 10, 100, "", engine)
      }

      engine.setGameRecorder(recorder)
      recorder.startRecording(engine.getEventManager(), "recording-perf-test")
      engine.start()

      const recordingTimes: number[] = []
      for (let frame = 0; frame < 30; frame++) {
        const start = performance.now()
        await ticker.tick(1)
        const end = performance.now()
        recordingTimes.push(end - start)
      }

      recorder.stopRecording()
      const recording = recorder.getCurrentRecording()

      // Calculate averages
      const avgNoRecording =
        noRecordingTimes.reduce((a, b) => a + b) / noRecordingTimes.length
      const avgWithRecording =
        recordingTimes.reduce((a, b) => a + b) / recordingTimes.length
      const overhead =
        ((avgWithRecording - avgNoRecording) / avgNoRecording) * 100

      // Recording should not add more than 50% overhead
      expect(overhead).toBeLessThan(50)

      // Recording should be successful
      expect(recording).toBeDefined()
      expect(recording!.deltaFrames.length).toBeGreaterThan(0)

      console.log(`Recording overhead: ${overhead.toFixed(1)}%`)
      console.log(`Frames recorded: ${recording!.deltaFrames.length}`)
    })

    test("should handle serialization performance", async () => {
      // Create complex nested structure
      const complexData = {
        metadata: {
          version: "1.0.0",
          timestamp: Date.now(),
          createdAt: Date.now(),
          settings: {
            quality: "high",
            features: ["physics", "graphics", "audio"],
          },
        },
        objects: [] as any[],
        matrices: [] as number[][][],
      }

      // Add many objects with Vector2D positions
      for (let i = 0; i < 500; i++) {
        complexData.objects.push({
          id: `obj${i}`,
          position: new Vector2D(i * 2, i * 1.5),
          velocity: new Vector2D(Math.random() * 4 - 2, Math.random() * 4 - 2),
          properties: {
            health: 100 - (i % 100),
            level: Math.floor(i / 50) + 1,
            tags: [`tag${i % 10}`, `group${Math.floor(i / 100)}`],
          },
        })
      }

      // Add some matrices
      for (let i = 0; i < 50; i++) {
        const matrix = []
        for (let row = 0; row < 10; row++) {
          const matrixRow = []
          for (let col = 0; col < 10; col++) {
            matrixRow.push(Math.random())
          }
          matrix.push(matrixRow)
        }
        complexData.matrices.push(matrix)
      }

      // Measure serialization performance
      const serializeStart = performance.now()
      const serialized = serializer.serialize(complexData)
      const serializeEnd = performance.now()

      const serializeTime = serializeEnd - serializeStart

      // Measure deserialization performance
      const deserializeStart = performance.now()
      const deserialized = serializer.deserialize(serialized)
      const deserializeEnd = performance.now()

      const deserializeTime = deserializeEnd - deserializeStart

      // Performance should be reasonable
      expect(serializeTime).toBeLessThan(1000) // Under 1 second
      expect(deserializeTime).toBeLessThan(1000) // Under 1 second

      // Data integrity check
      expect(deserialized.metadata.version).toBe("1.0.0")
      expect(deserialized.objects).toHaveLength(500)
      expect(deserialized.matrices).toHaveLength(50)

      // Vector2D objects should be preserved
      expect(deserialized.objects[0].position).toBeInstanceOf(Vector2D)
      expect(deserialized.objects[0].velocity).toBeInstanceOf(Vector2D)

      console.log(
        `Serialization: ${serializeTime.toFixed(2)}ms, Deserialization: ${deserializeTime.toFixed(2)}ms`,
      )
    })
  })

  describe("collision performance", () => {
    test("should handle spatial partitioning efficiently", async () => {
      engine.reset("collision-perf-test")
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      const startTime = performance.now()

      // Create grid of objects that will test spatial partitioning
      const gridSize = 20
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          const pos = new Vector2D(x * 5, y * 5)
          const velocity = new Vector2D(
            (engine.getPRNG().random() - 0.5) * 2,
            (engine.getPRNG().random() - 0.5) * 2,
          )
          new TestProjectile(
            `grid_${x}_${y}`,
            pos,
            velocity,
            10,
            100,
            "",
            engine,
          )
        }
      }

      engine.start()

      // Run simulation with potential collisions
      for (let frame = 0; frame < 100; frame++) {
        await ticker.tick(1)
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should complete in reasonable time even with many objects
      expect(totalTime).toBeLessThan(3000) // Under 3 seconds

      console.log(
        `Collision performance test: ${totalTime}ms for ${gridSize * gridSize} objects`,
      )
    })
  })

  describe("stress testing", () => {
    test("should handle extreme object counts", async () => {
      engine.reset("stress-test")
      ticker.add((deltaFrames) => engine.update(deltaFrames))

      profiler.start()
      profiler.takeSnapshot() // Take snapshot after setup

      // Create very large number of objects
      const objectCount = 2000
      for (let i = 0; i < objectCount; i++) {
        const pos = new Vector2D((i % 50) * 10, Math.floor(i / 50) * 10)
        const velocity = new Vector2D(
          engine.getPRNG().random() * 4 - 2,
          engine.getPRNG().random() * 4 - 2,
        )
        new TestProjectile(`stress${i}`, pos, velocity, 10, 100, "", engine)
      }

      engine.start()
      profiler.takeSnapshot() // Take snapshot after engine start

      const frameStart = performance.now()

      // Run for fewer frames due to object count
      for (let frame = 0; frame < 20; frame++) {
        await ticker.tick(1)
        if (frame % 5 === 0) {
          profiler.takeSnapshot() // Periodic snapshots
        }
      }

      const frameEnd = performance.now()
      const profile = profiler.stop()

      const avgFrameTime = (frameEnd - frameStart) / 20

      // Should still be able to handle the load
      expect(avgFrameTime).toBeLessThan(200) // Under 200ms per frame
      expect(profile.memoryGrowth).toBeLessThan(200 * 1024 * 1024) // Under 200MB

      // Engine should still be in valid state
      expect(engine.getTotalFrames()).toBe(20)

      const activeObjects =
        engine.getGameObjectGroup("Projectile")?.getAllActive() || []
      expect(activeObjects.length).toBe(objectCount)

      console.log(
        `Stress test: ${avgFrameTime.toFixed(2)}ms/frame for ${objectCount} objects`,
      )
      console.log(`Memory usage: ${profile.memoryGrowth / 1024 / 1024}MB`)
    })
  })
})
