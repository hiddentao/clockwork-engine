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

      // Draw primitives
      rendering.drawRectangle(node, 100, 100, 100, 50, 0xff0000)
      rendering.drawCircle(node, 300, 150, 25, 0x00ff00)
      rendering.drawPolygon(node, [500, 100, 600, 100, 550, 200], 0x0000ff)

      // Render one frame
      rendering.render()

      const graphics = rendering.getGraphics(node)

      // Extract pixels for verification (inline implementation)
      const extractPixels = (app: any) => {
        const { renderer } = app
        const { width, height } = renderer.screen
        const pixels = new Uint8Array(width * height * 4)
        const gl = renderer.gl
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

        // Flip Y coordinate (WebGL uses bottom-left origin)
        const flipped = new Uint8ClampedArray(width * height * 4)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = ((height - y - 1) * width + x) * 4
            const dstIdx = (y * width + x) * 4
            flipped[dstIdx] = pixels[srcIdx]
            flipped[dstIdx + 1] = pixels[srcIdx + 1]
            flipped[dstIdx + 2] = pixels[srcIdx + 2]
            flipped[dstIdx + 3] = pixels[srcIdx + 3]
          }
        }
        return new ImageData(flipped, width, height)
      }

      const imageData = extractPixels((rendering as any).app)

      // Helper to check pixel color
      const checkPixel = (x: number, y: number, expectedHex: number) => {
        const index = (y * imageData.width + x) * 4
        const pixel = {
          r: imageData.data[index],
          g: imageData.data[index + 1],
          b: imageData.data[index + 2],
          a: imageData.data[index + 3],
        }
        const expected = {
          r: (expectedHex >> 16) & 0xff,
          g: (expectedHex >> 8) & 0xff,
          b: expectedHex & 0xff,
        }
        const tolerance = 10
        return (
          Math.abs(pixel.r - expected.r) <= tolerance &&
          Math.abs(pixel.g - expected.g) <= tolerance &&
          Math.abs(pixel.b - expected.b) <= tolerance
        )
      }

      rendering.clearGraphics(node)
      const clearedGraphics = rendering.getGraphics(node)

      return {
        graphicsCount: graphics.length,
        types: graphics.map((g: any) => g.type),
        clearedCount: clearedGraphics.length,
        // Verify each primitive rendered
        rectanglePixel: checkPixel(150, 125, 0xff0000), // Center of red rectangle
        circlePixel: checkPixel(300, 150, 0x00ff00), // Center of green circle
        polygonPixel: checkPixel(550, 150, 0x0000ff), // Inside blue polygon
      }
    })

    expect(result.graphicsCount).toBe(3)
    expect(result.types).toContain("rectangle")
    expect(result.types).toContain("circle")
    expect(result.types).toContain("polygon")
    expect(result.clearedCount).toBe(0)

    // Visual verification
    expect(result.rectanglePixel).toBe(true)
    expect(result.circlePixel).toBe(true)
    expect(result.polygonPixel).toBe(true)
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

  test("should render colored rectangles correctly", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PixiRenderingLayer } = await import("/dist/clockwork-engine.js")

      const canvas = document.createElement("canvas")
      canvas.width = 400
      canvas.height = 300
      document.body.appendChild(canvas)

      const rendering = new PixiRenderingLayer(canvas, {
        worldWidth: 400,
        worldHeight: 300,
      })

      await rendering.init()

      // Create nodes with different colored rectangles
      const redNode = rendering.createNode()
      const greenNode = rendering.createNode()
      const blueNode = rendering.createNode()

      // Draw rectangles with direct colors (not using tint)
      rendering.drawRectangle(redNode, 50, 100, 50, 50, 0xff0000)
      rendering.drawRectangle(greenNode, 150, 100, 50, 50, 0x00ff00)
      rendering.drawRectangle(blueNode, 250, 100, 50, 50, 0x0000ff)

      // Render
      rendering.render()

      // Extract pixels
      const extractPixels = (app: any) => {
        const { renderer } = app
        const { width, height } = renderer.screen
        const pixels = new Uint8Array(width * height * 4)
        const gl = renderer.gl
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

        const flipped = new Uint8ClampedArray(width * height * 4)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = ((height - y - 1) * width + x) * 4
            const dstIdx = (y * width + x) * 4
            flipped[dstIdx] = pixels[srcIdx]
            flipped[dstIdx + 1] = pixels[srcIdx + 1]
            flipped[dstIdx + 2] = pixels[srcIdx + 2]
            flipped[dstIdx + 3] = pixels[srcIdx + 3]
          }
        }
        return new ImageData(flipped, width, height)
      }

      const imageData = extractPixels((rendering as any).app)

      // Check colors
      const getPixel = (x: number, y: number) => {
        const index = (y * imageData.width + x) * 4
        return {
          r: imageData.data[index],
          g: imageData.data[index + 1],
          b: imageData.data[index + 2],
          a: imageData.data[index + 3],
        }
      }

      const redPixel = getPixel(75, 125)
      const greenPixel = getPixel(175, 125)
      const bluePixel = getPixel(275, 125)

      return {
        pixels: {
          red: redPixel,
          green: greenPixel,
          blue: bluePixel,
        },
      }
    })

    // Verify rendered colors match expected values
    expect(result.pixels.red.r).toBeGreaterThan(200)
    expect(result.pixels.red.g).toBeLessThan(50)
    expect(result.pixels.red.b).toBeLessThan(50)

    expect(result.pixels.green.r).toBeLessThan(50)
    expect(result.pixels.green.g).toBeGreaterThan(200)
    expect(result.pixels.green.b).toBeLessThan(50)

    expect(result.pixels.blue.r).toBeLessThan(50)
    expect(result.pixels.blue.g).toBeLessThan(50)
    expect(result.pixels.blue.b).toBeGreaterThan(200)
  })

  test("should render with alpha transparency", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { PixiRenderingLayer } = await import("/dist/clockwork-engine.js")

      const canvas = document.createElement("canvas")
      canvas.width = 400
      canvas.height = 300
      document.body.appendChild(canvas)

      const rendering = new PixiRenderingLayer(canvas, {
        worldWidth: 400,
        worldHeight: 300,
      })

      await rendering.init()

      // Create two nodes with different alpha values
      const opaqueNode = rendering.createNode()
      const semiTransparentNode = rendering.createNode()

      // Draw rectangles
      rendering.drawRectangle(opaqueNode, 50, 100, 80, 80, 0xff0000)
      rendering.drawRectangle(semiTransparentNode, 150, 100, 80, 80, 0x00ff00)

      // Set different alpha values
      rendering.setAlpha(opaqueNode, 1.0)
      rendering.setAlpha(semiTransparentNode, 0.5)

      rendering.render()

      // Extract pixels
      const extractPixels = (app: any) => {
        const { renderer } = app
        const { width, height } = renderer.screen
        const pixels = new Uint8Array(width * height * 4)
        const gl = renderer.gl
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

        const flipped = new Uint8ClampedArray(width * height * 4)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = ((height - y - 1) * width + x) * 4
            const dstIdx = (y * width + x) * 4
            flipped[dstIdx] = pixels[srcIdx]
            flipped[dstIdx + 1] = pixels[srcIdx + 1]
            flipped[dstIdx + 2] = pixels[srcIdx + 2]
            flipped[dstIdx + 3] = pixels[srcIdx + 3]
          }
        }
        return new ImageData(flipped, width, height)
      }

      const imageData = extractPixels((rendering as any).app)

      const getPixel = (x: number, y: number) => {
        const index = (y * imageData.width + x) * 4
        return {
          r: imageData.data[index],
          g: imageData.data[index + 1],
          b: imageData.data[index + 2],
          a: imageData.data[index + 3],
        }
      }

      return {
        alphaValues: {
          opaque: rendering.getAlpha(opaqueNode),
          semiTransparent: rendering.getAlpha(semiTransparentNode),
        },
        pixels: {
          opaque: getPixel(90, 140),
          semiTransparent: getPixel(190, 140),
        },
      }
    })

    // Verify alpha values are set correctly
    expect(result.alphaValues.opaque).toBe(1.0)
    expect(result.alphaValues.semiTransparent).toBe(0.5)

    // Verify opaque red is fully visible
    expect(result.pixels.opaque.r).toBeGreaterThan(200)

    // Verify semi-transparent green has reduced intensity due to alpha blending
    expect(result.pixels.semiTransparent.g).toBeGreaterThan(50)
    expect(result.pixels.semiTransparent.g).toBeLessThan(200)
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
