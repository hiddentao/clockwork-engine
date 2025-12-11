import { describe, expect, it } from "bun:test"
import { getImageMimeType } from "../../src/lib/mimeTypes"

describe("getImageMimeType", () => {
  describe("supported extensions", () => {
    it("should return image/png for .png files", () => {
      expect(getImageMimeType("sprite.png")).toBe("image/png")
    })

    it("should return image/jpeg for .jpg files", () => {
      expect(getImageMimeType("photo.jpg")).toBe("image/jpeg")
    })

    it("should return image/jpeg for .jpeg files", () => {
      expect(getImageMimeType("photo.jpeg")).toBe("image/jpeg")
    })

    it("should return image/webp for .webp files", () => {
      expect(getImageMimeType("sprite.webp")).toBe("image/webp")
    })

    it("should return image/gif for .gif files", () => {
      expect(getImageMimeType("animation.gif")).toBe("image/gif")
    })

    it("should return image/svg+xml for .svg files", () => {
      expect(getImageMimeType("icon.svg")).toBe("image/svg+xml")
    })
  })

  describe("case insensitivity", () => {
    it("should handle uppercase extensions", () => {
      expect(getImageMimeType("sprite.PNG")).toBe("image/png")
      expect(getImageMimeType("photo.JPG")).toBe("image/jpeg")
      expect(getImageMimeType("image.WEBP")).toBe("image/webp")
    })

    it("should handle mixed case extensions", () => {
      expect(getImageMimeType("sprite.Png")).toBe("image/png")
      expect(getImageMimeType("photo.JpEg")).toBe("image/jpeg")
    })
  })

  describe("paths with directories", () => {
    it("should handle paths with directories", () => {
      expect(getImageMimeType("assets/sprites/player.png")).toBe("image/png")
      expect(getImageMimeType("images/backgrounds/sky.webp")).toBe("image/webp")
    })

    it("should handle deep nested paths", () => {
      expect(getImageMimeType("a/b/c/d/sprite.jpg")).toBe("image/jpeg")
    })
  })

  describe("filenames with multiple dots", () => {
    it("should use the last extension", () => {
      expect(getImageMimeType("file.min.webp")).toBe("image/webp")
      expect(getImageMimeType("player.sprite.png")).toBe("image/png")
      expect(getImageMimeType("texture.v2.final.jpg")).toBe("image/jpeg")
    })
  })

  describe("edge cases", () => {
    it("should return default image/png for unknown extensions", () => {
      expect(getImageMimeType("file.bmp")).toBe("image/png")
      expect(getImageMimeType("file.tiff")).toBe("image/png")
      expect(getImageMimeType("file.unknown")).toBe("image/png")
    })

    it("should return default image/png for files without extension", () => {
      expect(getImageMimeType("filename")).toBe("image/png")
    })

    it("should return default image/png for empty string", () => {
      expect(getImageMimeType("")).toBe("image/png")
    })

    it("should handle paths ending with a dot", () => {
      expect(getImageMimeType("file.")).toBe("image/png")
    })
  })
})
