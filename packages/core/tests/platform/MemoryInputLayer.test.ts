import { beforeEach, describe, expect, it } from "bun:test"
import { MemoryInputLayer } from "@clockwork-engine/platform-memory"

describe("MemoryInputLayer", () => {
  let input: MemoryInputLayer

  beforeEach(() => {
    input = new MemoryInputLayer()
  })

  describe("Pointer Event Subscription", () => {
    it("should register onPointerDown without errors", () => {
      expect(() =>
        input.onPointerDown(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })

    it("should register onPointerUp without errors", () => {
      expect(() =>
        input.onPointerUp(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })

    it("should register onPointerMove without errors", () => {
      expect(() =>
        input.onPointerMove(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })

    it("should register onClick without errors", () => {
      expect(() =>
        input.onClick(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })
  })

  describe("Keyboard Event Subscription", () => {
    it("should register onKeyDown without errors", () => {
      expect(() =>
        input.onKeyDown(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })

    it("should register onKeyUp without errors", () => {
      expect(() =>
        input.onKeyUp(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })
  })

  describe("Cleanup", () => {
    it("should remove all listeners without errors", () => {
      input.onPointerDown(() => {
        // No-op callback
      })
      input.onKeyDown(() => {
        // No-op callback
      })

      expect(() => input.removeAllListeners()).not.toThrow()
    })
  })

  describe("Manual Event Triggering (Test Helpers)", () => {
    it("should trigger pointer down event", () => {
      let called = false
      input.onPointerDown(() => {
        called = true
      })

      input.triggerPointerDown({ x: 100, y: 200, timestamp: Date.now() })
      expect(called).toBe(true)
    })

    it("should pass event data to callback", () => {
      let receivedEvent: any = null
      input.onPointerDown((event) => {
        receivedEvent = event
      })

      const testEvent = { x: 100, y: 200, button: 0, timestamp: Date.now() }
      input.triggerPointerDown(testEvent)

      expect(receivedEvent).toEqual(testEvent)
    })

    it("should trigger pointer up event", () => {
      let called = false
      input.onPointerUp(() => {
        called = true
      })

      input.triggerPointerUp({ x: 100, y: 200, timestamp: Date.now() })
      expect(called).toBe(true)
    })

    it("should trigger pointer move event", () => {
      let called = false
      input.onPointerMove(() => {
        called = true
      })

      input.triggerPointerMove({ x: 100, y: 200, timestamp: Date.now() })
      expect(called).toBe(true)
    })

    it("should trigger click event", () => {
      let called = false
      input.onClick(() => {
        called = true
      })

      input.triggerClick({ x: 100, y: 200, timestamp: Date.now() })
      expect(called).toBe(true)
    })

    it("should trigger key down event", () => {
      let called = false
      input.onKeyDown(() => {
        called = true
      })

      input.triggerKeyDown({ key: "a", code: "KeyA", timestamp: Date.now() })
      expect(called).toBe(true)
    })

    it("should trigger key up event", () => {
      let called = false
      input.onKeyUp(() => {
        called = true
      })

      input.triggerKeyUp({ key: "a", code: "KeyA", timestamp: Date.now() })
      expect(called).toBe(true)
    })

    it("should not trigger events after removeAllListeners", () => {
      let called = false
      input.onPointerDown(() => {
        called = true
      })

      input.removeAllListeners()
      input.triggerPointerDown({ x: 0, y: 0, timestamp: Date.now() })

      expect(called).toBe(false)
    })

    it("should handle multiple callbacks", () => {
      let count = 0
      input.onPointerDown(() => count++)
      input.onPointerDown(() => count++)
      input.onPointerDown(() => count++)

      input.triggerPointerDown({ x: 0, y: 0, timestamp: Date.now() })
      expect(count).toBe(3)
    })
  })
})
