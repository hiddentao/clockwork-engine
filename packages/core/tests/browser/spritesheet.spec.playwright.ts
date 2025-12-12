import { expect, test } from "@playwright/test"
import { getRenderingSetup } from "./helpers/browser-test-utils"

test.describe("PixiRenderingLayer Spritesheet", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/tests/browser/test-page.html")
  })

  test("should load spritesheet and retrieve textures by frame name", async ({
    page,
  }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

      // Helper to create test image
      function createTestImageDataUrl(width, height) {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, "#FF0000")
        gradient.addColorStop(1, "#0000FF")
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
        return canvas.toDataURL("image/png")
      }

      // Create a simple spritesheet JSON (TexturePacker format)
      const spritesheetJson = {
        frames: {
          "frame1.png": {
            frame: { x: 0, y: 0, w: 32, h: 32 },
            sourceSize: { w: 32, h: 32 },
          },
          "frame2.png": {
            frame: { x: 32, y: 0, w: 32, h: 32 },
            sourceSize: { w: 32, h: 32 },
          },
          "frame3.png": {
            frame: { x: 0, y: 32, w: 32, h: 32 },
            sourceSize: { w: 32, h: 32 },
          },
        },
        meta: {
          image: "spritesheet.png",
          size: { w: 64, h: 64 },
          scale: 1,
        },
      }

      const testImageUrl = createTestImageDataUrl(64, 64)
      const spritesheetId = await rendering.loadSpritesheet(
        testImageUrl,
        spritesheetJson,
      )

      const texture1 = rendering.getTexture(spritesheetId, "frame1.png")
      const texture2 = rendering.getTexture(spritesheetId, "frame2.png")
      const texture3 = rendering.getTexture(spritesheetId, "frame3.png")
      const invalidTexture = rendering.getTexture(spritesheetId, "nonexistent.png")

      return {
        spritesheetId: spritesheetId !== null && spritesheetId !== undefined,
        texture1Valid: texture1 !== null,
        texture2Valid: texture2 !== null,
        texture3Valid: texture3 !== null,
        texturesDifferent: texture1 !== texture2 && texture2 !== texture3,
        invalidTextureIsNull: invalidTexture === null,
      }
    })()`,
    )

    expect(result.spritesheetId).toBe(true)
    expect(result.texture1Valid).toBe(true)
    expect(result.texture2Valid).toBe(true)
    expect(result.texture3Valid).toBe(true)
    expect(result.texturesDifferent).toBe(true)
    expect(result.invalidTextureIsNull).toBe(true)
  })

  test("should handle invalid spritesheet ID", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

      const { asSpritesheetId } = await import("/dist/platform-web-pixi.js")

      const invalidSpritesheetId = asSpritesheetId(999)
      const texture = rendering.getTexture(invalidSpritesheetId, "frame1.png")

      return {
        textureIsNull: texture === null,
      }
    })()`,
    )

    expect(result.textureIsNull).toBe(true)
  })

  test("should load multiple spritesheets independently", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

      function createTestImageDataUrl(width, height) {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx.fillStyle = "#00FF00"
        ctx.fillRect(0, 0, width, height)
        return canvas.toDataURL("image/png")
      }

      const spritesheet1Json = {
        frames: {
          "sprite1.png": {
            frame: { x: 0, y: 0, w: 16, h: 16 },
            sourceSize: { w: 16, h: 16 },
          },
        },
        meta: { image: "sheet1.png", size: { w: 16, h: 16 }, scale: 1 },
      }

      const spritesheet2Json = {
        frames: {
          "sprite2.png": {
            frame: { x: 0, y: 0, w: 32, h: 32 },
            sourceSize: { w: 32, h: 32 },
          },
        },
        meta: { image: "sheet2.png", size: { w: 32, h: 32 }, scale: 1 },
      }

      const testImage1 = createTestImageDataUrl(16, 16)
      const testImage2 = createTestImageDataUrl(32, 32)

      const sheet1Id = await rendering.loadSpritesheet(testImage1, spritesheet1Json)
      const sheet2Id = await rendering.loadSpritesheet(testImage2, spritesheet2Json)

      const texture1 = rendering.getTexture(sheet1Id, "sprite1.png")
      const texture2 = rendering.getTexture(sheet2Id, "sprite2.png")

      const wrongTexture1 = rendering.getTexture(sheet1Id, "sprite2.png")
      const wrongTexture2 = rendering.getTexture(sheet2Id, "sprite1.png")

      return {
        sheet1Valid: sheet1Id !== null,
        sheet2Valid: sheet2Id !== null,
        sheetsDifferent: sheet1Id !== sheet2Id,
        texture1Valid: texture1 !== null,
        texture2Valid: texture2 !== null,
        wrongTexture1IsNull: wrongTexture1 === null,
        wrongTexture2IsNull: wrongTexture2 === null,
      }
    })()`,
    )

    expect(result.sheet1Valid).toBe(true)
    expect(result.sheet2Valid).toBe(true)
    expect(result.sheetsDifferent).toBe(true)
    expect(result.texture1Valid).toBe(true)
    expect(result.texture2Valid).toBe(true)
    expect(result.wrongTexture1IsNull).toBe(true)
    expect(result.wrongTexture2IsNull).toBe(true)
  })

  test("should use spritesheet textures with setSprite", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

      function createTestImageDataUrl(width, height) {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx.fillStyle = "#FF00FF"
        ctx.fillRect(0, 0, width, height)
        return canvas.toDataURL("image/png")
      }

      const spritesheetJson = {
        frames: {
          "hero_idle.png": {
            frame: { x: 0, y: 0, w: 32, h: 32 },
            sourceSize: { w: 32, h: 32 },
          },
        },
        meta: { image: "hero.png", size: { w: 32, h: 32 }, scale: 1 },
      }

      const testImage = createTestImageDataUrl(32, 32)
      const sheetId = await rendering.loadSpritesheet(testImage, spritesheetJson)
      const textureId = rendering.getTexture(sheetId, "hero_idle.png")

      if (!textureId) {
        throw new Error("Failed to get texture from spritesheet")
      }

      const nodeId = rendering.createNode()
      rendering.setSprite(nodeId, textureId)

      return {
        success: true,
      }
    })()`,
    )

    expect(result.success).toBe(true)
  })

  test("should load real spritesheet from test-data files", async ({
    page,
  }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getRenderingSetup()}

      // Load the real JSON file
      const jsonResponse = await fetch("/tests/browser/test-data/spritesheet.json")
      const spritesheetJson = await jsonResponse.json()

      // Load the real WebP image
      const imageUrl = "/tests/browser/test-data/spritesheet.webp"
      const sheetId = await rendering.loadSpritesheet(imageUrl, spritesheetJson)

      // Test getting textures for known frames (from the JSON)
      const idle000 = rendering.getTexture(sheetId, "idle-000")
      const idle001 = rendering.getTexture(sheetId, "idle-001")
      const idle004 = rendering.getTexture(sheetId, "idle-004")
      const invalid = rendering.getTexture(sheetId, "nonexistent-frame")

      // Try using one of the frames
      const nodeId = rendering.createNode()
      rendering.setSprite(nodeId, idle000)
      rendering.setPosition(nodeId, 100, 100)

      return {
        sheetLoaded: sheetId !== null,
        idle000Valid: idle000 !== null,
        idle001Valid: idle001 !== null,
        idle004Valid: idle004 !== null,
        invalidIsNull: invalid === null,
        framesDifferent: idle000 !== idle001 && idle001 !== idle004,
      }
    })()`,
    )

    expect(result.sheetLoaded).toBe(true)
    expect(result.idle000Valid).toBe(true)
    expect(result.idle001Valid).toBe(true)
    expect(result.idle004Valid).toBe(true)
    expect(result.invalidIsNull).toBe(true)
    expect(result.framesDifferent).toBe(true)
  })
})
