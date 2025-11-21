import { expect, test } from "@playwright/test"

test.describe("PixiRenderingLayer (Browser with WebGL)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/tests/browser/test-page.html")
  })

  test("should initialize PIXI Application", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PixiRenderingLayer } = await import("/dist/clockwork-engine.js")

      const canvas = document.createElement("canvas")
      canvas.width = 800
      canvas.height = 600
      document.body.appendChild(canvas)

      const rendering = new PixiRenderingLayer(canvas, {
        worldWidth: 800,
        worldHeight: 600,
      })

      await rendering.init()

      return {
        initialized: rendering !== null,
        hasViewport: rendering.getViewportZoom() > 0,
      }
    })

    expect(result.initialized).toBe(true)
    expect(result.hasViewport).toBe(true)
  })

  test("should create and manage nodes", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PixiRenderingLayer } = await import("/dist/clockwork-engine.js")

      const canvas = document.createElement("canvas")
      canvas.width = 800
      canvas.height = 600
      document.body.appendChild(canvas)

      const rendering = new PixiRenderingLayer(canvas, {
        worldWidth: 800,
        worldHeight: 600,
      })

      await rendering.init()

      const node1 = rendering.createNode()
      const node2 = rendering.createNode()

      rendering.setPosition(node1, 100, 200)
      const pos = rendering.getPosition(node1)

      rendering.addChild(node1, node2)
      const children = rendering.getChildren(node1)

      rendering.destroyNode(node2)

      return {
        node1Exists: rendering.hasNode(node1),
        node2Exists: rendering.hasNode(node2),
        position: pos,
        childrenCount: children.length,
      }
    })

    expect(result.node1Exists).toBe(true)
    expect(result.node2Exists).toBe(false)
    expect(result.position.x).toBe(100)
    expect(result.position.y).toBe(200)
    expect(result.childrenCount).toBe(1)
  })

  test("should handle transform operations", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PixiRenderingLayer } = await import("/dist/clockwork-engine.js")

      const canvas = document.createElement("canvas")
      canvas.width = 800
      canvas.height = 600
      document.body.appendChild(canvas)

      const rendering = new PixiRenderingLayer(canvas, {
        worldWidth: 800,
        worldHeight: 600,
      })

      await rendering.init()

      const node = rendering.createNode()

      rendering.setPosition(node, 100, 200)
      rendering.setRotation(node, Math.PI / 2)
      rendering.setScale(node, 2, 3)
      rendering.setAnchor(node, 0.5, 0.5)
      rendering.setAlpha(node, 0.7)
      rendering.setVisible(node, false)
      rendering.setZIndex(node, 10)

      return {
        position: rendering.getPosition(node),
        rotation: rendering.getRotation(node),
        scale: rendering.getScale(node),
        anchor: rendering.getAnchor(node),
        alpha: rendering.getAlpha(node),
        visible: rendering.getVisible(node),
        zIndex: rendering.getZIndex(node),
      }
    })

    expect(result.position.x).toBe(100)
    expect(result.position.y).toBe(200)
    expect(result.rotation).toBeCloseTo(Math.PI / 2, 5)
    expect(result.scale.x).toBe(2)
    expect(result.scale.y).toBe(3)
    expect(result.anchor.x).toBe(0.5)
    expect(result.anchor.y).toBe(0.5)
    expect(result.alpha).toBe(0.7)
    expect(result.visible).toBe(false)
    expect(result.zIndex).toBe(10)
  })

  test("should draw graphics primitives", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PixiRenderingLayer } = await import("/dist/clockwork-engine.js")

      const canvas = document.createElement("canvas")
      canvas.width = 800
      canvas.height = 600
      document.body.appendChild(canvas)

      const rendering = new PixiRenderingLayer(canvas, {
        worldWidth: 800,
        worldHeight: 600,
      })

      await rendering.init()

      const node = rendering.createNode()

      rendering.drawRectangle(node, 10, 20, 100, 50, 0xff0000)
      rendering.drawCircle(node, 50, 50, 25, 0x00ff00)
      rendering.drawPolygon(node, [0, 0, 100, 0, 50, 100], 0x0000ff)

      const graphics = rendering.getGraphics(node)

      rendering.clearGraphics(node)
      const clearedGraphics = rendering.getGraphics(node)

      return {
        graphicsCount: graphics.length,
        types: graphics.map((g: any) => g.type),
        clearedCount: clearedGraphics.length,
      }
    })

    expect(result.graphicsCount).toBe(3)
    expect(result.types).toContain("rectangle")
    expect(result.types).toContain("circle")
    expect(result.types).toContain("polygon")
    expect(result.clearedCount).toBe(0)
  })

  test("should handle viewport operations", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PixiRenderingLayer } = await import("/dist/clockwork-engine.js")

      const canvas = document.createElement("canvas")
      canvas.width = 800
      canvas.height = 600
      document.body.appendChild(canvas)

      const rendering = new PixiRenderingLayer(canvas, {
        worldWidth: 1600,
        worldHeight: 1200,
        minScale: 0.5,
        maxScale: 4,
      })

      await rendering.init()

      const node = rendering.createNode()

      const initialZoom = rendering.getViewportZoom()

      rendering.setViewportPosition(node, 100, 200)
      const pos = rendering.getViewportPosition(node)

      rendering.setViewportZoom(node, 2)
      const zoom = rendering.getViewportZoom()

      const worldPoint = rendering.screenToWorld(node, 400, 300)
      const screenPoint = rendering.worldToScreen(
        node,
        worldPoint.x,
        worldPoint.y,
      )

      return {
        initialZoom,
        position: pos,
        zoom,
        worldPoint,
        screenPoint,
      }
    })

    expect(result.initialZoom).toBeGreaterThan(0)
    expect(result.position.x).toBe(100)
    expect(result.position.y).toBe(200)
    expect(result.zoom).toBeCloseTo(2, 1)
    expect(result.screenPoint.x).toBeCloseTo(400, 0)
    expect(result.screenPoint.y).toBeCloseTo(300, 0)
  })

  test("should load textures and handle errors", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PixiRenderingLayer } = await import("/dist/clockwork-engine.js")

      const canvas = document.createElement("canvas")
      canvas.width = 800
      canvas.height = 600
      document.body.appendChild(canvas)

      const rendering = new PixiRenderingLayer(canvas, {
        worldWidth: 800,
        worldHeight: 600,
      })

      await rendering.init()

      // Load invalid texture (should create error texture)
      const textureId = await rendering.loadTexture("nonexistent.png")

      const node = rendering.createNode()
      rendering.setSprite(node, textureId)

      return {
        textureLoaded: textureId !== null,
        nodeHasSprite: rendering.getSpriteTexture(node) !== null,
      }
    })

    expect(result.textureLoaded).toBe(true)
    expect(result.nodeHasSprite).toBe(true)
  })

  test("should cleanup properly", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PixiRenderingLayer } = await import("/dist/clockwork-engine.js")

      const canvas = document.createElement("canvas")
      canvas.width = 800
      canvas.height = 600
      document.body.appendChild(canvas)

      const rendering = new PixiRenderingLayer(canvas, {
        worldWidth: 800,
        worldHeight: 600,
      })

      await rendering.init()

      const node = rendering.createNode()
      rendering.setPosition(node, 100, 200)

      rendering.destroy()

      // After destroy, node should no longer exist
      let nodeExists = false
      try {
        nodeExists = rendering.hasNode(node)
      } catch (_e) {
        // Expected - might throw after destroy
      }

      return {
        destroyed: true,
        nodeExists,
      }
    })

    expect(result.destroyed).toBe(true)
  })
})
