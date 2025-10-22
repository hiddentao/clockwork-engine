import { describe, expect, it } from "bun:test"
import { darkenColor, parseHexColor } from "../../src/lib/color"

describe("Color Utilities", () => {
  describe("parseHexColor", () => {
    describe("with # prefix", () => {
      it("should parse red color", () => {
        expect(parseHexColor("#FF0000")).toBe(0xff0000)
      })

      it("should parse green color", () => {
        expect(parseHexColor("#00FF00")).toBe(0x00ff00)
      })

      it("should parse blue color", () => {
        expect(parseHexColor("#0000FF")).toBe(0x0000ff)
      })

      it("should parse white color", () => {
        expect(parseHexColor("#FFFFFF")).toBe(0xffffff)
      })

      it("should parse black color", () => {
        expect(parseHexColor("#000000")).toBe(0x000000)
      })

      it("should parse orange color", () => {
        expect(parseHexColor("#FF8000")).toBe(0xff8000)
      })
    })

    describe("without # prefix", () => {
      it("should parse red color without prefix", () => {
        expect(parseHexColor("FF0000")).toBe(0xff0000)
      })

      it("should parse green color without prefix", () => {
        expect(parseHexColor("00FF00")).toBe(0x00ff00)
      })

      it("should parse blue color without prefix", () => {
        expect(parseHexColor("0000FF")).toBe(0x0000ff)
      })

      it("should parse white color without prefix", () => {
        expect(parseHexColor("FFFFFF")).toBe(0xffffff)
      })

      it("should parse black color without prefix", () => {
        expect(parseHexColor("000000")).toBe(0x000000)
      })
    })

    describe("case sensitivity", () => {
      it("should handle uppercase hex strings", () => {
        expect(parseHexColor("#ABCDEF")).toBe(0xabcdef)
      })

      it("should handle lowercase hex strings", () => {
        expect(parseHexColor("#abcdef")).toBe(0xabcdef)
      })

      it("should handle mixed case hex strings", () => {
        expect(parseHexColor("#FfAa00")).toBe(0xffaa00)
      })

      it("should handle mixed case without prefix", () => {
        expect(parseHexColor("FfAa00")).toBe(0xffaa00)
      })
    })

    describe("secondary colors", () => {
      it("should parse cyan color", () => {
        expect(parseHexColor("#00FFFF")).toBe(0x00ffff)
      })

      it("should parse magenta color", () => {
        expect(parseHexColor("#FF00FF")).toBe(0xff00ff)
      })

      it("should parse yellow color", () => {
        expect(parseHexColor("#FFFF00")).toBe(0xffff00)
      })
    })

    describe("various hex values", () => {
      it("should parse gray color", () => {
        expect(parseHexColor("#808080")).toBe(0x808080)
      })

      it("should parse dark red color", () => {
        expect(parseHexColor("#8B0000")).toBe(0x8b0000)
      })

      it("should parse navy color", () => {
        expect(parseHexColor("#000080")).toBe(0x000080)
      })

      it("should parse olive color", () => {
        expect(parseHexColor("#808000")).toBe(0x808000)
      })

      it("should parse purple color", () => {
        expect(parseHexColor("#800080")).toBe(0x800080)
      })

      it("should parse teal color", () => {
        expect(parseHexColor("#008080")).toBe(0x008080)
      })
    })
  })

  describe("darkenColor", () => {
    describe("basic darkening operations", () => {
      it("should darken red by 50%", () => {
        const result = darkenColor(0xff0000, 0.5)
        expect(result).toBe(0x7f0000)
      })

      it("should darken green by 50%", () => {
        const result = darkenColor(0x00ff00, 0.5)
        expect(result).toBe(0x007f00)
      })

      it("should darken blue by 50%", () => {
        const result = darkenColor(0x0000ff, 0.5)
        expect(result).toBe(0x00007f)
      })

      it("should darken orange by 80% brightness (20% darker)", () => {
        const result = darkenColor(0xff8000, 0.8)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(Math.floor(0xff * 0.8))
        expect(g).toBe(Math.floor(0x80 * 0.8))
        expect(b).toBe(0)
      })

      it("should darken white by 20% brightness (80% darker)", () => {
        const result = darkenColor(0xffffff, 0.2)
        expect(result).toBe(0x333333)
      })

      it("should darken gray by 50%", () => {
        const result = darkenColor(0x808080, 0.5)
        expect(result).toBe(0x404040)
      })
    })

    describe("edge cases", () => {
      it("should return same color with factor 1.0", () => {
        expect(darkenColor(0xff8000, 1.0)).toBe(0xff8000)
        expect(darkenColor(0x123456, 1.0)).toBe(0x123456)
        expect(darkenColor(0xffffff, 1.0)).toBe(0xffffff)
      })

      it("should return black with factor 0.0", () => {
        expect(darkenColor(0xff0000, 0.0)).toBe(0x000000)
        expect(darkenColor(0x00ff00, 0.0)).toBe(0x000000)
        expect(darkenColor(0x0000ff, 0.0)).toBe(0x000000)
        expect(darkenColor(0xffffff, 0.0)).toBe(0x000000)
        expect(darkenColor(0x123456, 0.0)).toBe(0x000000)
      })

      it("should handle already black color", () => {
        expect(darkenColor(0x000000, 0.5)).toBe(0x000000)
        expect(darkenColor(0x000000, 0.8)).toBe(0x000000)
        expect(darkenColor(0x000000, 0.0)).toBe(0x000000)
      })
    })

    describe("RGB component independence", () => {
      it("should darken only red component", () => {
        const result = darkenColor(0xff0000, 0.5)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(127)
        expect(g).toBe(0)
        expect(b).toBe(0)
      })

      it("should darken only green component", () => {
        const result = darkenColor(0x00ff00, 0.5)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(0)
        expect(g).toBe(127)
        expect(b).toBe(0)
      })

      it("should darken only blue component", () => {
        const result = darkenColor(0x0000ff, 0.5)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(0)
        expect(g).toBe(0)
        expect(b).toBe(127)
      })

      it("should darken all components equally for white", () => {
        const result = darkenColor(0xffffff, 0.5)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(127)
        expect(g).toBe(127)
        expect(b).toBe(127)
      })
    })

    describe("complex colors", () => {
      it("should darken purple correctly", () => {
        const result = darkenColor(0x800080, 0.5)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(64)
        expect(g).toBe(0)
        expect(b).toBe(64)
      })

      it("should darken cyan correctly", () => {
        const result = darkenColor(0x00ffff, 0.5)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(0)
        expect(g).toBe(127)
        expect(b).toBe(127)
      })

      it("should darken yellow correctly", () => {
        const result = darkenColor(0xffff00, 0.5)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(127)
        expect(g).toBe(127)
        expect(b).toBe(0)
      })

      it("should darken arbitrary color correctly", () => {
        const result = darkenColor(0xabcdef, 0.6)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(Math.floor(0xab * 0.6))
        expect(g).toBe(Math.floor(0xcd * 0.6))
        expect(b).toBe(Math.floor(0xef * 0.6))
      })
    })

    describe("mathematical accuracy", () => {
      it("should floor values correctly", () => {
        const result = darkenColor(0xff0000, 0.333)
        const r = (result >> 16) & 0xff

        expect(r).toBe(Math.floor(255 * 0.333))
        expect(r).toBe(84)
      })

      it("should handle non-divisible values", () => {
        const result = darkenColor(0xff0000, 0.777)
        const r = (result >> 16) & 0xff

        expect(r).toBe(Math.floor(255 * 0.777))
        expect(r).toBe(198)
      })

      it("should handle small factors", () => {
        const result = darkenColor(0xffffff, 0.01)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(2)
        expect(g).toBe(2)
        expect(b).toBe(2)
      })

      it("should handle factors close to 1.0", () => {
        const result = darkenColor(0xff8040, 0.99)
        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBe(Math.floor(0xff * 0.99))
        expect(g).toBe(Math.floor(0x80 * 0.99))
        expect(b).toBe(Math.floor(0x40 * 0.99))
      })
    })

    describe("bit manipulation verification", () => {
      it("should correctly extract and recombine RGB components", () => {
        const originalColor = 0xaabbcc
        const factor = 1.0
        const result = darkenColor(originalColor, factor)

        expect(result).toBe(originalColor)
      })

      it("should preserve component boundaries", () => {
        const result = darkenColor(0xffffff, 0.5)

        const r = (result >> 16) & 0xff
        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(r).toBeGreaterThanOrEqual(0)
        expect(r).toBeLessThanOrEqual(255)
        expect(g).toBeGreaterThanOrEqual(0)
        expect(g).toBeLessThanOrEqual(255)
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThanOrEqual(255)
      })

      it("should not affect other components when darkening one", () => {
        const result = darkenColor(0xff0000, 0.5)

        const g = (result >> 8) & 0xff
        const b = result & 0xff

        expect(g).toBe(0)
        expect(b).toBe(0)
      })
    })
  })
})
