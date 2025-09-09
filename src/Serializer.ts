export interface SerializableClass {
  new (...args: any[]): Serializable
  deserialize(data: any): Serializable
}

export interface Serializable {
  serialize(): any
}

export interface SerializedWrapper {
  __type: string
  __data: any
}

export class Serializer {
  private typeRegistry = new Map<string, SerializableClass>()

  /**
   * Register a custom class for serialization and deserialization
   * Classes must implement Serializable interface with serialize() method
   * and provide static deserialize() method for reconstruction
   * @param typeName Unique identifier for this type in serialized data
   * @param classConstructor Class constructor implementing SerializableClass interface
   */
  registerType(typeName: string, classConstructor: SerializableClass): void {
    this.typeRegistry.set(typeName, classConstructor)
  }

  /**
   * Serialize any value to a JSON-safe format with type information
   * Handles primitives, arrays, objects, and registered custom classes
   * @param value The value to serialize (primitive, array, object, or Serializable)
   * @returns Serialized data that can be JSON.stringify'd and later deserialized
   */
  serialize(value: any): any {
    if (value === null || value === undefined) {
      return value
    }

    // Handle primitives (string, number, boolean)
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return {
        __type: "Array",
        __data: value.map((item) => this.serialize(item)),
      } satisfies SerializedWrapper
    }

    // Handle objects with custom serialize method
    if (
      value &&
      typeof value === "object" &&
      typeof value.serialize === "function"
    ) {
      const typeName = this.getTypeName(value)
      return {
        __type: typeName,
        __data: this.serialize(value.serialize()),
      } satisfies SerializedWrapper
    }

    // Handle plain objects
    if (value && typeof value === "object" && value.constructor === Object) {
      const serializedObj: Record<string, any> = {}
      for (const [key, val] of Object.entries(value)) {
        serializedObj[key] = this.serialize(val)
      }
      return {
        __type: "Object",
        __data: serializedObj,
      } satisfies SerializedWrapper
    }

    // Handle other objects as plain objects (fallback)
    if (value && typeof value === "object") {
      const serializedObj: Record<string, any> = {}
      for (const [key, val] of Object.entries(value)) {
        serializedObj[key] = this.serialize(val)
      }
      return {
        __type: "Object",
        __data: serializedObj,
      } satisfies SerializedWrapper
    }

    return value
  }

  /**
   * Deserialize a value from serialized format with security validation
   * Reconstructs primitives, arrays, objects, and registered custom classes
   * Only allows deserialization of registered types for security
   * @param value The serialized value created by serialize()
   * @returns Reconstructed original value
   * @throws Error if type name contains unsafe patterns or is not registered
   */
  deserialize(value: any): any {
    // Handle primitives and null/undefined
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value
    }

    // Handle wrapped objects
    if (
      value &&
      typeof value === "object" &&
      "__type" in value &&
      "__data" in value
    ) {
      const wrapper = value as SerializedWrapper

      // Validate type name for security
      if (typeof wrapper.__type !== "string") {
        throw new Error("Invalid serialized data: __type must be a string")
      }

      // Prevent code injection by checking for dangerous patterns
      if (
        wrapper.__type.includes("function") ||
        wrapper.__type.includes("eval") ||
        wrapper.__type.includes("constructor") ||
        wrapper.__type.includes("__proto__") ||
        wrapper.__type.includes("prototype")
      ) {
        throw new Error(`Unsafe type name: ${wrapper.__type}`)
      }

      switch (wrapper.__type) {
        case "Array":
          return wrapper.__data.map((item: any) => this.deserialize(item))

        case "Object": {
          const obj: Record<string, any> = {}
          for (const [key, val] of Object.entries(wrapper.__data)) {
            obj[key] = this.deserialize(val)
          }
          return obj
        }

        default: {
          // Handle registered custom types
          const classConstructor = this.typeRegistry.get(wrapper.__type)
          if (classConstructor) {
            const deserializedData = this.deserialize(wrapper.__data)
            return classConstructor.deserialize(deserializedData)
          }

          // Fallback to plain object for unknown types (backward compatibility)
          return this.deserialize(wrapper.__data)
        }
      }
    }

    // Handle unwrapped objects
    if (value && typeof value === "object") {
      const obj: Record<string, any> = {}
      for (const [key, val] of Object.entries(value)) {
        obj[key] = this.deserialize(val)
      }
      return obj
    }

    return value
  }

  /**
   * Get the type name for a serializable object
   * Attempts to find the type name in the registry by constructor match
   */
  private getTypeName(obj: Serializable): string {
    for (const [typeName, classConstructor] of this.typeRegistry) {
      if (obj instanceof classConstructor) {
        return typeName
      }
    }

    // Fallback to constructor name or 'Object'
    return obj.constructor.name || "Object"
  }

  /**
   * Get all registered type names
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.typeRegistry.keys())
  }

  /**
   * Clear all registered types
   */
  clearRegistry(): void {
    this.typeRegistry.clear()
  }
}

/**
 * Singleton instance for global type registration and serialization
 * Use this for most common cases where you need a shared type registry
 */
export const serializer = new Serializer()
