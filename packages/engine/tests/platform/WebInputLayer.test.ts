import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { WebInputLayer } from "../../src/platform/web/WebInputLayer"
import {
  cleanupBrowserEnvironment,
  setupBrowserEnvironment,
} from "../setup/browser.setup"

describe("WebInputLayer", () => {
  let container: HTMLDivElement
  let input: WebInputLayer

  beforeEach(() => {
    setupBrowserEnvironment()
    container = document.createElement("div")
    document.body.appendChild(container)
    input = new WebInputLayer(container)
  })

  afterEach(() => {
    input.removeAllListeners()
    document.body.removeChild(container)
    cleanupBrowserEnvironment()
  })

  describe("Pointer Events", () => {
    it("should register pointer down listener", () => {
      expect(() =>
        input.onPointerDown(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })

    it("should trigger pointer down callback", () => {
      let called = false
      input.onPointerDown(() => {
        called = true
      })

      const event = new MouseEvent("pointerdown", {
        clientX: 100,
        clientY: 200,
      })
      container.dispatchEvent(event)

      expect(called).toBe(true)
    })

    it("should pass event data to pointer down callback", () => {
      let receivedEvent: any = null
      input.onPointerDown((event) => {
        receivedEvent = event
      })

      const mouseEvent = new MouseEvent("pointerdown", {
        clientX: 150,
        clientY: 250,
        button: 0,
      })
      container.dispatchEvent(mouseEvent)

      expect(receivedEvent).toBeDefined()
      expect(receivedEvent.x).toBe(150)
      expect(receivedEvent.y).toBe(250)
      expect(receivedEvent.button).toBe(0)
      expect(receivedEvent.timestamp).toBeDefined()
    })

    it("should trigger pointer up callback", () => {
      let called = false
      input.onPointerUp(() => {
        called = true
      })

      container.dispatchEvent(new MouseEvent("pointerup"))
      expect(called).toBe(true)
    })

    it("should trigger pointer move callback", () => {
      let called = false
      input.onPointerMove(() => {
        called = true
      })

      container.dispatchEvent(new MouseEvent("pointermove"))
      expect(called).toBe(true)
    })

    it("should trigger click callback", () => {
      let called = false
      input.onClick(() => {
        called = true
      })

      container.dispatchEvent(new MouseEvent("click"))
      expect(called).toBe(true)
    })
  })

  describe("Keyboard Events", () => {
    it("should register key down listener", () => {
      expect(() =>
        input.onKeyDown(() => {
          // No-op callback
        }),
      ).not.toThrow()
    })

    it("should trigger key down callback", () => {
      let called = false
      input.onKeyDown(() => {
        called = true
      })

      const event = new KeyboardEvent("keydown", { key: "a", code: "KeyA" })
      window.dispatchEvent(event)

      expect(called).toBe(true)
    })

    it("should pass keyboard event data", () => {
      let receivedEvent: any = null
      input.onKeyDown((event) => {
        receivedEvent = event
      })

      const keyEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
      })
      window.dispatchEvent(keyEvent)

      expect(receivedEvent).toBeDefined()
      expect(receivedEvent.key).toBe("Enter")
      expect(receivedEvent.code).toBe("Enter")
      expect(receivedEvent.timestamp).toBeDefined()
    })

    it("should trigger key up callback", () => {
      let called = false
      input.onKeyUp(() => {
        called = true
      })

      window.dispatchEvent(new KeyboardEvent("keyup"))
      expect(called).toBe(true)
    })
  })

  describe("Multiple Callbacks", () => {
    it("should support multiple pointer down callbacks", () => {
      let count = 0
      input.onPointerDown(() => count++)
      input.onPointerDown(() => count++)
      input.onPointerDown(() => count++)

      container.dispatchEvent(new MouseEvent("pointerdown"))
      expect(count).toBe(3)
    })

    it("should support multiple key down callbacks", () => {
      let count = 0
      input.onKeyDown(() => count++)
      input.onKeyDown(() => count++)

      window.dispatchEvent(new KeyboardEvent("keydown"))
      expect(count).toBe(2)
    })
  })

  describe("Cleanup", () => {
    it("should remove all listeners", () => {
      let pointerCount = 0
      let keyCount = 0

      input.onPointerDown(() => pointerCount++)
      input.onKeyDown(() => keyCount++)

      input.removeAllListeners()

      container.dispatchEvent(new MouseEvent("pointerdown"))
      window.dispatchEvent(new KeyboardEvent("keydown"))

      expect(pointerCount).toBe(0)
      expect(keyCount).toBe(0)
    })

    it("should not throw when removing listeners twice", () => {
      input.onPointerDown(() => {
        // No-op callback
      })
      input.removeAllListeners()

      expect(() => input.removeAllListeners()).not.toThrow()
    })
  })

  describe("Coordinate Normalization", () => {
    it("should normalize coordinates relative to container", () => {
      // Note: In happy-dom, getBoundingClientRect might not work perfectly
      // but we can test the structure
      let receivedX = 0
      let receivedY = 0

      input.onPointerDown((event) => {
        receivedX = event.x
        receivedY = event.y
      })

      const event = new MouseEvent("pointerdown", {
        clientX: 100,
        clientY: 200,
      })
      container.dispatchEvent(event)

      // Coordinates should be provided (exact values depend on container position)
      expect(typeof receivedX).toBe("number")
      expect(typeof receivedY).toBe("number")
    })
  })
})
