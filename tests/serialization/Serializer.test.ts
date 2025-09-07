import { beforeEach, describe, expect, test } from "bun:test"
import {
  type Serializable,
  type SerializableClass,
  Serializer,
} from "../../src/Serializer"
import { Vector2D } from "../../src/geometry/Vector2D"

// Test classes for serialization
class TestPoint implements Serializable {
  constructor(
    public x: number,
    public y: number,
  ) {}

  serialize(): any {
    return { x: this.x, y: this.y }
  }

  static deserialize(data: any): TestPoint {
    return new TestPoint(data.x, data.y)
  }
}

class TestComplexObject implements Serializable {
  constructor(
    public name: string,
    public position: TestPoint,
    public values: number[],
  ) {}

  serialize(): any {
    return {
      name: this.name,
      position: this.position.serialize(),
      values: [...this.values],
    }
  }

  static deserialize(data: any): TestComplexObject {
    const position = TestPoint.deserialize(data.position)
    return new TestComplexObject(data.name, position, data.values)
  }
}

class TestCircularRef implements Serializable {
  public friend?: TestCircularRef

  constructor(public name: string) {}

  serialize(): any {
    return {
      name: this.name,
      // Avoid circular reference in serialization
      friendName: this.friend?.name || null,
    }
  }

  static deserialize(data: any): TestCircularRef {
    const obj = new TestCircularRef(data.name)
    // Note: circular references need special handling
    return obj
  }
}

describe("Serializer", () => {
  let serializer: Serializer

  beforeEach(() => {
    serializer = new Serializer()
  })

  describe("primitive types", () => {
    test("should serialize and deserialize null", () => {
      const original = null
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized).toBe(null)
      expect(deserialized).toBe(null)
    })

    test("should serialize and deserialize undefined", () => {
      const original = undefined
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized).toBe(undefined)
      expect(deserialized).toBe(undefined)
    })

    test("should serialize and deserialize strings", () => {
      const testStrings = [
        "",
        "hello",
        "world with spaces",
        "123",
        "special!@#$%chars",
      ]

      testStrings.forEach((str) => {
        const serialized = serializer.serialize(str)
        const deserialized = serializer.deserialize(serialized)

        expect(serialized).toBe(str)
        expect(deserialized).toBe(str)
      })
    })

    test("should serialize and deserialize numbers", () => {
      const testNumbers = [0, 1, -1, 3.14159, -2.718, Infinity, -Infinity]

      testNumbers.forEach((num) => {
        const serialized = serializer.serialize(num)
        const deserialized = serializer.deserialize(serialized)

        expect(serialized).toBe(num)
        expect(deserialized).toBe(num)
      })
    })

    test("should serialize and deserialize NaN", () => {
      const original = NaN
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(Number.isNaN(serialized)).toBe(true)
      expect(Number.isNaN(deserialized)).toBe(true)
    })

    test("should serialize and deserialize booleans", () => {
      const serializedTrue = serializer.serialize(true)
      const deserializedTrue = serializer.deserialize(serializedTrue)
      const serializedFalse = serializer.serialize(false)
      const deserializedFalse = serializer.deserialize(serializedFalse)

      expect(serializedTrue).toBe(true)
      expect(deserializedTrue).toBe(true)
      expect(serializedFalse).toBe(false)
      expect(deserializedFalse).toBe(false)
    })
  })

  describe("arrays", () => {
    test("should serialize and deserialize empty array", () => {
      const original: any[] = []
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized).toEqual({
        __type: "Array",
        __data: [],
      })
      expect(deserialized).toEqual([])
      expect(Array.isArray(deserialized)).toBe(true)
    })

    test("should serialize and deserialize primitive arrays", () => {
      const original = [1, 2, 3, "hello", true, null]
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized).toEqual({
        __type: "Array",
        __data: [1, 2, 3, "hello", true, null],
      })
      expect(deserialized).toEqual([1, 2, 3, "hello", true, null])
    })

    test("should serialize and deserialize nested arrays", () => {
      const original = [
        [1, 2],
        [3, 4],
        [
          [5, 6],
          [7, 8],
        ],
      ]
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toEqual([
        [1, 2],
        [3, 4],
        [
          [5, 6],
          [7, 8],
        ],
      ])
    })

    test("should handle sparse arrays", () => {
      const original = [1, , 3, , 5] // Sparse array
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      // Note: sparse arrays may be handled differently
      expect(Array.isArray(deserialized)).toBe(true)
      expect(deserialized).toHaveLength(5)
    })
  })

  describe("plain objects", () => {
    test("should serialize and deserialize empty object", () => {
      const original = {}
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized).toEqual({
        __type: "Object",
        __data: {},
      })
      expect(deserialized).toEqual({})
    })

    test("should serialize and deserialize simple objects", () => {
      const original = { a: 1, b: "hello", c: true }
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toEqual({ a: 1, b: "hello", c: true })
    })

    test("should serialize and deserialize nested objects", () => {
      const original = {
        level1: {
          level2: {
            value: 42,
            array: [1, 2, 3],
          },
          other: "test",
        },
      }
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toEqual(original)
    })

    test("should handle objects with null and undefined values", () => {
      const original = {
        nullValue: null,
        undefinedValue: undefined,
        normalValue: "test",
      }
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.nullValue).toBe(null)
      expect(deserialized.undefinedValue).toBe(undefined)
      expect(deserialized.normalValue).toBe("test")
    })
  })

  describe("custom serializable classes", () => {
    beforeEach(() => {
      serializer.registerType("TestPoint", TestPoint as SerializableClass)
    })

    test("should serialize and deserialize registered custom objects", () => {
      const original = new TestPoint(10, 20)
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized).toEqual({
        __type: "TestPoint",
        __data: {
          __type: "Object",
          __data: { x: 10, y: 20 },
        },
      })
      expect(deserialized).toBeInstanceOf(TestPoint)
      expect(deserialized.x).toBe(10)
      expect(deserialized.y).toBe(20)
    })

    test("should serialize and deserialize complex custom objects", () => {
      serializer.registerType(
        "TestComplexObject",
        TestComplexObject as SerializableClass,
      )

      const point = new TestPoint(5, 10)
      const original = new TestComplexObject("test", point, [1, 2, 3, 4])
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toBeInstanceOf(TestComplexObject)
      expect(deserialized.name).toBe("test")
      expect(deserialized.position).toBeInstanceOf(TestPoint)
      expect(deserialized.position.x).toBe(5)
      expect(deserialized.position.y).toBe(10)
      expect(deserialized.values).toEqual([1, 2, 3, 4])
    })

    test("should handle unregistered custom objects as plain objects", () => {
      const original = new TestPoint(15, 25)

      // Create new serializer without registration
      const unregisteredSerializer = new Serializer()
      const serialized = unregisteredSerializer.serialize(original)
      const deserialized = unregisteredSerializer.deserialize(serialized)

      // Should fall back to plain object behavior
      expect(deserialized).not.toBeInstanceOf(TestPoint)
      expect(typeof deserialized).toBe("object")
    })
  })

  describe("Vector2D integration", () => {
    test("should serialize and deserialize Vector2D objects", () => {
      serializer.registerType("Vector2D", Vector2D as SerializableClass)

      const original = new Vector2D(3.14, 2.718)
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toBeInstanceOf(Vector2D)
      expect(deserialized.x).toBe(3.14)
      expect(deserialized.y).toBe(2.718)
    })

    test("should handle arrays of Vector2D objects", () => {
      serializer.registerType("Vector2D", Vector2D as SerializableClass)

      const original = [
        new Vector2D(1, 2),
        new Vector2D(3, 4),
        new Vector2D(5, 6),
      ]
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(Array.isArray(deserialized)).toBe(true)
      expect(deserialized).toHaveLength(3)
      deserialized.forEach((point: Vector2D, index: number) => {
        expect(point).toBeInstanceOf(Vector2D)
        expect(point.x).toBe(original[index].x)
        expect(point.y).toBe(original[index].y)
      })
    })
  })

  describe("type registry management", () => {
    test("should register and track types", () => {
      expect(serializer.getRegisteredTypes()).toEqual([])

      serializer.registerType("TestPoint", TestPoint as SerializableClass)
      expect(serializer.getRegisteredTypes()).toEqual(["TestPoint"])

      serializer.registerType("Vector2D", Vector2D as SerializableClass)
      expect(serializer.getRegisteredTypes()).toContain("TestPoint")
      expect(serializer.getRegisteredTypes()).toContain("Vector2D")
      expect(serializer.getRegisteredTypes()).toHaveLength(2)
    })

    test("should allow overriding registered types", () => {
      serializer.registerType("TestType", TestPoint as SerializableClass)
      serializer.registerType("TestType", Vector2D as SerializableClass) // Override

      expect(serializer.getRegisteredTypes()).toEqual(["TestType"])

      // Test that the override works
      const original = new Vector2D(1, 2)
      const serialized = serializer.serialize(original)
      expect(serialized.__type).toBe("TestType")
    })

    test("should clear registry", () => {
      serializer.registerType("TestPoint", TestPoint as SerializableClass)
      serializer.registerType("Vector2D", Vector2D as SerializableClass)

      expect(serializer.getRegisteredTypes()).toHaveLength(2)

      serializer.clearRegistry()
      expect(serializer.getRegisteredTypes()).toEqual([])
    })
  })

  describe("edge cases and error conditions", () => {
    test("should handle circular references in serialize methods", () => {
      serializer.registerType(
        "TestCircularRef",
        TestCircularRef as SerializableClass,
      )

      const obj1 = new TestCircularRef("first")
      const obj2 = new TestCircularRef("second")
      obj1.friend = obj2
      obj2.friend = obj1

      // Should not cause infinite recursion due to custom serialize implementation
      const serialized = serializer.serialize(obj1)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toBeInstanceOf(TestCircularRef)
      expect(deserialized.name).toBe("first")
    })

    test("should handle objects with symbol properties", () => {
      const sym = Symbol("test")
      const original = {
        normalProp: "value",
        [sym]: "symbol value",
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      // Symbols are not enumerable in Object.entries, so they're excluded
      expect(deserialized.normalProp).toBe("value")
      expect(deserialized[sym]).toBe(undefined)
    })

    test("should handle functions in objects", () => {
      const original = {
        value: 42,
        method: function () {
          return this.value
        },
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      // Functions are preserved in this implementation
      expect(deserialized.value).toBe(42)
      expect(typeof deserialized.method).toBe("function")
    })

    test("should handle Date objects as plain objects", () => {
      const original = new Date("2023-01-01T00:00:00Z")
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      // Dates are treated as objects without special handling
      expect(deserialized).not.toBeInstanceOf(Date)
      expect(typeof deserialized).toBe("object")
    })

    test("should handle RegExp objects as plain objects", () => {
      const original = /test/gi
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      // RegExp treated as plain object
      expect(deserialized).not.toBeInstanceOf(RegExp)
      expect(typeof deserialized).toBe("object")
    })

    test("should handle objects with non-string keys", () => {
      const original = {
        normalKey: "value1",
        123: "value2", // Numeric key
        true: "value3", // Boolean key (converted to string)
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.normalKey).toBe("value1")
      expect(deserialized["123"]).toBe("value2")
      expect(deserialized["true"]).toBe("value3")
    })

    test("should handle very deep nesting", () => {
      // Create deeply nested object
      let current: any = { value: "deep" }
      for (let i = 0; i < 50; i++) {
        current = { nested: current }
      }

      const serialized = serializer.serialize(current)
      const deserialized = serializer.deserialize(serialized)

      // Navigate to the deep value
      let nav = deserialized
      for (let i = 0; i < 50; i++) {
        expect(nav.nested).toBeDefined()
        nav = nav.nested
      }
      expect(nav.value).toBe("deep")
    })

    test("should handle empty strings and whitespace", () => {
      const original = {
        empty: "",
        whitespace: "   ",
        newlines: "\n\t\r",
        unicode: "🚀🎯✨",
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.empty).toBe("")
      expect(deserialized.whitespace).toBe("   ")
      expect(deserialized.newlines).toBe("\n\t\r")
      expect(deserialized.unicode).toBe("🚀🎯✨")
    })

    test("should handle large numbers", () => {
      const original = {
        maxSafeInt: Number.MAX_SAFE_INTEGER,
        minSafeInt: Number.MIN_SAFE_INTEGER,
        maxValue: Number.MAX_VALUE,
        minValue: Number.MIN_VALUE,
        epsilon: Number.EPSILON,
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.maxSafeInt).toBe(Number.MAX_SAFE_INTEGER)
      expect(deserialized.minSafeInt).toBe(Number.MIN_SAFE_INTEGER)
      expect(deserialized.maxValue).toBe(Number.MAX_VALUE)
      expect(deserialized.minValue).toBe(Number.MIN_VALUE)
      expect(deserialized.epsilon).toBe(Number.EPSILON)
    })
  })

  describe("round-trip integrity", () => {
    test("should maintain round-trip integrity for complex structures", () => {
      serializer.registerType("Vector2D", Vector2D as SerializableClass)

      const original = {
        metadata: {
          version: "1.0.0",
          timestamp: Date.now(),
          createdAt: Date.now(),
          settings: {
            debug: true,
            values: [1, 2, 3, null, "test"],
          },
        },
        points: [
          new Vector2D(0, 0),
          new Vector2D(10, 10),
          new Vector2D(-5, 15),
        ],
        matrix: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.metadata.version).toBe(1)
      expect(deserialized.metadata.settings.debug).toBe(true)
      expect(deserialized.metadata.settings.values).toEqual([
        1,
        2,
        3,
        null,
        "test",
      ])

      expect(deserialized.points).toHaveLength(3)
      deserialized.points.forEach((point: Vector2D, index: number) => {
        expect(point).toBeInstanceOf(Vector2D)
        expect(point.x).toBe(original.points[index].x)
        expect(point.y).toBe(original.points[index].y)
      })

      expect(deserialized.matrix).toEqual([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ])
    })

    test("should handle multiple serialization/deserialization cycles", () => {
      serializer.registerType("TestPoint", TestPoint as SerializableClass)

      let current = new TestPoint(1.5, 2.7)

      // Run 5 cycles of serialize/deserialize
      for (let i = 0; i < 5; i++) {
        const serialized = serializer.serialize(current)
        current = serializer.deserialize(serialized)
      }

      expect(current).toBeInstanceOf(TestPoint)
      expect(current.x).toBe(1.5)
      expect(current.y).toBe(2.7)
    })

    test("should maintain type information across serialization", () => {
      serializer.registerType("TestPoint", TestPoint as SerializableClass)
      serializer.registerType("Vector2D", Vector2D as SerializableClass)

      const original = [
        new TestPoint(1, 2),
        new Vector2D(3, 4),
        { plain: "object" },
        [5, 6, 7],
        "string",
        42,
      ]

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized[0]).toBeInstanceOf(TestPoint)
      expect(deserialized[1]).toBeInstanceOf(Vector2D)
      expect(deserialized[2]).toEqual({ plain: "object" })
      expect(deserialized[3]).toEqual([5, 6, 7])
      expect(deserialized[4]).toBe("string")
      expect(deserialized[5]).toBe(42)
    })
  })
})
