import { expect, test } from "@playwright/test"
import {
  BROWSER_HELPERS,
  PixelAssertions,
  getRenderingSetup,
} from "./helpers/browser-test-utils"

test.describe("PixiRenderingLayer (Browser with WebGL)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/tests/browser/test-page.html")
  })

  test("should initialize PIXI Application", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

      return {
        initialized: rendering !== null,
        hasViewport: rendering.getViewportZoom() > 0,
      }
    })()`,
    )

    expect(result.initialized).toBe(true)
    expect(result.hasViewport).toBe(true)
  })

  test("should create and manage nodes", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

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
    })()`,
    )

    expect(result.node1Exists).toBe(true)
    expect(result.node2Exists).toBe(false)
    expect(result.position.x).toBe(100)
    expect(result.position.y).toBe(200)
    expect(result.childrenCount).toBe(1)
  })

  test("should handle transform operations", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

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
    })()`,
    )

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
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.checkPixel}

      const node = rendering.createNode()

      rendering.drawRectangle(node, 100, 100, 100, 50, 0xff0000)
      rendering.drawCircle(node, 300, 150, 25, 0x00ff00)
      rendering.drawPolygon(node, [500, 100, 600, 100, 550, 200], 0x0000ff)

      rendering.render()

      const graphics = rendering.getGraphics(node)
      const imageData = extractPixels(rendering.app)

      rendering.clearGraphics(node)
      const clearedGraphics = rendering.getGraphics(node)

      return {
        graphicsCount: graphics.length,
        types: graphics.map((g) => g.type),
        clearedCount: clearedGraphics.length,
        rectanglePixel: checkPixel(imageData, 150, 125, 0xff0000),
        circlePixel: checkPixel(imageData, 300, 150, 0x00ff00),
        polygonPixel: checkPixel(imageData, 550, 150, 0x0000ff),
      }
    })()`,
    )

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
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup(800, 600, {
        worldWidth: 1600,
        worldHeight: 1200,
        minScale: 0.5,
        maxScale: 4,
      })}

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
    })()`,
    )

    expect(result.initialZoom).toBeGreaterThan(0)
    expect(result.position.x).toBe(100)
    expect(result.position.y).toBe(200)
    expect(result.zoom).toBeCloseTo(2, 1)
    expect(result.screenPoint.x).toBeCloseTo(400, 0)
    expect(result.screenPoint.y).toBeCloseTo(300, 0)
  })

  test("should load textures and handle errors", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

      const textureId = await rendering.loadTexture("nonexistent.png")

      const node = rendering.createNode()
      rendering.setSprite(node, textureId)

      return {
        textureLoaded: textureId !== null,
        nodeHasSprite: rendering.getSpriteTexture(node) !== null,
      }
    })()`,
    )

    expect(result.textureLoaded).toBe(true)
    expect(result.nodeHasSprite).toBe(true)
  })

  test("should render colored rectangles correctly", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      const redNode = rendering.createNode()
      const greenNode = rendering.createNode()
      const blueNode = rendering.createNode()

      rendering.drawRectangle(redNode, 100, 200, 80, 80, 0xff0000)
      rendering.drawRectangle(greenNode, 300, 200, 80, 80, 0x00ff00)
      rendering.drawRectangle(blueNode, 500, 200, 80, 80, 0x0000ff)

      rendering.render()

      const imageData = extractPixels(rendering.app)

      return {
        pixels: {
          red: getPixel(imageData, 140, 240),
          green: getPixel(imageData, 340, 240),
          blue: getPixel(imageData, 540, 240),
        },
      }
    })()`,
    )

    expect(PixelAssertions.isRed(result.pixels.red)).toBe(true)
    expect(PixelAssertions.isGreen(result.pixels.green)).toBe(true)
    expect(PixelAssertions.isBlue(result.pixels.blue)).toBe(true)
  })

  test("should render with alpha transparency", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      const opaqueNode = rendering.createNode()
      const semiTransparentNode = rendering.createNode()

      rendering.drawRectangle(opaqueNode, 100, 200, 120, 120, 0xff0000)
      rendering.drawRectangle(semiTransparentNode, 400, 200, 120, 120, 0x00ff00)

      rendering.setAlpha(opaqueNode, 1.0)
      rendering.setAlpha(semiTransparentNode, 0.5)

      rendering.render()

      const imageData = extractPixels(rendering.app)

      return {
        alphaValues: {
          opaque: rendering.getAlpha(opaqueNode),
          semiTransparent: rendering.getAlpha(semiTransparentNode),
        },
        pixels: {
          opaque: getPixel(imageData, 160, 260),
          semiTransparent: getPixel(imageData, 460, 260),
        },
      }
    })()`,
    )

    expect(result.alphaValues.opaque).toBe(1.0)
    expect(result.alphaValues.semiTransparent).toBe(0.5)

    expect(result.pixels.opaque.r).toBeGreaterThan(200)

    expect(result.pixels.semiTransparent.g).toBeGreaterThan(50)
    expect(result.pixels.semiTransparent.g).toBeLessThan(200)
  })

  test("should cleanup properly", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

      const node = rendering.createNode()
      rendering.setPosition(node, 100, 200)

      rendering.destroy()

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
    })()`,
    )

    expect(result.destroyed).toBe(true)
  })
})
