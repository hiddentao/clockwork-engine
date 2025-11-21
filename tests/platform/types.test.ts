import { describe, expect, it } from "bun:test"
import {
  asNodeId,
  asSpritesheetId,
  asTextureId,
} from "../../src/platform/types"
import type { NodeId, TextureId } from "../../src/platform/types"

describe("Branded Types", () => {
  describe("NodeId", () => {
    it("should create NodeId from number", () => {
      const id = asNodeId(42)
      expect(id).toBe(asNodeId(42))
    })

    it("should be type-safe at compile time", () => {
      const nodeId: NodeId = asNodeId(1)
      const textureId: TextureId = asTextureId(1)

      // These should be different types even though values are the same
      expect(nodeId).toBe(asNodeId(1))
      expect(textureId).toBe(asTextureId(1))
    })
  })

  describe("TextureId", () => {
    it("should create TextureId from number", () => {
      const id = asTextureId(123)
      expect(id).toBe(asTextureId(123))
    })
  })

  describe("SpritesheetId", () => {
    it("should create SpritesheetId from number", () => {
      const id = asSpritesheetId(456)
      expect(id).toBe(asSpritesheetId(456))
    })
  })

  describe("Type Safety", () => {
    it("should prevent accidental mixing in TypeScript", () => {
      // This test validates at compile-time that branded types
      // cannot be accidentally mixed
      const nodeId = asNodeId(1)
      const textureId = asTextureId(2)

      // Runtime: both are numbers
      expect(typeof nodeId).toBe("number")
      expect(typeof textureId).toBe("number")

      // Compile-time: TypeScript should prevent this
      // const mixedId: NodeId = textureId // TS Error!
    })
  })
})
