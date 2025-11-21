import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import {
  BlendMode,
  TextureFiltering,
  asTextureId,
} from "../../src/platform/types"
import { PixiRenderingLayer } from "../../src/platform/web/PixiRenderingLayer"
import {
  cleanupBrowserEnvironment,
  setupBrowserEnvironment,
} from "../setup/browser.setup"

describe("PixiRenderingLayer", () => {
  let canvas: HTMLCanvasElement
  let rendering: PixiRenderingLayer

  beforeEach(async () => {
    setupBrowserEnvironment()
    canvas = document.createElement("canvas")
    canvas.width = 800
    canvas.height = 600
    document.body.appendChild(canvas)

    rendering = new PixiRenderingLayer(canvas, {
      screenWidth: 800,
      screenHeight: 600,
      worldWidth: 800,
      worldHeight: 600,
    })
    await rendering.init()
  })

  afterEach(() => {
    rendering.destroy()
    document.body.removeChild(canvas)
    cleanupBrowserEnvironment()
  })

  describe("Initialization", () => {
    it("should create rendering layer", () => {
      expect(rendering).toBeDefined()
    })

    it("should support custom viewport options", async () => {
      const customRendering = new PixiRenderingLayer(canvas, {
        screenWidth: 800,
        screenHeight: 600,
        worldWidth: 1600,
        worldHeight: 1200,
        maxScale: 4,
        minScale: 0.25,
      })
      await customRendering.init()
      expect(customRendering).toBeDefined()
      customRendering.destroy()
    })
  })

  describe("Node Lifecycle", () => {
    it("should create node", () => {
      const nodeId = rendering.createNode()
      expect(nodeId).toBeDefined()
      expect(rendering.hasNode(nodeId)).toBe(true)
    })

    it("should create multiple nodes", () => {
      const node1 = rendering.createNode()
      const node2 = rendering.createNode()
      const node3 = rendering.createNode()

      expect(rendering.hasNode(node1)).toBe(true)
      expect(rendering.hasNode(node2)).toBe(true)
      expect(rendering.hasNode(node3)).toBe(true)
    })

    it("should destroy node", () => {
      const nodeId = rendering.createNode()
      rendering.destroyNode(nodeId)
      expect(rendering.hasNode(nodeId)).toBe(false)
    })
  })

  describe("Hierarchy", () => {
    it("should add child to parent", () => {
      const parent = rendering.createNode()
      const child = rendering.createNode()

      rendering.addChild(parent, child)

      const children = rendering.getChildren(parent)
      expect(children).toContain(child)
    })

    it("should remove child from parent", () => {
      const parent = rendering.createNode()
      const child = rendering.createNode()

      rendering.addChild(parent, child)
      rendering.removeChild(parent, child)

      const children = rendering.getChildren(parent)
      expect(children).not.toContain(child)
    })

    it("should get parent of child", () => {
      const parent = rendering.createNode()
      const child = rendering.createNode()

      rendering.addChild(parent, child)

      expect(rendering.getParent(child)).toBe(parent)
    })

    it("should return null for node without parent", () => {
      const node = rendering.createNode()
      expect(rendering.getParent(node)).toBeNull()
    })
  })

  describe("Transform", () => {
    it("should set and get position", () => {
      const node = rendering.createNode()
      rendering.setPosition(node, 100, 200)

      const pos = rendering.getPosition(node)
      expect(pos.x).toBe(100)
      expect(pos.y).toBe(200)
    })

    it("should set and get rotation", () => {
      const node = rendering.createNode()
      rendering.setRotation(node, Math.PI / 2)

      const rotation = rendering.getRotation(node)
      expect(rotation).toBeCloseTo(Math.PI / 2, 5)
    })

    it("should set and get scale", () => {
      const node = rendering.createNode()
      rendering.setScale(node, 2, 3)

      const scale = rendering.getScale(node)
      expect(scale.x).toBe(2)
      expect(scale.y).toBe(3)
    })

    it("should set and get anchor", () => {
      const node = rendering.createNode()
      rendering.setAnchor(node, 0.5, 1)

      const anchor = rendering.getAnchor(node)
      expect(anchor.x).toBe(0.5)
      expect(anchor.y).toBe(1)
    })

    it("should set and get alpha", () => {
      const node = rendering.createNode()
      rendering.setAlpha(node, 0.7)

      const alpha = rendering.getAlpha(node)
      expect(alpha).toBe(0.7)
    })

    it("should set and get visibility", () => {
      const node = rendering.createNode()
      rendering.setVisible(node, false)

      expect(rendering.getVisible(node)).toBe(false)
    })

    it("should set and get z-index", () => {
      const node = rendering.createNode()
      rendering.setZIndex(node, 10)

      expect(rendering.getZIndex(node)).toBe(10)
    })
  })

  describe("Size", () => {
    it("should set and get size", () => {
      const node = rendering.createNode()
      rendering.setSize(node, 100, 50)

      const size = rendering.getSize(node)
      expect(size.width).toBe(100)
      expect(size.height).toBe(50)
    })
  })

  describe("Visual Effects", () => {
    it("should set and get tint with hex color", () => {
      const node = rendering.createNode()
      rendering.setTint(node, 0xff0000)

      const tint = rendering.getTint(node)
      expect(tint).toBe(0xff0000)
    })

    it("should set and get tint with RGB object", () => {
      const node = rendering.createNode()
      rendering.setTint(node, { r: 255, g: 0, b: 0 })

      const tint = rendering.getTint(node)
      expect(tint).toEqual({ r: 255, g: 0, b: 0 })
    })

    it("should set and get blend mode", () => {
      const node = rendering.createNode()
      rendering.setBlendMode(node, BlendMode.ADD)

      expect(rendering.getBlendMode(node)).toBe(BlendMode.ADD)
    })

    it("should set and get texture filtering", () => {
      const node = rendering.createNode()
      rendering.setTextureFiltering(node, TextureFiltering.NEAREST)

      expect(rendering.getTextureFiltering(node)).toBe(TextureFiltering.NEAREST)
    })
  })

  describe("Bounds", () => {
    it("should get bounds of node", () => {
      const node = rendering.createNode()
      rendering.setPosition(node, 100, 200)
      rendering.setSize(node, 50, 30)

      const bounds = rendering.getBounds(node)
      expect(bounds.x).toBe(100)
      expect(bounds.y).toBe(200)
      expect(bounds.width).toBe(50)
      expect(bounds.height).toBe(30)
    })

    it("should account for anchor in bounds", () => {
      const node = rendering.createNode()
      rendering.setPosition(node, 100, 200)
      rendering.setSize(node, 50, 30)
      rendering.setAnchor(node, 0.5, 0.5)

      const bounds = rendering.getBounds(node)
      expect(bounds.x).toBe(75)
      expect(bounds.y).toBe(185)
      expect(bounds.width).toBe(50)
      expect(bounds.height).toBe(30)
    })
  })

  describe("Sprites", () => {
    it("should set sprite texture", () => {
      const node = rendering.createNode()
      const textureId = asTextureId(1)

      expect(() => rendering.setSprite(node, textureId)).not.toThrow()
    })

    it("should set animated sprite", () => {
      const node = rendering.createNode()
      const textures = [asTextureId(1), asTextureId(2), asTextureId(3)]

      rendering.setAnimatedSprite(node, textures, 5)

      const animData = rendering.getAnimationData(node)
      expect(animData?.textures).toEqual(textures)
      expect(animData?.ticksPerFrame).toBe(5)
    })

    it("should play animation", () => {
      const node = rendering.createNode()
      const textures = [asTextureId(1), asTextureId(2)]

      rendering.setAnimatedSprite(node, textures, 5)
      rendering.playAnimation(node, false)

      expect(rendering.isAnimationPlaying(node)).toBe(true)
    })

    it("should stop animation", () => {
      const node = rendering.createNode()
      const textures = [asTextureId(1), asTextureId(2)]

      rendering.setAnimatedSprite(node, textures, 5)
      rendering.playAnimation(node, true)
      rendering.stopAnimation(node)

      expect(rendering.isAnimationPlaying(node)).toBe(false)
    })
  })

  describe("Graphics Primitives", () => {
    it("should draw rectangle", () => {
      const node = rendering.createNode()
      rendering.drawRectangle(node, 10, 20, 100, 50, 0xff0000)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("rectangle")
    })

    it("should draw circle", () => {
      const node = rendering.createNode()
      rendering.drawCircle(node, 50, 50, 25, 0x00ff00)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("circle")
    })

    it("should draw polygon", () => {
      const node = rendering.createNode()
      const points = [0, 0, 100, 0, 50, 100]
      rendering.drawPolygon(node, points, 0x0000ff)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("polygon")
    })

    it("should draw line", () => {
      const node = rendering.createNode()
      rendering.drawLine(node, 0, 0, 100, 100, 0xffffff, 2)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("line")
    })

    it("should draw polyline", () => {
      const node = rendering.createNode()
      const points = [0, 0, 50, 50, 100, 0]
      rendering.drawPolyline(node, points, 0xffffff, 2)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("polyline")
    })

    it("should support stroke on primitives", () => {
      const node = rendering.createNode()
      rendering.drawRectangle(node, 0, 0, 100, 100, 0xff0000, 0xffffff, 2)

      const graphics = rendering.getGraphics(node)
      expect(graphics[0].data.stroke).toBe(0xffffff)
      expect(graphics[0].data.strokeWidth).toBe(2)
    })

    it("should clear graphics", () => {
      const node = rendering.createNode()
      rendering.drawRectangle(node, 0, 0, 100, 100)
      rendering.clearGraphics(node)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(0)
    })
  })

  describe("Viewport", () => {
    it("should get viewport zoom", () => {
      const zoom = rendering.getViewportZoom()
      expect(typeof zoom).toBe("number")
      expect(zoom).toBeGreaterThan(0)
    })

    it("should resize canvas", () => {
      expect(() => rendering.resize(1024, 768)).not.toThrow()
    })

    it("should track dirty state", () => {
      expect(rendering.needsRepaint).toBeDefined()
      expect(typeof rendering.needsRepaint).toBe("boolean")
    })
  })

  describe("Texture Loading", () => {
    it("should load texture from URL", async () => {
      const textureId = await rendering.loadTexture("test.png")
      expect(textureId).toBeDefined()
    })

    it("should handle spritesheet loading", async () => {
      const spritesheetId = await rendering.loadSpritesheet("sheet.png", {
        tileWidth: 32,
        tileHeight: 32,
      })
      expect(spritesheetId).toBeDefined()
    })

    it("should set sprite from spritesheet", async () => {
      const spritesheetId = await rendering.loadSpritesheet("sheet.png", {
        tileWidth: 32,
        tileHeight: 32,
      })
      const node = rendering.createNode()

      expect(() =>
        rendering.setSpriteFromSpritesheet(node, String(spritesheetId), 0, 0),
      ).not.toThrow()
    })
  })

  describe("Device Pixel Ratio", () => {
    it("should get device pixel ratio", () => {
      const dpr = rendering.getDevicePixelRatio()
      expect(typeof dpr).toBe("number")
      expect(dpr).toBeGreaterThan(0)
    })
  })
})
