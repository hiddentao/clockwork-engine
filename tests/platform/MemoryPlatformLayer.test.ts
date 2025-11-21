import { beforeEach, describe, expect, it } from "bun:test"
import { MemoryAudioLayer } from "../../src/platform/memory/MemoryAudioLayer"
import { MemoryInputLayer } from "../../src/platform/memory/MemoryInputLayer"
import { MemoryPlatformLayer } from "../../src/platform/memory/MemoryPlatformLayer"
import { MemoryRenderingLayer } from "../../src/platform/memory/MemoryRenderingLayer"

describe("MemoryPlatformLayer", () => {
  let platform: MemoryPlatformLayer

  beforeEach(() => {
    platform = new MemoryPlatformLayer()
  })

  describe("Layer Composition", () => {
    it("should have rendering layer", () => {
      expect(platform.rendering).toBeDefined()
      expect(platform.rendering).toBeInstanceOf(MemoryRenderingLayer)
    })

    it("should have audio layer", () => {
      expect(platform.audio).toBeDefined()
      expect(platform.audio).toBeInstanceOf(MemoryAudioLayer)
    })

    it("should have input layer", () => {
      expect(platform.input).toBeDefined()
      expect(platform.input).toBeInstanceOf(MemoryInputLayer)
    })
  })

  describe("Device Pixel Ratio", () => {
    it("should return 1 for headless environment", () => {
      expect(platform.getDevicePixelRatio()).toBe(1)
    })
  })

  describe("Integration", () => {
    it("should allow creating nodes through rendering layer", () => {
      const node = platform.rendering.createNode()
      expect(node).toBeDefined()
    })

    it("should allow loading sounds through audio layer", async () => {
      await expect(
        platform.audio.loadSound("test", ""),
      ).resolves.toBeUndefined()
    })

    it("should allow registering input callbacks through input layer", () => {
      expect(() =>
        platform.input.onPointerDown(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })
  })

  describe("Independent Layers", () => {
    it("should have independent rendering state", () => {
      const node1 = platform.rendering.createNode()
      const node2 = platform.rendering.createNode()

      platform.rendering.setPosition(node1, 100, 200)
      const pos1 = platform.rendering.getPosition(node1)
      const pos2 = platform.rendering.getPosition(node2)

      expect(pos1.x).toBe(100)
      expect(pos2.x).toBe(0) // Different node, unaffected
    })

    it("should have independent audio state", async () => {
      await platform.audio.loadSound("sound1", "")
      await platform.audio.loadSound("sound2", "")

      expect(platform.audio.hasSound("sound1")).toBe(true)
      expect(platform.audio.hasSound("sound2")).toBe(true)
    })

    it("should have independent input callbacks", () => {
      let count1 = 0
      let count2 = 0

      platform.input.onPointerDown(() => count1++)
      platform.input.onKeyDown(() => count2++)

      platform.input.triggerPointerDown({ x: 0, y: 0, timestamp: Date.now() })
      expect(count1).toBe(1)
      expect(count2).toBe(0) // Different event type

      platform.input.triggerKeyDown({
        key: "a",
        code: "KeyA",
        timestamp: Date.now(),
      })
      expect(count1).toBe(1) // Still 1
      expect(count2).toBe(1) // Now 1
    })
  })

  describe("Full Platform Usage Example", () => {
    it("should support complete game scenario", async () => {
      // Setup rendering
      const root = platform.rendering.createNode()
      const player = platform.rendering.createNode()
      platform.rendering.addChild(root, player)
      platform.rendering.setPosition(player, 100, 200)

      // Load assets
      const textureId = await platform.rendering.loadTexture("player.png")
      platform.rendering.setSprite(player, textureId)

      await platform.audio.loadSound("jump", "")

      // Setup input
      let clickCount = 0
      platform.input.onClick(() => {
        clickCount++
        platform.audio.playSound("jump")
      })

      // Simulate click
      platform.input.triggerClick({ x: 100, y: 200, timestamp: Date.now() })

      // Verify state
      expect(clickCount).toBe(1)
      expect(platform.rendering.getPosition(player)).toEqual({ x: 100, y: 200 })
      expect(platform.audio.isPlaying("jump")).toBe(false) // Non-looping sound
    })
  })
})
