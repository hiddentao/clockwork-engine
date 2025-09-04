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
   * Register a custom class for serialization
   * @param typeName The name to use for this type in serialization
   * @param classConstructor The class constructor with deserialize static method
   */
  registerType(typeName: string, classConstructor: SerializableClass): void {
    this.typeRegistry.set(typeName, classConstructor)
  }

  /**
   * Serialize a value to a JSON-safe format
   * @param value The value to serialize
   * @returns Serialized data
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
   * Deserialize a value from serialized format
   * @param value The serialized value
   * @returns Deserialized data
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

          // Unknown type, return as plain object
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
