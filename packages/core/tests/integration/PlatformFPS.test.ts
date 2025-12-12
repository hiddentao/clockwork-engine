import { describe, expect, it } from "bun:test"
import { MemoryPlatformLayer } from "@clockwork-engine/platform-memory"

describe("Platform FPS Integration", () => {
  describe("MemoryPlatformLayer", () => {
    it("should report 60 FPS", () => {
      const platform = new MemoryPlatformLayer()
      const fps = platform.rendering.getFPS()
      expect(fps).toBe(60)
    })

    it("should maintain consistent FPS reporting", () => {
      const platform = new MemoryPlatformLayer()
      const fps1 = platform.rendering.getFPS()
      const fps2 = platform.rendering.getFPS()
      const fps3 = platform.rendering.getFPS()

      expect(fps1).toBe(fps2)
      expect(fps2).toBe(fps3)
      expect(fps1).toBe(60)
    })

    it("should report FPS independently of tick callbacks", () => {
      const platform = new MemoryPlatformLayer()
      const callback = () => {
        /* noop */
      }

      platform.rendering.onTick(callback)
      const fps = platform.rendering.getFPS()

      expect(fps).toBe(60)
    })

    it("should report FPS after multiple tick registrations", () => {
      const platform = new MemoryPlatformLayer()
      const callback1 = () => {
        /* noop */
      }
      const callback2 = () => {
        /* noop */
      }

      platform.rendering.onTick(callback1)
      platform.rendering.onTick(callback2)

      const fps = platform.rendering.getFPS()
      expect(fps).toBe(60)
    })

    it("should report FPS after rendering layer destroy", () => {
      const platform = new MemoryPlatformLayer()
      platform.rendering.destroy()

      const fps = platform.rendering.getFPS()
      expect(fps).toBe(60)
    })
  })
})
