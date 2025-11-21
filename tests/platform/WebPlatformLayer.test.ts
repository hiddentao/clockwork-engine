import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { WebPlatformLayer } from "../../src/platform/web/WebPlatformLayer"
import {
  cleanupBrowserEnvironment,
  setupBrowserEnvironment,
} from "../setup/browser.setup"

describe("WebPlatformLayer", () => {
  let canvas: HTMLCanvasElement
  let container: HTMLDivElement
  let platform: WebPlatformLayer

  beforeEach(async () => {
    setupBrowserEnvironment()

    canvas = document.createElement("canvas")
    canvas.width = 800
    canvas.height = 600
    document.body.appendChild(canvas)

    container = document.createElement("div")
    document.body.appendChild(container)

    platform = new WebPlatformLayer(canvas, container, {
      screenWidth: 800,
      screenHeight: 600,
      worldWidth: 800,
      worldHeight: 600,
    })
    await platform.init()
  })

  afterEach(() => {
    platform.destroy()
    document.body.removeChild(canvas)
    document.body.removeChild(container)
    cleanupBrowserEnvironment()
  })

  describe("Initialization", () => {
    it("should create platform layer", () => {
      expect(platform).toBeDefined()
    })

    it("should have rendering layer", () => {
      expect(platform.rendering).toBeDefined()
    })

    it("should have audio layer", () => {
      expect(platform.audio).toBeDefined()
    })

    it("should have input layer", () => {
      expect(platform.input).toBeDefined()
    })
  })

  describe("Device Pixel Ratio", () => {
    it("should get device pixel ratio", () => {
      const dpr = platform.getDevicePixelRatio()
      expect(typeof dpr).toBe("number")
      expect(dpr).toBeGreaterThan(0)
    })
  })

  describe("Layer Integration", () => {
    it("should allow rendering operations", () => {
      const node = platform.rendering.createNode()
      expect(platform.rendering.hasNode(node)).toBe(true)
    })

    it("should allow audio operations", async () => {
      await expect(platform.audio.initialize()).resolves.toBeUndefined()
      expect(platform.audio.getState()).toBeDefined()
    })

    it("should allow input operations", () => {
      expect(() =>
        platform.input.onPointerDown(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })
  })

  describe("Cleanup", () => {
    it("should destroy without errors", () => {
      expect(() => platform.destroy()).not.toThrow()
    })

    it("should clean up all layers", () => {
      const node = platform.rendering.createNode()
      platform.destroy()

      expect(platform.rendering.hasNode(node)).toBe(false)
      expect(platform.audio.getState()).toBe("closed")
    })
  })
})
