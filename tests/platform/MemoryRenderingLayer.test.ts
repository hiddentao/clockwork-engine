import { beforeEach, describe, expect, it } from "bun:test"
import { MemoryRenderingLayer } from "../../src/platform/memory/MemoryRenderingLayer"
import {
  BlendMode,
  TextureFiltering,
  asTextureId,
} from "../../src/platform/types"

describe("MemoryRenderingLayer", () => {
  let rendering: MemoryRenderingLayer

  beforeEach(() => {
    rendering = new MemoryRenderingLayer()
  })

  describe("Node Lifecycle", () => {
    it("should create nodes with unique IDs", () => {
      const node1 = rendering.createNode()
      const node2 = rendering.createNode()
      expect(node1).not.toBe(node2)
    })

    it("should track created nodes", () => {
      const node = rendering.createNode()
      expect(rendering.hasNode(node)).toBe(true)
    })

    it("should destroy nodes", () => {
      const node = rendering.createNode()
      rendering.destroyNode(node)
      expect(rendering.hasNode(node)).toBe(false)
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

    it("should support multiple children", () => {
      const parent = rendering.createNode()
      const child1 = rendering.createNode()
      const child2 = rendering.createNode()

      rendering.addChild(parent, child1)
      rendering.addChild(parent, child2)

      const children = rendering.getChildren(parent)
      expect(children.length).toBe(2)
      expect(children).toContain(child1)
      expect(children).toContain(child2)
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
      expect(rotation).toBe(Math.PI / 2)
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
      rendering.setAlpha(node, 0.5)

      const alpha = rendering.getAlpha(node)
      expect(alpha).toBe(0.5)
    })

    it("should set and get visibility", () => {
      const node = rendering.createNode()
      rendering.setVisible(node, false)

      const visible = rendering.getVisible(node)
      expect(visible).toBe(false)
    })

    it("should set and get z-index", () => {
      const node = rendering.createNode()
      rendering.setZIndex(node, 10)

      const zIndex = rendering.getZIndex(node)
      expect(zIndex).toBe(10)
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
    it("should set tint (hex color)", () => {
      const node = rendering.createNode()
      rendering.setTint(node, 0xff0000)

      const tint = rendering.getTint(node)
      expect(tint).toBe(0xff0000)
    })

    it("should set tint (RGB object)", () => {
      const node = rendering.createNode()
      rendering.setTint(node, { r: 255, g: 0, b: 0 })

      const tint = rendering.getTint(node)
      expect(tint).toEqual({ r: 255, g: 0, b: 0 })
    })

    it("should set blend mode", () => {
      const node = rendering.createNode()
      rendering.setBlendMode(node, BlendMode.ADD)

      const mode = rendering.getBlendMode(node)
      expect(mode).toBe(BlendMode.ADD)
    })

    it("should set texture filtering", () => {
      const node = rendering.createNode()
      rendering.setTextureFiltering(node, TextureFiltering.NEAREST)

      const filtering = rendering.getTextureFiltering(node)
      expect(filtering).toBe(TextureFiltering.NEAREST)
    })
  })

  describe("Bounds", () => {
    it("should calculate bounds for positioned node", () => {
      const node = rendering.createNode()
      rendering.setPosition(node, 100, 200)
      rendering.setSize(node, 50, 30)

      const bounds = rendering.getBounds(node)
      expect(bounds.x).toBe(100)
      expect(bounds.y).toBe(200)
      expect(bounds.width).toBe(50)
      expect(bounds.height).toBe(30)
    })

    it("should calculate bounds with anchor offset", () => {
      const node = rendering.createNode()
      rendering.setPosition(node, 100, 200)
      rendering.setSize(node, 50, 30)
      rendering.setAnchor(node, 0.5, 0.5)

      const bounds = rendering.getBounds(node)
      expect(bounds.x).toBe(75) // 100 - (50 * 0.5)
      expect(bounds.y).toBe(185) // 200 - (30 * 0.5)
    })
  })

  describe("Sprites and Animation", () => {
    it("should set sprite texture", () => {
      const node = rendering.createNode()
      const texture = asTextureId(1)
      rendering.setSprite(node, texture)

      const spriteTexture = rendering.getSpriteTexture(node)
      expect(spriteTexture).toBe(texture)
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
      rendering.playAnimation(node, true)

      const isPlaying = rendering.isAnimationPlaying(node)
      expect(isPlaying).toBe(true)
    })

    it("should stop animation", () => {
      const node = rendering.createNode()
      const textures = [asTextureId(1), asTextureId(2)]
      rendering.setAnimatedSprite(node, textures, 5)
      rendering.playAnimation(node, true)
      rendering.stopAnimation(node)

      const isPlaying = rendering.isAnimationPlaying(node)
      expect(isPlaying).toBe(false)
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

    it("should clear graphics", () => {
      const node = rendering.createNode()
      rendering.drawRectangle(node, 0, 0, 100, 100)
      rendering.clearGraphics(node)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(0)
    })

    it("should draw rounded rectangle", () => {
      const node = rendering.createNode()
      rendering.drawRoundRect(node, 10, 20, 100, 50, 8, 0xff0000, 0x000000, 2)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("roundRect")
      expect(graphics[0].data.x).toBe(10)
      expect(graphics[0].data.y).toBe(20)
      expect(graphics[0].data.w).toBe(100)
      expect(graphics[0].data.h).toBe(50)
      expect(graphics[0].data.radius).toBe(8)
      expect(graphics[0].data.fill).toBe(0xff0000)
      expect(graphics[0].data.stroke).toBe(0x000000)
      expect(graphics[0].data.strokeWidth).toBe(2)
    })

    it("should draw rounded rectangle with only fill", () => {
      const node = rendering.createNode()
      rendering.drawRoundRect(node, 0, 0, 50, 50, 5, 0x00ff00)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(1)
      expect(graphics[0].data.fill).toBe(0x00ff00)
      expect(graphics[0].data.stroke).toBeUndefined()
    })

    it("should clear rounded rectangles with clearGraphics", () => {
      const node = rendering.createNode()
      rendering.drawRoundRect(node, 0, 0, 100, 100, 10)
      rendering.clearGraphics(node)

      const graphics = rendering.getGraphics(node)
      expect(graphics.length).toBe(0)
    })
  })

  describe("Texture Loading", () => {
    it("should load texture and return ID", async () => {
      const textureId = await rendering.loadTexture("path/to/image.png")
      expect(textureId).toBeDefined()
    })

    it("should handle empty texture URLs", async () => {
      const textureId = await rendering.loadTexture("")
      expect(textureId).toBeDefined()
    })

    it("should load spritesheet", async () => {
      const sheetId = await rendering.loadSpritesheet("path/to/sheet.png", {
        frames: {
          frame1: { frame: { x: 0, y: 0, w: 32, h: 32 } },
          frame2: { frame: { x: 32, y: 0, w: 32, h: 32 } },
        },
      })
      expect(sheetId).toBeDefined()
    })

    it("should get texture from spritesheet", async () => {
      const sheetId = await rendering.loadSpritesheet("path/to/sheet.png", {
        frames: {
          frame1: { frame: { x: 0, y: 0, w: 32, h: 32 } },
        },
      })
      const textureId = rendering.getTexture(sheetId, "frame1")
      expect(textureId).not.toBeNull()
    })

    it("should return null for non-existent frame", async () => {
      const sheetId = await rendering.loadSpritesheet("path/to/sheet.png", {})
      const textureId = rendering.getTexture(sheetId, "nonexistent")
      expect(textureId).toBeNull()
    })
  })

  describe("Viewport", () => {
    it("should set viewport on node", () => {
      const node = rendering.createNode()
      rendering.setViewport(node, {
        screenWidth: 800,
        screenHeight: 600,
        worldWidth: 2000,
        worldHeight: 1500,
      })

      const viewport = rendering.getViewportData(node)
      expect(viewport).toBeDefined()
      expect(viewport?.screenWidth).toBe(800)
    })

    it("should get and set viewport position", () => {
      const node = rendering.createNode()
      rendering.setViewport(node, {
        screenWidth: 800,
        screenHeight: 600,
      })
      rendering.setViewportPosition(node, 100, 200)

      const pos = rendering.getViewportPosition(node)
      expect(pos.x).toBe(100)
      expect(pos.y).toBe(200)
    })

    it("should get and set viewport zoom", () => {
      const node = rendering.createNode()
      rendering.setViewport(node, {
        screenWidth: 800,
        screenHeight: 600,
      })
      rendering.setViewportZoom(node, 2)

      const zoom = rendering.getViewportZoom(node)
      expect(zoom).toBe(2)
    })

    it("should convert world to screen coordinates", () => {
      const node = rendering.createNode()
      rendering.setViewport(node, {
        screenWidth: 800,
        screenHeight: 600,
      })
      rendering.setViewportZoom(node, 1)
      rendering.setViewportPosition(node, 0, 0)

      const screen = rendering.worldToScreen(node, 100, 200)
      expect(screen.x).toBe(100)
      expect(screen.y).toBe(200)
    })

    it("should convert screen to world coordinates", () => {
      const node = rendering.createNode()
      rendering.setViewport(node, {
        screenWidth: 800,
        screenHeight: 600,
      })
      rendering.setViewportZoom(node, 1)
      rendering.setViewportPosition(node, 0, 0)

      const world = rendering.screenToWorld(node, 100, 200)
      expect(world.x).toBe(100)
      expect(world.y).toBe(200)
    })
  })

  describe("Game Loop", () => {
    it("should register tick callback", () => {
      let tickCalled = false
      rendering.onTick((_delta) => {
        tickCalled = true
      })

      // Manual tick for testing
      rendering.tick(1)
      expect(tickCalled).toBe(true)
    })

    it("should pass delta to tick callback", () => {
      let receivedDelta = 0
      rendering.onTick((delta) => {
        receivedDelta = delta
      })

      rendering.tick(5)
      expect(receivedDelta).toBe(5)
    })

    it("should set ticker speed", () => {
      rendering.setTickerSpeed(2)
      const speed = rendering.getTickerSpeed()
      expect(speed).toBe(2)
    })

    it("should handle multiple sequential ticks", () => {
      const receivedDeltas: number[] = []
      rendering.onTick((delta) => {
        receivedDeltas.push(delta)
      })

      rendering.tick(1000)
      rendering.tick(500)
      rendering.tick(1500)

      expect(receivedDeltas).toEqual([1000, 500, 1500])
    })

    it("should call multiple callbacks for each tick", () => {
      let callback1Count = 0
      let callback2Count = 0
      let callback1Delta = 0
      let callback2Delta = 0

      rendering.onTick((delta) => {
        callback1Count++
        callback1Delta = delta
      })

      rendering.onTick((delta) => {
        callback2Count++
        callback2Delta = delta
      })

      rendering.tick(1000)

      expect(callback1Count).toBe(1)
      expect(callback2Count).toBe(1)
      expect(callback1Delta).toBe(1000)
      expect(callback2Delta).toBe(1000)
    })

    it("should handle variable deltaTicks matching PIXI ticker behavior", () => {
      const receivedDeltas: number[] = []
      rendering.onTick((delta) => {
        receivedDeltas.push(delta)
      })

      rendering.tick(500)
      rendering.tick(1000)
      rendering.tick(1500)
      rendering.tick(2000)

      expect(receivedDeltas).toEqual([500, 1000, 1500, 2000])
    })

    it("should accumulate ticks correctly", () => {
      let totalTicks = 0
      rendering.onTick((delta) => {
        totalTicks += delta
      })

      rendering.tick(1000)
      rendering.tick(1000)
      rendering.tick(1000)

      expect(totalTicks).toBe(3000)
    })
  })

  describe("Game Loop (EventCallbackManager Integration)", () => {
    it("should prevent duplicate onTick callback registration", () => {
      let callCount = 0
      const callback = () => callCount++

      rendering.onTick(callback)
      rendering.onTick(callback)

      rendering.tick(1)
      expect(callCount).toBe(1)
    })

    it("should support multiple different onTick callbacks", () => {
      let count1 = 0
      let count2 = 0
      const callback1 = () => count1++
      const callback2 = () => count2++

      rendering.onTick(callback1)
      rendering.onTick(callback2)

      rendering.tick(1)
      expect(count1).toBe(1)
      expect(count2).toBe(1)
    })

    it("should clear tick callbacks on destroy", () => {
      let callCount = 0
      const callback = () => callCount++

      rendering.onTick(callback)
      rendering.destroy()
      rendering.tick(1)

      expect(callCount).toBe(0)
    })

    it("should not call duplicate callbacks even after multiple registrations", () => {
      let callCount = 0
      const callback = () => callCount++

      rendering.onTick(callback)
      rendering.onTick(callback)
      rendering.onTick(callback)

      rendering.tick(1)
      rendering.tick(1)

      expect(callCount).toBe(2)
    })

    it("should handle rapid tick cycles with duplicate prevention", () => {
      let callCount = 0
      const callback = () => callCount++

      rendering.onTick(callback)
      rendering.onTick(callback)

      for (let i = 0; i < 10; i++) {
        rendering.tick(1)
      }

      expect(callCount).toBe(10)
    })
  })

  describe("FPS Reporting", () => {
    it("should return 60 FPS", () => {
      const fps = rendering.getFPS()
      expect(fps).toBe(60)
    })

    it("should return consistent FPS across multiple calls", () => {
      const fps1 = rendering.getFPS()
      const fps2 = rendering.getFPS()
      const fps3 = rendering.getFPS()

      expect(fps1).toBe(fps2)
      expect(fps2).toBe(fps3)
      expect(fps1).toBe(60)
    })

    it("should return FPS independently of tick callbacks", () => {
      const callback = () => {
        /* noop */
      }
      rendering.onTick(callback)

      const fps = rendering.getFPS()
      expect(fps).toBe(60)
    })

    it("should return FPS after destroy", () => {
      rendering.destroy()
      const fps = rendering.getFPS()
      expect(fps).toBe(60)
    })
  })

  describe("Canvas Resize", () => {
    it("should track canvas size", () => {
      rendering.resize(1024, 768)
      const size = rendering.getCanvasSize()
      expect(size.width).toBe(1024)
      expect(size.height).toBe(768)
    })
  })
})
