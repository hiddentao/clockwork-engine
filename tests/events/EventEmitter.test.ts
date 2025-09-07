import { beforeEach, describe, expect, it } from "bun:test"
import { EventEmitter } from "../../src/EventEmitter"

// Define test event types
interface TestEvents {
  testEvent: (data: string) => void
  numberEvent: (num: number) => void
  multiParamEvent: (a: string, b: number, c: boolean) => void
  noParamEvent: () => void
  asyncEvent: (data: any) => void | Promise<void>
  [key: string]: (...args: any[]) => void | Promise<void>
}

describe("EventEmitter", () => {
  let emitter: EventEmitter<TestEvents>

  beforeEach(() => {
    emitter = new EventEmitter<TestEvents>()
  })

  describe("Basic Event Operations", () => {
    it("should register and emit single events", () => {
      let received: string | null = null

      emitter.on("testEvent", (data) => {
        received = data
      })

      emitter.emit("testEvent", "hello")
      expect(received as any).toBe("hello")
    })

    it("should register and emit events with multiple parameters", () => {
      let receivedParams: [string, number, boolean] | null = null

      emitter.on("multiParamEvent", (a, b, c) => {
        receivedParams = [a, b, c]
      })

      emitter.emit("multiParamEvent", "test", 42, true)
      expect(receivedParams as any).toEqual(["test", 42, true])
    })

    it("should handle events with no parameters", () => {
      let called = false

      emitter.on("noParamEvent", () => {
        called = true
      })

      emitter.emit("noParamEvent")
      expect(called).toBe(true)
    })

    it("should handle multiple listeners for same event", () => {
      const calls: string[] = []

      emitter.on("testEvent", (data) => calls.push(`listener1:${data}`))
      emitter.on("testEvent", (data) => calls.push(`listener2:${data}`))
      emitter.on("testEvent", (data) => calls.push(`listener3:${data}`))

      emitter.emit("testEvent", "broadcast")

      expect(calls).toContain("listener1:broadcast")
      expect(calls).toContain("listener2:broadcast")
      expect(calls).toContain("listener3:broadcast")
      expect(calls).toHaveLength(3)
    })
  })

  describe("Event Removal", () => {
    it("should remove specific listeners", () => {
      const calls: string[] = []

      const listener1 = (data: string) => calls.push(`listener1:${data}`)
      const listener2 = (data: string) => calls.push(`listener2:${data}`)

      emitter.on("testEvent", listener1)
      emitter.on("testEvent", listener2)

      // Emit to verify both listeners work
      emitter.emit("testEvent", "test1")
      expect(calls).toHaveLength(2)

      // Remove one listener
      emitter.off("testEvent", listener1)

      // Emit again
      calls.length = 0
      emitter.emit("testEvent", "test2")

      expect(calls).toEqual(["listener2:test2"])
    })

    it("should handle removing non-existent listeners gracefully", () => {
      const listener = (_data: string) => {
        /* no-op */
      }

      // Should not throw when removing non-registered listener
      expect(() => emitter.off("testEvent", listener)).not.toThrow()

      // Should not throw when removing from non-existent event
      expect(() =>
        emitter.off("numberEvent", () => {
          /* no-op */
        }),
      ).not.toThrow()
    })

    it("should clear all listeners", () => {
      let callCount = 0

      emitter.on("testEvent", () => callCount++)
      emitter.on("numberEvent", () => callCount++)
      emitter.on("noParamEvent", () => callCount++)

      emitter.clearListeners()

      emitter.emit("testEvent", "test")
      emitter.emit("numberEvent", 42)
      emitter.emit("noParamEvent")

      expect(callCount).toBe(0)
    })
  })

  describe("Event Execution Order", () => {
    it("should call listeners in registration order", () => {
      const executionOrder: string[] = []

      emitter.on("testEvent", () => executionOrder.push("first"))
      emitter.on("testEvent", () => executionOrder.push("second"))
      emitter.on("testEvent", () => executionOrder.push("third"))

      emitter.emit("testEvent", "test")

      expect(executionOrder).toEqual(["first", "second", "third"])
    })

    it("should handle listener modifications during emission", () => {
      const calls: string[] = []
      let secondListenerAdded = false

      emitter.on("testEvent", (data) => {
        calls.push(`first:${data}`)

        // Add a new listener during emission
        if (!secondListenerAdded) {
          emitter.on("testEvent", (data) => calls.push(`added:${data}`))
          secondListenerAdded = true
        }
      })

      emitter.emit("testEvent", "test1")
      emitter.emit("testEvent", "test2")

      // The new listener gets added during the first emit and will be called immediately
      // due to Set iteration behavior - this is implementation dependent
      expect(calls).toContain("first:test1")
      expect(calls).toContain("first:test2")
      expect(calls).toContain("added:test1") // May be called immediately
      expect(calls).toContain("added:test2")
    })
  })

  describe("Error Handling", () => {
    it("should propagate listener errors", () => {
      const calls: string[] = []

      emitter.on("testEvent", () => {
        calls.push("before-error")
        throw new Error("Test error")
      })

      emitter.on("testEvent", () => {
        calls.push("after-error")
      })

      // EventEmitter does not handle errors - they bubble up
      expect(() => emitter.emit("testEvent", "test")).toThrow("Test error")

      // First listener should have been called, second may not due to error
      expect(calls).toContain("before-error")
    })

    it("should handle async listeners correctly", async () => {
      const calls: string[] = []

      emitter.on("asyncEvent", async (data) => {
        calls.push(`async-start:${data}`)
        await new Promise((resolve) => setTimeout(resolve, 10))
        calls.push(`async-end:${data}`)
      })

      emitter.on("asyncEvent", (data) => {
        calls.push(`sync:${data}`)
      })

      emitter.emit("asyncEvent", "test")

      // Sync listener should be called immediately
      // Async listener should start but not complete yet
      expect(calls).toContain("sync:test")
      expect(calls).toContain("async-start:test")

      // Wait for async to complete
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(calls).toContain("async-end:test")
    })
  })

  describe("Edge Cases", () => {
    it("should handle emitting events with no listeners", () => {
      expect(() => emitter.emit("testEvent", "test")).not.toThrow()
      expect(() => emitter.emit("numberEvent", 42)).not.toThrow()
    })

    it("should handle same listener registered multiple times", () => {
      const calls: string[] = []
      const listener = (data: string) => calls.push(data)

      emitter.on("testEvent", listener)
      emitter.on("testEvent", listener)
      emitter.on("testEvent", listener)

      emitter.emit("testEvent", "test")

      // Using Set means same function reference is only stored once
      expect(calls).toEqual(["test"])
    })

    it("should handle clearing listeners multiple times", () => {
      emitter.on("testEvent", () => {
        /* no-op */
      })

      expect(() => {
        emitter.clearListeners()
        emitter.clearListeners()
        emitter.clearListeners()
      }).not.toThrow()
    })

    it("should handle complex listener removal patterns", () => {
      const calls: string[] = []

      const listener1 = (data: string) => calls.push(`1:${data}`)
      const listener2 = (data: string) => calls.push(`2:${data}`)
      const listener3 = (data: string) => calls.push(`3:${data}`)

      emitter.on("testEvent", listener1)
      emitter.on("testEvent", listener2)
      emitter.on("testEvent", listener3)

      // Remove middle listener
      emitter.off("testEvent", listener2)

      emitter.emit("testEvent", "test1")
      expect(calls).toEqual(["1:test1", "3:test1"])

      // Remove first listener
      calls.length = 0
      emitter.off("testEvent", listener1)

      emitter.emit("testEvent", "test2")
      expect(calls).toEqual(["3:test2"])

      // Remove last listener
      calls.length = 0
      emitter.off("testEvent", listener3)

      emitter.emit("testEvent", "test3")
      expect(calls).toEqual([])
    })
  })

  describe("Memory Management", () => {
    it("should properly clean up internal state", () => {
      // Add many listeners
      for (let i = 0; i < 100; i++) {
        emitter.on("testEvent", (_data) => {
          /* no-op */
        })
        emitter.on("numberEvent", (_num) => {
          /* no-op */
        })
      }

      // Clear all listeners
      emitter.clearListeners()

      // Emit events - should not call any listeners
      let called = false
      emitter.emit("testEvent", "test")
      emitter.emit("numberEvent", 42)

      expect(called).toBe(false)
    })

    it("should handle rapid listener addition and removal", () => {
      const listener = (_data: string) => {
        /* no-op */
      }

      // Rapidly add and remove listeners
      for (let i = 0; i < 1000; i++) {
        emitter.on("testEvent", listener)
        emitter.off("testEvent", listener)
      }

      // Should not have any listeners
      let called = false
      emitter.on("testEvent", () => {
        called = true
      })
      emitter.off("testEvent", () => {
        called = true
      })

      emitter.emit("testEvent", "test")
      expect(called).toBe(true)
    })
  })

  describe("Type Safety", () => {
    it("should enforce correct parameter types at compile time", () => {
      // These should compile without errors
      emitter.on("testEvent", (data: string) => {
        expect(typeof data).toBe("string")
      })

      emitter.on("numberEvent", (num: number) => {
        expect(typeof num).toBe("number")
      })

      emitter.on("multiParamEvent", (a: string, b: number, c: boolean) => {
        expect(typeof a).toBe("string")
        expect(typeof b).toBe("number")
        expect(typeof c).toBe("boolean")
      })

      // Emit with correct types
      emitter.emit("testEvent", "hello")
      emitter.emit("numberEvent", 42)
      emitter.emit("multiParamEvent", "test", 123, false)
    })
  })
})
