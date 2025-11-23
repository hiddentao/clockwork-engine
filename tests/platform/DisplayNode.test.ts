import { beforeEach, describe, expect, it } from "bun:test"
import { DisplayNode } from "../../src/platform/DisplayNode"
import { MemoryRenderingLayer } from "../../src/platform/memory/MemoryRenderingLayer"
import {
  BlendMode,
  TextureFiltering,
  asTextureId,
} from "../../src/platform/types"

describe("DisplayNode", () => {
  let rendering: MemoryRenderingLayer
  let node: DisplayNode

  beforeEach(() => {
    rendering = new MemoryRenderingLayer()
    node = new DisplayNode(rendering.createNode(), rendering)
  })

  describe("Method Chaining", () => {
    it("should support fluent interface", () => {
      const result = node
        .setPosition(100, 200)
        .setRotation(Math.PI / 2)
        .setScale(2, 3)
        .setAlpha(0.5)
        .setVisible(true)

      expect(result).toBe(node)
    })

    it("should allow chaining all transform methods", () => {
      const result = node
        .setPosition(10, 20)
        .setRotation(1.5)
        .setScale(2)
        .setAnchor(0.5, 0.5)
        .setAlpha(0.8)
        .setVisible(false)
        .setZIndex(5)

      expect(result).toBe(node)
    })
  })

  describe("Hierarchy", () => {
    it("should add child and return self", () => {
      const child = new DisplayNode(rendering.createNode(), rendering)
      const result = node.addChild(child)

      expect(result).toBe(node)
      const children = rendering.getChildren(node.getId())
      expect(children).toContain(child.getId())
    })

    it("should remove child and return self", () => {
      const child = new DisplayNode(rendering.createNode(), rendering)
      node.addChild(child)
      const result = node.removeChild(child)

      expect(result).toBe(node)
      const children = rendering.getChildren(node.getId())
      expect(children).not.toContain(child.getId())
    })

    it("should destroy node", () => {
      const nodeId = node.getId()
      node.destroy()

      expect(rendering.hasNode(nodeId)).toBe(false)
    })
  })

  describe("Transform", () => {
    it("should set position", () => {
      node.setPosition(100, 200)
      const pos = rendering.getPosition(node.getId())
      expect(pos.x).toBe(100)
      expect(pos.y).toBe(200)
    })

    it("should set rotation", () => {
      node.setRotation(Math.PI)
      const rotation = rendering.getRotation(node.getId())
      expect(rotation).toBe(Math.PI)
    })

    it("should set scale with both x and y", () => {
      node.setScale(2, 3)
      const scale = rendering.getScale(node.getId())
      expect(scale.x).toBe(2)
      expect(scale.y).toBe(3)
    })

    it("should set scale with single value (uniform)", () => {
      node.setScale(2.5)
      const scale = rendering.getScale(node.getId())
      expect(scale.x).toBe(2.5)
      expect(scale.y).toBe(2.5)
    })

    it("should set anchor", () => {
      node.setAnchor(0.5, 1)
      const anchor = rendering.getAnchor(node.getId())
      expect(anchor.x).toBe(0.5)
      expect(anchor.y).toBe(1)
    })

    it("should set alpha", () => {
      node.setAlpha(0.7)
      const alpha = rendering.getAlpha(node.getId())
      expect(alpha).toBe(0.7)
    })

    it("should set visibility", () => {
      node.setVisible(false)
      const visible = rendering.getVisible(node.getId())
      expect(visible).toBe(false)
    })

    it("should set z-index", () => {
      node.setZIndex(10)
      const zIndex = rendering.getZIndex(node.getId())
      expect(zIndex).toBe(10)
    })
  })

  describe("Size", () => {
    it("should set size", () => {
      node.setSize(100, 50)
      const size = rendering.getSize(node.getId())
      expect(size.width).toBe(100)
      expect(size.height).toBe(50)
    })

    it("should get size", () => {
      rendering.setSize(node.getId(), 200, 150)
      const size = node.getSize()
      expect(size.width).toBe(200)
      expect(size.height).toBe(150)
    })

    it("should chain setSize", () => {
      const result = node.setSize(100, 50)
      expect(result).toBe(node)
    })
  })

  describe("Visual Effects", () => {
    it("should set tint with hex color", () => {
      node.setTint(0xff0000)
      const tint = rendering.getTint(node.getId())
      expect(tint).toBe(0xff0000)
    })

    it("should set tint with RGB object", () => {
      node.setTint({ r: 255, g: 0, b: 0 })
      const tint = rendering.getTint(node.getId())
      expect(tint).toEqual({ r: 255, g: 0, b: 0 })
    })

    it("should set blend mode", () => {
      node.setBlendMode(BlendMode.ADD)
      const mode = rendering.getBlendMode(node.getId())
      expect(mode).toBe(BlendMode.ADD)
    })

    it("should set texture filtering", () => {
      node.setTextureFiltering(TextureFiltering.NEAREST)
      const filtering = rendering.getTextureFiltering(node.getId())
      expect(filtering).toBe(TextureFiltering.NEAREST)
    })

    it("should chain visual effect methods", () => {
      const result = node
        .setTint(0x00ff00)
        .setBlendMode(BlendMode.MULTIPLY)
        .setTextureFiltering(TextureFiltering.LINEAR)

      expect(result).toBe(node)
    })
  })

  describe("Bounds", () => {
    it("should get bounds", () => {
      rendering.setPosition(node.getId(), 100, 200)
      rendering.setSize(node.getId(), 50, 30)

      const bounds = node.getBounds()
      expect(bounds.x).toBe(100)
      expect(bounds.y).toBe(200)
      expect(bounds.width).toBe(50)
      expect(bounds.height).toBe(30)
    })
  })

  describe("Visual Content", () => {
    it("should set sprite", () => {
      const textureId = asTextureId(1)
      node.setSprite(textureId)

      const spriteTexture = rendering.getSpriteTexture(node.getId())
      expect(spriteTexture).toBe(textureId)
    })

    it("should set animated sprite", () => {
      const textures = [asTextureId(1), asTextureId(2), asTextureId(3)]
      node.setAnimatedSprite(textures, 5)

      const animData = rendering.getAnimationData(node.getId())
      expect(animData?.textures).toEqual(textures)
      expect(animData?.ticksPerFrame).toBe(5)
    })

    it("should play animation with default loop=false", () => {
      const textures = [asTextureId(1), asTextureId(2)]
      node.setAnimatedSprite(textures, 5)
      node.playAnimation()

      const isPlaying = rendering.isAnimationPlaying(node.getId())
      expect(isPlaying).toBe(true)
    })

    it("should play animation with loop=true", () => {
      const textures = [asTextureId(1), asTextureId(2)]
      node.setAnimatedSprite(textures, 5)
      node.playAnimation(true)

      const animData = rendering.getAnimationData(node.getId())
      expect(animData?.loop).toBe(true)
    })

    it("should stop animation", () => {
      const textures = [asTextureId(1), asTextureId(2)]
      node.setAnimatedSprite(textures, 5)
      node.playAnimation(true)
      node.stopAnimation()

      const isPlaying = rendering.isAnimationPlaying(node.getId())
      expect(isPlaying).toBe(false)
    })

    it("should chain visual content methods", () => {
      const textureId = asTextureId(1)
      const result = node.setSprite(textureId).playAnimation()

      expect(result).toBe(node)
    })
  })

  describe("Graphics Primitives", () => {
    it("should draw rectangle", () => {
      node.drawRectangle(10, 20, 100, 50, 0xff0000)

      const graphics = rendering.getGraphics(node.getId())
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("rectangle")
    })

    it("should draw circle", () => {
      node.drawCircle(50, 50, 25, 0x00ff00)

      const graphics = rendering.getGraphics(node.getId())
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("circle")
    })

    it("should draw polygon", () => {
      const points = [0, 0, 100, 0, 50, 100]
      node.drawPolygon(points, 0x0000ff)

      const graphics = rendering.getGraphics(node.getId())
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("polygon")
    })

    it("should draw line", () => {
      node.drawLine(0, 0, 100, 100, 0xffffff, 2)

      const graphics = rendering.getGraphics(node.getId())
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("line")
    })

    it("should draw polyline", () => {
      const points = [0, 0, 50, 50, 100, 0]
      node.drawPolyline(points, 0xffffff, 2)

      const graphics = rendering.getGraphics(node.getId())
      expect(graphics.length).toBe(1)
      expect(graphics[0].type).toBe("polyline")
    })

    it("should draw with stroke", () => {
      node.drawRectangle(0, 0, 100, 100, 0xff0000, 0xffffff, 2)

      const graphics = rendering.getGraphics(node.getId())
      expect(graphics[0].data.stroke).toBe(0xffffff)
      expect(graphics[0].data.strokeWidth).toBe(2)
    })

    it("should clear graphics", () => {
      node.drawRectangle(0, 0, 100, 100)
      node.clearGraphics()

      const graphics = rendering.getGraphics(node.getId())
      expect(graphics.length).toBe(0)
    })

    it("should chain graphics methods", () => {
      const result = node
        .drawRectangle(0, 0, 100, 100, 0xff0000)
        .drawCircle(50, 50, 25, 0x00ff00)
        .drawLine(0, 0, 100, 100, 0xffffff)

      expect(result).toBe(node)
    })
  })

  describe("Access", () => {
    it("should get node ID", () => {
      const nodeId = node.getId()
      expect(nodeId).toBeDefined()
      expect(rendering.hasNode(nodeId)).toBe(true)
    })
  })

  describe("Complex Chaining Example", () => {
    it("should support complex method chaining", () => {
      const child1 = new DisplayNode(rendering.createNode(), rendering)
      const child2 = new DisplayNode(rendering.createNode(), rendering)

      const result = node
        .setPosition(100, 200)
        .setRotation(Math.PI / 4)
        .setScale(2)
        .setAnchor(0.5, 0.5)
        .setAlpha(0.9)
        .setTint(0xff00ff)
        .setBlendMode(BlendMode.ADD)
        .addChild(child1)
        .addChild(child2)
        .drawRectangle(0, 0, 50, 50, 0xffffff)

      expect(result).toBe(node)

      // Verify all operations took effect
      const pos = rendering.getPosition(node.getId())
      expect(pos.x).toBe(100)
      expect(pos.y).toBe(200)

      const children = rendering.getChildren(node.getId())
      expect(children.length).toBe(2)

      const graphics = rendering.getGraphics(node.getId())
      expect(graphics.length).toBe(1)
    })
  })
})
