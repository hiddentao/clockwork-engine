import { beforeEach, describe, expect, it } from "bun:test"
import { EventCallbackManager } from "../../../src/platform/utils/EventCallbackManager"

describe("EventCallbackManager", () => {
  let manager: EventCallbackManager<number>

  beforeEach(() => {
    manager = new EventCallbackManager<number>()
  })

  describe("Callback Registration", () => {
    it("should register a callback", () => {
      const callback = (_value: number) => {
        /* noop */
      }
      manager.register(callback)
      expect(manager.count).toBe(1)
    })

    it("should prevent duplicate registration of the same callback", () => {
      const callback = (_value: number) => {
        /* noop */
      }
      manager.register(callback)
      manager.register(callback)
      expect(manager.count).toBe(1)
    })

    it("should allow multiple different callbacks", () => {
      const callback1 = (_value: number) => {
        /* noop */
      }
      const callback2 = (_value: number) => {
        /* noop */
      }
      manager.register(callback1)
      manager.register(callback2)
      expect(manager.count).toBe(2)
    })

    it("should handle edge case of registering same callback multiple times", () => {
      const callback = (_value: number) => {
        /* noop */
      }
      manager.register(callback)
      manager.register(callback)
      manager.register(callback)
      expect(manager.count).toBe(1)
    })

    it("should handle arrow function callbacks", () => {
      const callback = (val: number) => val * 2
      manager.register(callback)
      manager.register(callback)
      expect(manager.count).toBe(1)
    })

    it("should handle bound function callbacks", () => {
      const obj = {
        value: 0,
        increment(delta: number) {
          this.value += delta
        },
      }

      const bound = obj.increment.bind(obj)
      manager.register(bound)
      manager.register(bound)
      expect(manager.count).toBe(1)
    })

    it("should treat different bound versions as different callbacks", () => {
      const obj = {
        value: 0,
        fn() {
          /* noop */
        },
      }

      const bound1 = obj.fn.bind(obj)
      const bound2 = obj.fn.bind(obj)

      manager.register(bound1)
      manager.register(bound2)

      expect(manager.count).toBe(2)
    })
  })

  describe("Callback Triggering", () => {
    it("should trigger all registered callbacks", () => {
      let count = 0
      const callback1 = () => count++
      const callback2 = () => count++

      manager.register(callback1)
      manager.register(callback2)
      manager.trigger(1)

      expect(count).toBe(2)
    })

    it("should pass event data to all callbacks", () => {
      const values: number[] = []
      const callback1 = (val: number) => values.push(val)
      const callback2 = (val: number) => values.push(val * 2)

      manager.register(callback1)
      manager.register(callback2)
      manager.trigger(10)

      expect(values).toEqual([10, 20])
    })

    it("should trigger callbacks in registration order", () => {
      const order: number[] = []
      const callback1 = () => order.push(1)
      const callback2 = () => order.push(2)
      const callback3 = () => order.push(3)

      manager.register(callback1)
      manager.register(callback2)
      manager.register(callback3)
      manager.trigger(1)

      expect(order).toEqual([1, 2, 3])
    })

    it("should not fail if no callbacks registered", () => {
      expect(() => manager.trigger(1)).not.toThrow()
    })

    it("should trigger only non-duplicate callbacks", () => {
      let count = 0
      const callback = () => count++

      manager.register(callback)
      manager.register(callback)
      manager.trigger(1)

      expect(count).toBe(1)
    })
  })

  describe("Callback Clearing", () => {
    it("should clear all callbacks", () => {
      const callback1 = (_value: number) => {
        /* noop */
      }
      const callback2 = (_value: number) => {
        /* noop */
      }

      manager.register(callback1)
      manager.register(callback2)
      manager.clear()

      expect(manager.count).toBe(0)
    })

    it("should not trigger callbacks after clear", () => {
      let count = 0
      const callback = () => count++

      manager.register(callback)
      manager.clear()
      manager.trigger(1)

      expect(count).toBe(0)
    })

    it("should allow re-registration after clear", () => {
      const callback = (_value: number) => {
        /* noop */
      }

      manager.register(callback)
      manager.clear()
      manager.register(callback)

      expect(manager.count).toBe(1)
    })

    it("should handle clearing when already empty", () => {
      expect(() => manager.clear()).not.toThrow()
      expect(manager.count).toBe(0)
    })
  })

  describe("Callback Count", () => {
    it("should return 0 when no callbacks registered", () => {
      expect(manager.count).toBe(0)
    })

    it("should return correct count after registrations", () => {
      const callback1 = (_value: number) => {
        /* noop */
      }
      const callback2 = (_value: number) => {
        /* noop */
      }
      const callback3 = (_value: number) => {
        /* noop */
      }

      manager.register(callback1)
      expect(manager.count).toBe(1)

      manager.register(callback2)
      expect(manager.count).toBe(2)

      manager.register(callback3)
      expect(manager.count).toBe(3)
    })

    it("should not increase count when duplicate prevented", () => {
      const callback = (_value: number) => {
        /* noop */
      }

      manager.register(callback)
      expect(manager.count).toBe(1)

      manager.register(callback)
      expect(manager.count).toBe(1)
    })

    it("should return 0 after clear", () => {
      const callback = (_value: number) => {
        /* noop */
      }
      manager.register(callback)
      manager.clear()
      expect(manager.count).toBe(0)
    })
  })

  describe("Edge Cases", () => {
    it("should handle clearing when already empty", () => {
      manager.clear()
      manager.clear()
      expect(manager.count).toBe(0)
    })

    it("should handle triggering with no callbacks", () => {
      expect(() => manager.trigger(1)).not.toThrow()
    })

    it("should handle rapid register/trigger cycles", () => {
      let count = 0
      const callback = () => count++

      manager.register(callback)
      manager.trigger(1)
      manager.trigger(1)
      manager.trigger(1)

      expect(count).toBe(3)
    })

    it("should handle callback registration during trigger", () => {
      const order: string[] = []

      const callback2 = () => {
        order.push("callback2")
      }

      const callback1 = () => {
        order.push("callback1")
        manager.register(callback2)
      }

      manager.register(callback1)
      manager.trigger(1)

      expect(order).toContain("callback1")

      order.length = 0
      manager.trigger(1)
      expect(order).toContain("callback1")
      expect(order).toContain("callback2")
    })

    it("should maintain callback identity correctly", () => {
      const obj = { value: 0 }
      const callback = () => obj.value++

      manager.register(callback)
      manager.trigger(1)
      manager.trigger(1)

      expect(obj.value).toBe(2)
    })
  })

  describe("Complex Scenarios", () => {
    it("should handle mixed callback types", () => {
      const results: number[] = []

      const arrow = (val: number) => results.push(val)
      function regular(val: number) {
        results.push(val * 2)
      }
      const obj = {
        method(val: number) {
          results.push(val * 3)
        },
      }

      manager.register(arrow)
      manager.register(regular)
      manager.register(obj.method.bind(obj))
      manager.trigger(10)

      expect(results).toEqual([10, 20, 30])
    })

    it("should handle callback removal and re-addition via clear", () => {
      let count = 0
      const callback = () => count++

      manager.register(callback)
      manager.trigger(1)
      expect(count).toBe(1)

      manager.clear()
      manager.trigger(1)
      expect(count).toBe(1)

      manager.register(callback)
      manager.trigger(1)
      expect(count).toBe(2)
    })
  })
})
