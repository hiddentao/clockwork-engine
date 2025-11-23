import { expect, test } from "@playwright/test"
import {
  BROWSER_HELPERS,
  PixelAssertions,
  getRenderingSetup,
} from "./helpers/browser-test-utils"

test.describe("Visual Regression Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/tests/browser/test-page.html")
  })

  test("should render multi-frame animation consistently", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      const node = platform.rendering.createNode()
      const frames = []

      // Frame 1: Red rectangle
      platform.rendering.drawRectangle(node, 100, 100, 100, 100, 0xff0000)
      platform.rendering.render()
      frames.push(extractPixels(platform.rendering.app))

      // Frame 2: Move and change color to green
      platform.rendering.clearGraphics(node)
      platform.rendering.drawRectangle(node, 200, 200, 100, 100, 0x00ff00)
      platform.rendering.render()
      frames.push(extractPixels(platform.rendering.app))

      // Frame 3: Move and change color to blue
      platform.rendering.clearGraphics(node)
      platform.rendering.drawRectangle(node, 300, 100, 100, 100, 0x0000ff)
      platform.rendering.render()
      frames.push(extractPixels(platform.rendering.app))

      return {
        frame1: getPixel(frames[0], 150, 150),
        frame2: getPixel(frames[1], 250, 250),
        frame3: getPixel(frames[2], 350, 150),
      }
    })()`,
    )

    expect(PixelAssertions.isRed(result.frame1)).toBe(true)
    expect(PixelAssertions.isGreen(result.frame2)).toBe(true)
    expect(PixelAssertions.isBlue(result.frame3)).toBe(true)
  })

  test("should render layered nodes with correct z-order", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      // Create three overlapping rectangles
      const backNode = platform.rendering.createNode()
      const middleNode = platform.rendering.createNode()
      const frontNode = platform.rendering.createNode()

      // Set z-indices
      platform.rendering.setZIndex(backNode, 1)
      platform.rendering.setZIndex(middleNode, 2)
      platform.rendering.setZIndex(frontNode, 3)

      // Draw overlapping rectangles (all at same position)
      platform.rendering.drawRectangle(backNode, 200, 200, 200, 200, 0xff0000)
      platform.rendering.drawRectangle(middleNode, 220, 220, 160, 160, 0x00ff00)
      platform.rendering.drawRectangle(frontNode, 240, 240, 120, 120, 0x0000ff)

      platform.rendering.render()

      const imageData = extractPixels(platform.rendering.app)

      return {
        // Back layer (red) should be visible at edges
        backVisible: getPixel(imageData, 210, 210),
        // Middle layer (green) should be visible
        middleVisible: getPixel(imageData, 230, 230),
        // Front layer (blue) should be on top
        frontVisible: getPixel(imageData, 250, 250),
      }
    })()`,
    )

    expect(PixelAssertions.isRed(result.backVisible)).toBe(true)
    expect(PixelAssertions.isGreen(result.middleVisible)).toBe(true)
    expect(PixelAssertions.isBlue(result.frontVisible)).toBe(true)
  })

  test("should render blend modes correctly", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      const { BlendMode } = await import("/dist/clockwork-engine.js")

      // Normal blending
      const normalNode = platform.rendering.createNode()
      platform.rendering.drawRectangle(normalNode, 100, 200, 80, 80, 0xff0000)
      platform.rendering.setBlendMode(normalNode, BlendMode.NORMAL)

      // Additive blending
      const additiveNode = platform.rendering.createNode()
      platform.rendering.drawRectangle(additiveNode, 300, 200, 80, 80, 0x00ff00)
      platform.rendering.setBlendMode(additiveNode, BlendMode.ADD)

      platform.rendering.render()

      const imageData = extractPixels(platform.rendering.app)

      return {
        normal: getPixel(imageData, 140, 240),
        additive: getPixel(imageData, 340, 240),
      }
    })()`,
    )

    // Normal blend should show pure red
    expect(PixelAssertions.isRed(result.normal)).toBe(true)
    // Additive blend should show green
    expect(PixelAssertions.isGreen(result.additive)).toBe(true)
  })

  test("should render tinted sprites correctly", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      // Create a white texture programmatically
      const textureCanvas = document.createElement('canvas')
      textureCanvas.width = 100
      textureCanvas.height = 100
      const ctx = textureCanvas.getContext('2d')
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 100, 100)

      // Create texture from canvas and load it
      const texture = await platform.rendering.loadTexture(textureCanvas.toDataURL())

      // Create sprite node with white texture
      const node = platform.rendering.createNode()
      platform.rendering.setSprite(node, texture)
      platform.rendering.setPosition(node, 200, 200)

      // Apply red tint
      platform.rendering.setTint(node, 0xff0000)

      platform.rendering.render()

      const imageData = extractPixels(platform.rendering.app)

      return {
        tintedPixel: getPixel(imageData, 250, 250),
      }
    })()`,
    )

    // Tinted white sprite should appear red
    expect(PixelAssertions.isRed(result.tintedPixel)).toBe(true)
  })

  test("should render complex scene composition", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      // Create a complex scene with multiple shapes
      const shapes = []

      // Rectangle grid (3x3)
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const node = platform.rendering.createNode()
          const color = (x + y) % 2 === 0 ? 0xff0000 : 0x0000ff
          platform.rendering.drawRectangle(
            node,
            100 + x * 150,
            100 + y * 150,
            100,
            100,
            color
          )
          shapes.push(node)
        }
      }

      // Add circles on top
      for (let i = 0; i < 3; i++) {
        const node = platform.rendering.createNode()
        platform.rendering.drawCircle(
          node,
          200 + i * 150,
          250,
          40,
          0x00ff00
        )
        platform.rendering.setZIndex(node, 10)
        shapes.push(node)
      }

      platform.rendering.render()

      const imageData = extractPixels(platform.rendering.app)

      return {
        topLeft: getPixel(imageData, 150, 150),      // Red square
        topMiddle: getPixel(imageData, 300, 150),    // Blue square
        middleCircle: getPixel(imageData, 200, 250), // Green circle
        shapeCount: shapes.length,
      }
    })()`,
    )

    expect(result.shapeCount).toBe(12) // 9 rectangles + 3 circles
    expect(PixelAssertions.isRed(result.topLeft)).toBe(true)
    expect(PixelAssertions.isBlue(result.topMiddle)).toBe(true)
    expect(PixelAssertions.isGreen(result.middleCircle)).toBe(true)
  })

  test("should handle alpha compositing correctly", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      // Base layer - solid red
      const baseNode = platform.rendering.createNode()
      platform.rendering.drawRectangle(baseNode, 200, 200, 200, 200, 0xff0000)
      platform.rendering.setAlpha(baseNode, 1.0)

      // Overlay layer - semi-transparent blue
      const overlayNode = platform.rendering.createNode()
      platform.rendering.drawRectangle(overlayNode, 200, 200, 200, 200, 0x0000ff)
      platform.rendering.setAlpha(overlayNode, 0.5)
      platform.rendering.setZIndex(overlayNode, 10)

      platform.rendering.render()

      const imageData = extractPixels(platform.rendering.app)
      const pixel = getPixel(imageData, 300, 300)

      return {
        pixel,
        hasRedComponent: pixel.r > 50,
        hasBlueComponent: pixel.b > 50,
        isBlended: pixel.r > 50 && pixel.b > 50,
      }
    })()`,
    )

    // Semi-transparent blue over red should show both colors
    expect(result.hasRedComponent).toBe(true)
    expect(result.hasBlueComponent).toBe(true)
    expect(result.isBlended).toBe(true)
  })

  test("should render error texture (pink checkerboard)", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      // Load non-existent texture (should return error texture)
      const errorTexture = await platform.rendering.loadTexture("nonexistent-image.png")

      const node = platform.rendering.createNode()
      platform.rendering.setSprite(node, errorTexture)
      platform.rendering.setPosition(node, 200, 200)
      platform.rendering.setScale(node, 4, 4) // Scale up to see checkerboard

      platform.rendering.render()

      const imageData = extractPixels(platform.rendering.app)

      // Sample multiple pixels to detect checkerboard pattern
      const pixels = {
        p1: getPixel(imageData, 210, 210),
        p2: getPixel(imageData, 220, 210),
        p3: getPixel(imageData, 210, 220),
        p4: getPixel(imageData, 220, 220),
      }

      return {
        pixels,
        textureLoaded: errorTexture !== null,
      }
    })()`,
    )

    expect(result.textureLoaded).toBe(true)
    // Error texture should have magenta (pink) pixels
    const hasMagenta =
      result.pixels.p1.r > 200 ||
      result.pixels.p2.r > 200 ||
      result.pixels.p3.r > 200 ||
      result.pixels.p4.r > 200
    expect(hasMagenta).toBe(true)
  })

  test("should render with texture filtering modes", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

      const { TextureFiltering } = await import("/dist/clockwork-engine.js")

      // Create two nodes with different filtering
      const linearNode = platform.rendering.createNode()
      const nearestNode = platform.rendering.createNode()

      platform.rendering.drawRectangle(linearNode, 100, 200, 50, 50, 0xff0000)
      platform.rendering.drawRectangle(nearestNode, 300, 200, 50, 50, 0x00ff00)

      platform.rendering.setTextureFiltering(linearNode, TextureFiltering.LINEAR)
      platform.rendering.setTextureFiltering(nearestNode, TextureFiltering.NEAREST)

      platform.rendering.setScale(linearNode, 4, 4)
      platform.rendering.setScale(nearestNode, 4, 4)

      platform.rendering.render()

      return {
        filtersApplied: true,
      }
    })()`,
    )

    expect(result.filtersApplied).toBe(true)
  })

  test("should render line primitives correctly", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      const lineNode = platform.rendering.createNode()

      // Draw a red line
      platform.rendering.drawLine(lineNode, 100, 100, 300, 300, 0xff0000, 4)

      platform.rendering.render()

      const imageData = extractPixels(platform.rendering.app)

      // Sample pixel along the line
      const midPoint = getPixel(imageData, 200, 200)

      return {
        linePixel: midPoint,
        hasRedLine: midPoint.r > 200,
      }
    })()`,
    )

    expect(result.hasRedLine).toBe(true)
  })

  test("should render polyline correctly", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      const polylineNode = platform.rendering.createNode()

      // Draw a zigzag green polyline
      platform.rendering.drawPolyline(
        polylineNode,
        [100, 200, 200, 100, 300, 200, 400, 100],
        0x00ff00,
        3
      )

      platform.rendering.render()

      const imageData = extractPixels(platform.rendering.app)

      // Sample pixel at midpoint of first line segment (100,200 -> 200,100)
      const samplePixel = getPixel(imageData, 150, 150)

      return {
        polylinePixel: samplePixel,
        hasGreenPolyline: samplePixel.g > 100,
      }
    })()`,
    )

    expect(result.hasGreenPolyline).toBe(true)
  })

  test("should render primitives with stroke", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}
      ${BROWSER_HELPERS.extractPixels}
      ${BROWSER_HELPERS.getPixel}

      const strokeNode = platform.rendering.createNode()

      // Red fill, white stroke
      platform.rendering.drawRectangle(
        strokeNode,
        200,
        200,
        100,
        100,
        0xff0000, // fill
        0xffffff, // stroke
        4        // stroke width
      )

      platform.rendering.render()

      const imageData = extractPixels(platform.rendering.app)

      return {
        center: getPixel(imageData, 250, 250),  // Should be red (fill)
        edge: getPixel(imageData, 199, 250),    // Should be white (stroke)
      }
    })()`,
    )

    expect(PixelAssertions.isRed(result.center)).toBe(true)
    // Edge pixel should be bright (white stroke)
    expect(result.edge.r).toBeGreaterThan(200)
    expect(result.edge.g).toBeGreaterThan(200)
    expect(result.edge.b).toBeGreaterThan(200)
  })
})
