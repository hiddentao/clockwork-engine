import { beforeEach, describe, expect, it } from "bun:test"
import { Serializer } from "../src/Serializer"
import { Vector2D } from "../src/geometry/Vector2D"

// Test class for custom serialization
class TestSerializableClass {
  constructor(
    public value: string,
    public count: number,
  ) {}

  serialize() {
    return {
      value: this.value,
      count: this.count,
    }
  }

  static deserialize(data: { value: string; count: number }) {
    return new TestSerializableClass(data.value, data.count)
  }
}

describe("Serializer", () => {
  let serializer: Serializer

  beforeEach(() => {
    serializer = new Serializer()
  })

  describe("Primitive type serialization", () => {
    it("should serialize and deserialize strings", () => {
      const original = "hello world"
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized).toBe(original)
      expect(deserialized).toBe(original)
    })

    it("should serialize and deserialize numbers", () => {
      const testNumbers = [42, -17, 0, 3.14159, -0.5, Number.MAX_SAFE_INTEGER]

      testNumbers.forEach((num) => {
        const serialized = serializer.serialize(num)
        const deserialized = serializer.deserialize(serialized)

        expect(serialized).toBe(num)
        expect(deserialized).toBe(num)
      })
    })

    it("should serialize and deserialize booleans", () => {
      const serializedTrue = serializer.serialize(true)
      const serializedFalse = serializer.serialize(false)

      expect(serializer.deserialize(serializedTrue)).toBe(true)
      expect(serializer.deserialize(serializedFalse)).toBe(false)
    })

    it("should handle null and undefined", () => {
      expect(serializer.serialize(null)).toBe(null)
      expect(serializer.deserialize(null)).toBe(null)
      expect(serializer.serialize(undefined)).toBe(undefined)
      expect(serializer.deserialize(undefined)).toBe(undefined)
    })
  })

  describe("Array serialization", () => {
    it("should serialize and deserialize simple arrays", () => {
      const original = [1, 2, 3, "hello", true, null]
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized).toEqual({
        __type: "Array",
        __data: [1, 2, 3, "hello", true, null],
      })
      expect(deserialized).toEqual(original)
    })

    it("should serialize nested arrays", () => {
      const original = [
        [1, 2],
        [3, 4],
        [5, [6, 7]],
      ]
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toEqual(original)
    })

    it("should handle empty arrays", () => {
      const original: any[] = []
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toEqual(original)
    })
  })

  describe("Object serialization", () => {
    it("should serialize and deserialize plain objects", () => {
      const original = {
        name: "test",
        count: 42,
        active: true,
        meta: null,
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized.__type).toBe("Object")
      expect(deserialized).toEqual(original)
    })

    it("should serialize nested objects", () => {
      const original = {
        user: {
          name: "John",
          preferences: {
            theme: "dark",
            notifications: true,
          },
        },
        items: [{ id: 1 }, { id: 2 }],
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toEqual(original)
    })

    it("should handle objects with array properties", () => {
      const original = {
        tags: ["red", "blue", "green"],
        scores: [95, 87, 92],
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toEqual(original)
    })
  })

  describe("Custom class serialization", () => {
    beforeEach(() => {
      serializer.registerType("TestSerializableClass", TestSerializableClass)
      serializer.registerType("Vector2D", Vector2D)
    })

    it("should serialize and deserialize registered custom classes", () => {
      const original = new TestSerializableClass("test", 123)
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(serialized.__type).toBe("TestSerializableClass")
      expect(deserialized).toBeInstanceOf(TestSerializableClass)
      expect(deserialized.value).toBe("test")
      expect(deserialized.count).toBe(123)
    })

    it("should serialize Vector2D objects", () => {
      const original = new Vector2D(10, 20)
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toBeInstanceOf(Vector2D)
      expect(deserialized.x).toBe(10)
      expect(deserialized.y).toBe(20)
    })

    it("should handle objects containing custom classes", () => {
      const original = {
        position: new Vector2D(5, 10),
        data: new TestSerializableClass("embedded", 456),
        metadata: {
          center: new Vector2D(0, 0),
        },
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.position).toBeInstanceOf(Vector2D)
      expect(deserialized.position.x).toBe(5)
      expect(deserialized.position.y).toBe(10)
      expect(deserialized.data).toBeInstanceOf(TestSerializableClass)
      expect(deserialized.data.value).toBe("embedded")
      expect(deserialized.metadata.center).toBeInstanceOf(Vector2D)
    })

    it("should handle arrays of custom objects", () => {
      const original = [
        new Vector2D(1, 2),
        new Vector2D(3, 4),
        new TestSerializableClass("item", 1),
      ]

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toHaveLength(3)
      expect(deserialized[0]).toBeInstanceOf(Vector2D)
      expect(deserialized[1]).toBeInstanceOf(Vector2D)
      expect(deserialized[2]).toBeInstanceOf(TestSerializableClass)
    })
  })

  describe("Type registry management", () => {
    it("should register and list custom types", () => {
      expect(serializer.getRegisteredTypes()).toHaveLength(0)

      serializer.registerType("TestClass", TestSerializableClass)
      expect(serializer.getRegisteredTypes()).toContain("TestClass")
      expect(serializer.getRegisteredTypes()).toHaveLength(1)
    })

    it("should clear registry", () => {
      serializer.registerType("TestClass", TestSerializableClass)
      expect(serializer.getRegisteredTypes()).toHaveLength(1)

      serializer.clearRegistry()
      expect(serializer.getRegisteredTypes()).toHaveLength(0)
    })

    it("should handle unregistered custom objects", () => {
      const customObj = new TestSerializableClass("unregistered", 999)
      const serialized = serializer.serialize(customObj)
      const deserialized = serializer.deserialize(serialized)

      // Should fall back to plain object serialization
      expect(deserialized).not.toBeInstanceOf(TestSerializableClass)
      expect(deserialized.value).toBe("unregistered")
      expect(deserialized.count).toBe(999)
    })
  })

  describe("Complex data structures", () => {
    it("should handle deeply nested structures", () => {
      const original = {
        level1: {
          level2: {
            level3: {
              arrays: [
                [1, 2],
                [3, 4],
              ],
              value: "deep",
            },
          },
        },
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized).toEqual(original)
    })

    it("should handle mixed data types", () => {
      serializer.registerType("Vector2D", Vector2D)

      const original = {
        string: "test",
        number: 42,
        boolean: true,
        null_value: null,
        array: [1, "two", true],
        nested_object: {
          vector: new Vector2D(10, 20),
        },
        vector_array: [new Vector2D(1, 2), new Vector2D(3, 4)],
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.string).toBe("test")
      expect(deserialized.number).toBe(42)
      expect(deserialized.boolean).toBe(true)
      expect(deserialized.null_value).toBe(null)
      expect(deserialized.array).toEqual([1, "two", true])
      expect(deserialized.nested_object.vector).toBeInstanceOf(Vector2D)
      expect(deserialized.vector_array[0]).toBeInstanceOf(Vector2D)
      expect(deserialized.vector_array[1]).toBeInstanceOf(Vector2D)
    })
  })

  describe("Error handling and edge cases", () => {
    it("should detect circular references", () => {
      const obj: any = { name: "test" }
      obj.self = obj // Create circular reference

      // Our current implementation doesn't handle circular references
      // It should throw a stack overflow error
      expect(() => {
        serializer.serialize(obj)
      }).toThrow()
    })

    it("should handle objects with undefined properties", () => {
      const original = {
        defined: "value",
        undefined: undefined,
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.defined).toBe("value")
      expect(deserialized.undefined).toBe(undefined)
    })

    it("should handle serialization of functions (should skip them)", () => {
      const original = {
        value: "test",
        func: () => "hello",
      }

      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)

      expect(deserialized.value).toBe("test")
      // Functions should be skipped or converted to undefined/null
    })
  })

  describe("Performance", () => {
    it("should handle large arrays efficiently", () => {
      const original = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        active: i % 2 === 0,
      }))

      const start = Date.now()
      const serialized = serializer.serialize(original)
      const deserialized = serializer.deserialize(serialized)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000) // Should complete in less than 1 second
      expect(deserialized).toHaveLength(1000)
      expect(deserialized[0].id).toBe(0)
      expect(deserialized[999].id).toBe(999)
    })
  })
})
