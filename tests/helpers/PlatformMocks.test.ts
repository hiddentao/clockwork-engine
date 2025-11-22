import { beforeEach, describe, expect, it } from "bun:test"
import { MockRenderingLayer } from "./PlatformMocks"

describe("MockRenderingLayer", () => {
  let mock: MockRenderingLayer

  beforeEach(() => {
    mock = new MockRenderingLayer()
  })

  describe("FPS Reporting", () => {
    it("should return 60 FPS", () => {
      expect(mock.getFPS()).toBe(60)
    })

    it("should return consistent FPS across multiple calls", () => {
      const fps1 = mock.getFPS()
      const fps2 = mock.getFPS()
      const fps3 = mock.getFPS()

      expect(fps1).toBe(fps2)
      expect(fps2).toBe(fps3)
      expect(fps1).toBe(60)
    })

    it("should return FPS independently of other operations", () => {
      const node = mock.createNode()
      mock.setPosition(node, 100, 200)

      const fps = mock.getFPS()
      expect(fps).toBe(60)
    })
  })

  describe("Tick Callback Management", () => {
    it("should store tick callback", () => {
      let called = false
      const callback = () => {
        called = true
      }

      mock.onTick(callback)
      mock.simulateTick(1000)

      expect(called).toBe(true)
    })

    it("should pass delta to tick callback", () => {
      let receivedDelta = 0
      const callback = (delta: number) => {
        receivedDelta = delta
      }

      mock.onTick(callback)
      mock.simulateTick(1234)

      expect(receivedDelta).toBe(1234)
    })

    it("should handle multiple simulateTick calls", () => {
      let count = 0
      const callback = () => count++

      mock.onTick(callback)
      mock.simulateTick(1)
      mock.simulateTick(1)
      mock.simulateTick(1)

      expect(count).toBe(3)
    })

    it("should replace callback on subsequent onTick calls", () => {
      let count1 = 0
      let count2 = 0

      const callback1 = () => count1++
      const callback2 = () => count2++

      mock.onTick(callback1)
      mock.onTick(callback2)

      mock.simulateTick(1)

      expect(count1).toBe(0)
      expect(count2).toBe(1)
    })

    it("should handle simulateTick with no callback", () => {
      expect(() => mock.simulateTick(1)).not.toThrow()
    })

    it("should work with different delta values", () => {
      const deltas: number[] = []
      const callback = (delta: number) => deltas.push(delta)

      mock.onTick(callback)
      mock.simulateTick(100)
      mock.simulateTick(200)
      mock.simulateTick(300)

      expect(deltas).toEqual([100, 200, 300])
    })
  })

  describe("Integration with Other Mock Methods", () => {
    it("should getFPS while using tick callbacks", () => {
      let fpsReadings: number[] = []
      const callback = () => {
        fpsReadings.push(mock.getFPS())
      }

      mock.onTick(callback)
      mock.simulateTick(1)
      mock.simulateTick(1)

      expect(fpsReadings).toEqual([60, 60])
    })

    it("should maintain FPS after destroy", () => {
      mock.destroy()
      const fps = mock.getFPS()
      expect(fps).toBe(60)
    })

    it("should work with ticker speed changes", () => {
      mock.setTickerSpeed(2)
      const speed = mock.getTickerSpeed()
      const fps = mock.getFPS()

      expect(speed).toBe(2)
      expect(fps).toBe(60)
    })
  })

  describe("Edge Cases", () => {
    it("should handle rapid FPS queries", () => {
      const fps: number[] = []
      for (let i = 0; i < 100; i++) {
        fps.push(mock.getFPS())
      }

      expect(fps.every((f) => f === 60)).toBe(true)
    })

    it("should handle callback with side effects", () => {
      const sideEffects: string[] = []
      const callback = (delta: number) => {
        sideEffects.push(`tick:${delta}`)
        mock.getFPS()
        sideEffects.push("fps")
      }

      mock.onTick(callback)
      mock.simulateTick(42)

      expect(sideEffects).toEqual(["tick:42", "fps"])
    })
  })
})
