import { describe, expect, it } from "bun:test"
import { MemoryPlatformLayer } from "../../src/platform/memory/MemoryPlatformLayer"

describe("Tick Callback Duplication Prevention", () => {
  describe("Scenario: Multiple callback registrations", () => {
    it("should not register duplicate tick callbacks", () => {
      const platform = new MemoryPlatformLayer()
      let tickCount = 0
      const callback = () => tickCount++

      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)

      platform.rendering.tick(1)
      expect(tickCount).toBe(1)
    })

    it("should not accumulate callbacks during multiple registrations", () => {
      const platform = new MemoryPlatformLayer()
      let callbackCount = 0
      const callback = () => callbackCount++

      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)

      platform.rendering.tick(1)
      expect(callbackCount).toBe(1)
    })

    it("should handle multiple different callbacks correctly", () => {
      const platform = new MemoryPlatformLayer()
      let count1 = 0
      let count2 = 0
      const callback1 = () => count1++
      const callback2 = () => count2++

      platform.rendering.onTick(callback1)
      platform.rendering.onTick(callback2)

      platform.rendering.tick(1)
      expect(count1).toBe(1)
      expect(count2).toBe(1)
    })
  })

  describe("Scenario: Engine switching", () => {
    it("should not register duplicate callbacks when switching engines", () => {
      const platform = new MemoryPlatformLayer()
      let totalTicks = 0
      const callback = (delta: number) => {
        totalTicks += delta
      }

      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)

      platform.rendering.tick(1000)
      expect(totalTicks).toBe(1000)
    })

    it("should maintain single callback after multiple setup calls", () => {
      const platform = new MemoryPlatformLayer()
      let setupCount = 0
      const callback = () => setupCount++

      for (let i = 0; i < 5; i++) {
        platform.rendering.onTick(callback)
      }

      platform.rendering.tick(1)
      expect(setupCount).toBe(1)
    })
  })

  describe("Scenario: FPS display update loop", () => {
    it("should maintain consistent FPS when callback is registered multiple times", () => {
      const platform = new MemoryPlatformLayer()
      const fpsReadings: number[] = []
      const callback = () => {
        fpsReadings.push(platform.rendering.getFPS())
      }

      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)

      platform.rendering.tick(1)

      expect(fpsReadings.length).toBe(1)
      expect(fpsReadings[0]).toBe(60)
    })

    it("should not multiply tick accumulation with duplicate callbacks", () => {
      const platform = new MemoryPlatformLayer()
      let totalTicks = 0
      const callback = (delta: number) => {
        totalTicks += delta
      }

      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)

      platform.rendering.tick(1000)
      platform.rendering.tick(1000)
      platform.rendering.tick(1000)

      expect(totalTicks).toBe(3000)
    })
  })

  describe("Scenario: Snake speed bug verification", () => {
    it("should ensure ticks accumulate at correct rate (no 2x multiplication)", () => {
      const platform = new MemoryPlatformLayer()
      let accumulator = 0
      const SNAKE_MOVE_INTERVAL = 6000

      const callback = (deltaTicks: number) => {
        accumulator += deltaTicks
      }

      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)

      for (let frame = 0; frame < 6; frame++) {
        platform.rendering.tick(1000)
      }

      expect(accumulator).toBe(SNAKE_MOVE_INTERVAL)
    })

    it("should fire timer at correct intervals with duplicate prevention", () => {
      const platform = new MemoryPlatformLayer()
      let currentTick = 0
      let moveCount = 0
      const SNAKE_MOVE_INTERVAL = 6000

      const callback = (deltaTicks: number) => {
        currentTick += deltaTicks
        if (currentTick >= SNAKE_MOVE_INTERVAL) {
          moveCount++
          currentTick = 0
        }
      }

      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)

      for (let frame = 0; frame < 18; frame++) {
        platform.rendering.tick(1000)
      }

      expect(moveCount).toBe(3)
    })
  })

  describe("Scenario: Cleanup and re-registration", () => {
    it("should allow callback re-registration after clear", () => {
      const platform = new MemoryPlatformLayer()
      let callCount = 0
      const callback = () => callCount++

      platform.rendering.onTick(callback)
      platform.rendering.tick(1)
      expect(callCount).toBe(1)

      platform.rendering.destroy()
      platform.rendering.tick(1)
      expect(callCount).toBe(1)
    })

    it("should handle rapid registration across multiple platform instances", () => {
      let callCount = 0
      const callback = () => callCount++

      for (let i = 0; i < 5; i++) {
        const platform = new MemoryPlatformLayer()
        platform.rendering.onTick(callback)
        platform.rendering.tick(1)
      }

      expect(callCount).toBe(5)
    })
  })

  describe("Edge Cases", () => {
    it("should handle zero delta ticks", () => {
      const platform = new MemoryPlatformLayer()
      let callCount = 0
      const callback = () => callCount++

      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)

      platform.rendering.tick(0)
      expect(callCount).toBe(1)
    })

    it("should handle large delta ticks", () => {
      const platform = new MemoryPlatformLayer()
      let totalTicks = 0
      const callback = (delta: number) => {
        totalTicks += delta
      }

      platform.rendering.onTick(callback)
      platform.rendering.onTick(callback)

      platform.rendering.tick(100000)
      expect(totalTicks).toBe(100000)
    })

    it("should handle mixed callback patterns", () => {
      const platform = new MemoryPlatformLayer()
      let count1 = 0
      let count2 = 0

      const callback1 = () => count1++
      const callback2 = () => count2++

      platform.rendering.onTick(callback1)
      platform.rendering.onTick(callback1)
      platform.rendering.onTick(callback2)
      platform.rendering.onTick(callback1)

      platform.rendering.tick(1)

      expect(count1).toBe(1)
      expect(count2).toBe(1)
    })
  })
})
