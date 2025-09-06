import { describe, expect, test } from "bun:test"
import { Vector2D } from "../../src/geometry/Vector2D"

describe("Vector2D", () => {
  describe("construction", () => {
    test("should create vector with x and y coordinates", () => {
      const v = new Vector2D(3, 4)
      expect(v.x).toBe(3)
      expect(v.y).toBe(4)
    })

    test("should handle negative coordinates", () => {
      const v = new Vector2D(-2, -5)
      expect(v.x).toBe(-2)
      expect(v.y).toBe(-5)
    })

    test("should handle zero coordinates", () => {
      const v = new Vector2D(0, 0)
      expect(v.x).toBe(0)
      expect(v.y).toBe(0)
    })

    test("should handle floating point coordinates", () => {
      const v = new Vector2D(1.5, 2.7)
      expect(v.x).toBe(1.5)
      expect(v.y).toBe(2.7)
    })
  })

  describe("basic operations", () => {
    test("should add vectors correctly", () => {
      const v1 = new Vector2D(3, 4)
      const v2 = new Vector2D(1, 2)
      const result = v1.add(v2)

      expect(result.x).toBe(4)
      expect(result.y).toBe(6)
      // Should not modify original vectors
      expect(v1.x).toBe(3)
      expect(v1.y).toBe(4)
    })

    test("should subtract vectors correctly", () => {
      const v1 = new Vector2D(5, 8)
      const v2 = new Vector2D(2, 3)
      const result = v1.subtract(v2)

      expect(result.x).toBe(3)
      expect(result.y).toBe(5)
    })

    test("should scale vector by scalar", () => {
      const v = new Vector2D(3, 4)
      const result = v.scale(2)

      expect(result.x).toBe(6)
      expect(result.y).toBe(8)
    })

    test("should scale by negative scalar", () => {
      const v = new Vector2D(3, 4)
      const result = v.scale(-0.5)

      expect(result.x).toBe(-1.5)
      expect(result.y).toBe(-2)
    })

    test("should scale by zero", () => {
      const v = new Vector2D(3, 4)
      const result = v.scale(0)

      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })
  })

  describe("dot product", () => {
    test("should calculate dot product correctly", () => {
      const v1 = new Vector2D(3, 4)
      const v2 = new Vector2D(2, 1)
      const result = v1.dot(v2)

      expect(result).toBe(10) // 3*2 + 4*1 = 10
    })

    test("should handle perpendicular vectors (dot product = 0)", () => {
      const v1 = new Vector2D(1, 0)
      const v2 = new Vector2D(0, 1)
      const result = v1.dot(v2)

      expect(result).toBe(0)
    })

    test("should handle parallel vectors", () => {
      const v1 = new Vector2D(2, 3)
      const v2 = new Vector2D(4, 6) // Same direction, double magnitude
      const result = v1.dot(v2)

      expect(result).toBe(26) // 2*4 + 3*6 = 26
    })

    test("should handle opposite vectors", () => {
      const v1 = new Vector2D(2, 3)
      const v2 = new Vector2D(-2, -3)
      const result = v1.dot(v2)

      expect(result).toBe(-13) // 2*(-2) + 3*(-3) = -13
    })
  })

  describe("length calculations", () => {
    test("should calculate length correctly", () => {
      const v = new Vector2D(3, 4)
      expect(v.length()).toBe(5) // 3-4-5 triangle
    })

    test("should handle zero vector length", () => {
      const v = new Vector2D(0, 0)
      expect(v.length()).toBe(0)
    })

    test("should handle unit vectors", () => {
      const v1 = new Vector2D(1, 0)
      const v2 = new Vector2D(0, 1)
      expect(v1.length()).toBe(1)
      expect(v2.length()).toBe(1)
    })

    test("should handle negative coordinates in length calculation", () => {
      const v = new Vector2D(-3, -4)
      expect(v.length()).toBe(5)
    })
  })

  describe("distance calculations", () => {
    test("should calculate distance between vectors", () => {
      const v1 = new Vector2D(0, 0)
      const v2 = new Vector2D(3, 4)
      expect(v1.distance(v2)).toBe(5)
      expect(v2.distance(v1)).toBe(5) // Should be symmetric
    })

    test("should calculate distance between same point", () => {
      const v = new Vector2D(5, 7)
      expect(v.distance(v)).toBe(0)
    })

    test("should use static distance method", () => {
      const v1 = new Vector2D(1, 2)
      const v2 = new Vector2D(4, 6)
      const instanceResult = v1.distance(v2)
      const staticResult = Vector2D.distance(v1, v2)
      expect(instanceResult).toBe(staticResult)
      expect(staticResult).toBe(5) // 3-4-5 triangle
    })

    test("should calculate squared distance efficiently", () => {
      const v1 = new Vector2D(1, 2)
      const v2 = new Vector2D(4, 6)
      const distanceSquared = Vector2D.distanceSquared(v1, v2)
      const distance = Vector2D.distance(v1, v2)

      expect(distanceSquared).toBe(25)
      expect(distance * distance).toBeCloseTo(distanceSquared)
    })

    test("should check if vectors are within distance", () => {
      const v1 = new Vector2D(0, 0)
      const v2 = new Vector2D(3, 4) // Distance = 5

      expect(Vector2D.isWithinDistance(v1, v2, 6)).toBe(true)
      expect(Vector2D.isWithinDistance(v1, v2, 5)).toBe(true)
      expect(Vector2D.isWithinDistance(v1, v2, 4)).toBe(false)
    })
  })

  describe("normalization", () => {
    test("should normalize vector to unit length", () => {
      const v = new Vector2D(3, 4)
      const normalized = v.normalize()

      expect(normalized.length()).toBeCloseTo(1, 10)
      expect(normalized.x).toBeCloseTo(0.6, 10)
      expect(normalized.y).toBeCloseTo(0.8, 10)
    })

    test("should handle zero vector normalization", () => {
      const v = new Vector2D(0, 0)
      const normalized = v.normalize()

      expect(normalized.x).toBe(0)
      expect(normalized.y).toBe(0)
    })

    test("should preserve direction after normalization", () => {
      const v = new Vector2D(10, 0)
      const normalized = v.normalize()

      expect(normalized.x).toBeCloseTo(1, 10)
      expect(normalized.y).toBeCloseTo(0, 10)
    })

    test("should not modify original vector during normalization", () => {
      const v = new Vector2D(3, 4)
      const normalized = v.normalize()

      expect(v.x).toBe(3)
      expect(v.y).toBe(4)
      expect(normalized.x).not.toBe(v.x)
    })
  })

  describe("rotation", () => {
    test("should rotate vector by 90 degrees", () => {
      const v = new Vector2D(1, 0)
      const rotated = v.rotate(Math.PI / 2) // 90 degrees

      expect(rotated.x).toBeCloseTo(0, 10)
      expect(rotated.y).toBeCloseTo(1, 10)
    })

    test("should rotate vector by 180 degrees", () => {
      const v = new Vector2D(1, 0)
      const rotated = v.rotate(Math.PI) // 180 degrees

      expect(rotated.x).toBeCloseTo(-1, 10)
      expect(rotated.y).toBeCloseTo(0, 10)
    })

    test("should handle negative rotation", () => {
      const v = new Vector2D(1, 0)
      const rotated = v.rotate(-Math.PI / 2) // -90 degrees

      expect(rotated.x).toBeCloseTo(0, 10)
      expect(rotated.y).toBeCloseTo(-1, 10)
    })

    test("should maintain vector length after rotation", () => {
      const v = new Vector2D(3, 4)
      const rotated = v.rotate(Math.PI / 4) // 45 degrees

      expect(rotated.length()).toBeCloseTo(v.length(), 10)
    })

    test("should handle full rotation (2π)", () => {
      const v = new Vector2D(3, 4)
      const rotated = v.rotate(2 * Math.PI)

      expect(rotated.x).toBeCloseTo(v.x, 10)
      expect(rotated.y).toBeCloseTo(v.y, 10)
    })
  })

  describe("angle calculations", () => {
    test("should calculate vector angle correctly", () => {
      const v1 = new Vector2D(1, 0) // Points right (0 radians)
      const v2 = new Vector2D(0, 1) // Points up (π/2 radians)
      const v3 = new Vector2D(-1, 0) // Points left (π radians)
      const v4 = new Vector2D(0, -1) // Points down (-π/2 radians)

      expect(v1.angle()).toBeCloseTo(0, 10)
      expect(v2.angle()).toBeCloseTo(Math.PI / 2, 10)
      expect(v3.angle()).toBeCloseTo(Math.PI, 10)
      expect(v4.angle()).toBeCloseTo(-Math.PI / 2, 10)
    })

    test("should calculate angle between vectors", () => {
      const v1 = new Vector2D(0, 0)
      const v2 = new Vector2D(1, 0) // Right
      const v3 = new Vector2D(0, 1) // Up
      const v4 = new Vector2D(-1, 0) // Left

      expect(v1.angleBetween(v2)).toBeCloseTo(0, 10)
      expect(v1.angleBetween(v3)).toBeCloseTo(Math.PI / 2, 10)
      expect(v1.angleBetween(v4)).toBeCloseTo(Math.PI, 10)
    })
  })

  describe("static angle utilities", () => {
    test("should normalize angles to [-π, π] range", () => {
      expect(Vector2D.normalizeAngle(0)).toBeCloseTo(0, 10)
      expect(Vector2D.normalizeAngle(Math.PI)).toBeCloseTo(Math.PI, 10)
      expect(Vector2D.normalizeAngle(-Math.PI)).toBeCloseTo(-Math.PI, 10)
      expect(Vector2D.normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 10) // 3π normalizes to π
      expect(Vector2D.normalizeAngle(-3 * Math.PI)).toBeCloseTo(-Math.PI, 10) // -3π normalizes to -π
      expect(Vector2D.normalizeAngle(2 * Math.PI)).toBeCloseTo(0, 10)
    })

    test("should calculate shortest angle difference", () => {
      // Test normal cases
      expect(Vector2D.angleDifference(0, Math.PI / 2)).toBeCloseTo(
        Math.PI / 2,
        10,
      )
      expect(Vector2D.angleDifference(Math.PI / 2, 0)).toBeCloseTo(
        -Math.PI / 2,
        10,
      )

      // Test wrapping cases
      expect(
        Vector2D.angleDifference(-Math.PI * 0.9, Math.PI * 0.9),
      ).toBeCloseTo(-0.2 * Math.PI, 10)
      expect(
        Vector2D.angleDifference(Math.PI * 0.9, -Math.PI * 0.9),
      ).toBeCloseTo(0.2 * Math.PI, 10)

      // Test same angles
      expect(Vector2D.angleDifference(Math.PI / 4, Math.PI / 4)).toBeCloseTo(
        0,
        10,
      )
    })
  })

  describe("utility methods", () => {
    test("should clone vector correctly", () => {
      const v = new Vector2D(3, 4)
      const cloned = v.clone()

      expect(cloned.x).toBe(v.x)
      expect(cloned.y).toBe(v.y)
      expect(cloned).not.toBe(v) // Different object reference
    })

    test("should convert to string", () => {
      const v = new Vector2D(3.5, -2.1)
      expect(v.toString()).toBe("(3.5, -2.1)")
    })

    test("should serialize to plain object", () => {
      const v = new Vector2D(3, 4)
      const serialized = v.serialize()

      expect(serialized).toEqual({ x: 3, y: 4 })
      expect(typeof serialized.x).toBe("number")
      expect(typeof serialized.y).toBe("number")
    })

    test("should deserialize from plain object", () => {
      const data = { x: 5, y: 7 }
      const deserialized = Vector2D.deserialize(data)

      expect(deserialized).toBeInstanceOf(Vector2D)
      expect(deserialized.x).toBe(5)
      expect(deserialized.y).toBe(7)
    })

    test("should maintain serialization round-trip integrity", () => {
      const original = new Vector2D(-2.5, 8.3)
      const serialized = original.serialize()
      const deserialized = Vector2D.deserialize(serialized)

      expect(deserialized.x).toBe(original.x)
      expect(deserialized.y).toBe(original.y)
    })
  })

  describe("edge cases and error conditions", () => {
    test("should handle very small numbers", () => {
      const v1 = new Vector2D(1e-10, 1e-10)
      const v2 = new Vector2D(2e-10, 2e-10)
      const result = v1.add(v2)

      expect(result.x).toBeCloseTo(3e-10, 15)
      expect(result.y).toBeCloseTo(3e-10, 15)
    })

    test("should handle very large numbers", () => {
      const v1 = new Vector2D(1e10, 1e10)
      const v2 = new Vector2D(2e10, 2e10)
      const result = v1.add(v2)

      expect(result.x).toBe(3e10)
      expect(result.y).toBe(3e10)
    })

    test("should handle NaN coordinates gracefully", () => {
      const v = new Vector2D(NaN, 5)
      expect(Number.isNaN(v.x)).toBe(true)
      expect(v.y).toBe(5)
      expect(Number.isNaN(v.length())).toBe(true)
    })

    test("should handle Infinity coordinates", () => {
      const v = new Vector2D(Infinity, 5)
      expect(v.x).toBe(Infinity)
      expect(v.y).toBe(5)
      expect(v.length()).toBe(Infinity)
    })
  })

  describe("immutability", () => {
    test("should not modify vectors in place", () => {
      const v1 = new Vector2D(3, 4)
      const v2 = new Vector2D(1, 2)

      const originalV1X = v1.x
      const originalV1Y = v1.y

      // Perform operations that should not modify original vectors
      v1.add(v2)
      v1.subtract(v2)
      v1.scale(2)
      v1.normalize()
      v1.rotate(Math.PI / 4)

      expect(v1.x).toBe(originalV1X)
      expect(v1.y).toBe(originalV1Y)
    })
  })
})
