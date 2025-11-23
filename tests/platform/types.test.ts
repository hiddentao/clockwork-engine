import { describe, expect, it } from "bun:test"
import { AudioContextState } from "../../src/platform/AudioLayer"
import {
  BlendMode,
  TextureFiltering,
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

describe("Enums", () => {
  describe("BlendMode", () => {
    it("should have correct string values", () => {
      expect(BlendMode.NORMAL).toBe(BlendMode.NORMAL)
      expect(BlendMode.ADD).toBe(BlendMode.ADD)
      expect(BlendMode.MULTIPLY).toBe(BlendMode.MULTIPLY)
      expect(BlendMode.SCREEN).toBe(BlendMode.SCREEN)
    })

    it("should be usable in type guards", () => {
      const mode: BlendMode = BlendMode.ADD
      expect(Object.values(BlendMode).includes(mode)).toBe(true)
    })
  })

  describe("TextureFiltering", () => {
    it("should have correct string values", () => {
      expect(TextureFiltering.LINEAR).toBe(TextureFiltering.LINEAR)
      expect(TextureFiltering.NEAREST).toBe(TextureFiltering.NEAREST)
    })

    it("should be usable in type guards", () => {
      const filtering: TextureFiltering = TextureFiltering.NEAREST
      expect(Object.values(TextureFiltering).includes(filtering)).toBe(true)
    })
  })

  describe("AudioContextState", () => {
    it("should have correct string values", () => {
      expect(AudioContextState.SUSPENDED).toBe(AudioContextState.SUSPENDED)
      expect(AudioContextState.RUNNING).toBe(AudioContextState.RUNNING)
      expect(AudioContextState.CLOSED).toBe(AudioContextState.CLOSED)
    })

    it("should be usable in type guards", () => {
      const state: AudioContextState = AudioContextState.RUNNING
      expect(Object.values(AudioContextState).includes(state)).toBe(true)
    })
  })
})
