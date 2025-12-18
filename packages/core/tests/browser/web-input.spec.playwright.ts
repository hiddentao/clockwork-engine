import { expect, test } from "@playwright/test"

/**
 * Setup code for creating input layer with test container
 */
function getInputSetup() {
  return `
    const { WebInputLayer } = await import("/dist/platform-web-pixi.js")

    document.body.style.margin = "0"
    document.body.style.padding = "0"

    const testContainer = document.createElement("div")
    testContainer.id = "test-container"
    testContainer.style.width = "800px"
    testContainer.style.height = "600px"
    testContainer.style.position = "absolute"
    testContainer.style.top = "0"
    testContainer.style.left = "0"
    testContainer.style.backgroundColor = "#1a1a2e"
    document.body.appendChild(testContainer)

    const input = new WebInputLayer(testContainer)
  `
}

test.describe("WebInputLayer (Browser with DOM Events)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/tests/browser/test-page.html")
  })

  test("should initialize with container", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      return {
        initialized: input !== null,
        containerExists: document.getElementById("test-container") !== null,
      }
    })()`,
    )

    expect(result.initialized).toBe(true)
    expect(result.containerExists).toBe(true)
  })

  test("should handle pointer down events", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      const events = []
      input.onPointerDown((event) => {
        events.push({
          x: event.x,
          y: event.y,
          button: event.button,
        })
      })

      testContainer.dispatchEvent(new PointerEvent("pointerdown", {
        clientX: 150,
        clientY: 250,
        button: 0,
        bubbles: true,
        cancelable: true,
        composed: true,
      }))

      return {
        eventCount: events.length,
        firstEvent: events[0],
      }
    })()`,
    )

    expect(result.eventCount).toBe(1)
    expect(result.firstEvent.x).toBe(150)
    expect(result.firstEvent.y).toBe(230)
    expect(result.firstEvent.button).toBe(0)
  })

  test("should handle pointer up events", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      const events = []
      input.onPointerUp((event) => {
        events.push({
          x: event.x,
          y: event.y,
        })
      })

      testContainer.dispatchEvent(new PointerEvent("pointerup", {
        clientX: 300,
        clientY: 400,
        bubbles: true,
        cancelable: true,
        composed: true,
      }))

      return {
        eventCount: events.length,
        firstEvent: events[0],
      }
    })()`,
    )

    expect(result.eventCount).toBe(1)
    expect(result.firstEvent.x).toBe(300)
    expect(result.firstEvent.y).toBe(380)
  })

  test("should handle pointer move events", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      const events = []
      input.onPointerMove((event) => {
        events.push({
          x: event.x,
          y: event.y,
        })
      })

      testContainer.dispatchEvent(new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 100,
        bubbles: true,
        cancelable: true,
        composed: true,
      }))

      testContainer.dispatchEvent(new PointerEvent("pointermove", {
        clientX: 200,
        clientY: 200,
        bubbles: true,
        cancelable: true,
        composed: true,
      }))

      return {
        eventCount: events.length,
        firstEvent: events[0],
        lastEvent: events[events.length - 1],
      }
    })()`,
    )

    expect(result.eventCount).toBe(2)
    expect(result.firstEvent.x).toBe(100)
    expect(result.firstEvent.y).toBe(80)
    expect(result.lastEvent.x).toBe(200)
    expect(result.lastEvent.y).toBe(180)
  })

  test("should handle click events", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      const events = []
      input.onClick((event) => {
        events.push({
          x: event.x,
          y: event.y,
        })
      })

      testContainer.dispatchEvent(new MouseEvent("click", {
        clientX: 500,
        clientY: 300,
        bubbles: true,
        cancelable: true,
        composed: true,
      }))

      return {
        eventCount: events.length,
        firstEvent: events[0],
      }
    })()`,
    )

    expect(result.eventCount).toBe(1)
    expect(result.firstEvent.x).toBe(500)
    expect(result.firstEvent.y).toBe(280)
  })

  test("should handle keyboard down events", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      const events = []
      input.onKeyDown((event) => {
        events.push({
          key: event.key,
          code: event.code,
        })
      })

      window.dispatchEvent(new KeyboardEvent("keydown", {
        key: "ArrowUp",
        code: "ArrowUp",
        bubbles: true,
      }))

      return {
        eventCount: events.length,
        firstEvent: events[0],
      }
    })()`,
    )

    expect(result.eventCount).toBe(1)
    expect(result.firstEvent.key).toBe("ArrowUp")
    expect(result.firstEvent.code).toBe("ArrowUp")
  })

  test("should handle keyboard up events", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      const events = []
      input.onKeyUp((event) => {
        events.push({
          key: event.key,
          code: event.code,
        })
      })

      window.dispatchEvent(new KeyboardEvent("keyup", {
        key: "Space",
        code: "Space",
        bubbles: true,
      }))

      return {
        eventCount: events.length,
        firstEvent: events[0],
      }
    })()`,
    )

    expect(result.eventCount).toBe(1)
    expect(result.firstEvent.key).toBe("Space")
    expect(result.firstEvent.code).toBe("Space")
  })

  test("should handle multiple event listeners", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      const clicks = []
      const pointerDowns = []
      const keyPresses = []

      input.onClick((e) => clicks.push(e))
      input.onPointerDown((e) => pointerDowns.push(e))
      input.onKeyDown((e) => keyPresses.push(e))

      testContainer.dispatchEvent(new MouseEvent("click", { clientX: 100, clientY: 100, bubbles: true, cancelable: true, composed: true }))
      testContainer.dispatchEvent(new PointerEvent("pointerdown", { clientX: 200, clientY: 200, bubbles: true, cancelable: true, composed: true }))
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }))

      return {
        clickCount: clicks.length,
        pointerDownCount: pointerDowns.length,
        keyPressCount: keyPresses.length,
      }
    })()`,
    )

    expect(result.clickCount).toBe(1)
    expect(result.pointerDownCount).toBe(1)
    expect(result.keyPressCount).toBe(1)
  })

  test("should normalize coordinates to container", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      const rect = testContainer.getBoundingClientRect()

      const events = []
      input.onPointerDown((event) => {
        events.push({
          x: event.x,
          y: event.y,
        })
      })

      testContainer.dispatchEvent(new PointerEvent("pointerdown", {
        clientX: rect.left + 50,
        clientY: rect.top + 75,
        bubbles: true,
        cancelable: true,
        composed: true,
      }))

      return {
        eventCount: events.length,
        event: events[0],
        containerRect: {
          left: rect.left,
          top: rect.top,
        },
      }
    })()`,
    )

    expect(result.eventCount).toBe(1)
    expect(result.event.x).toBeCloseTo(50, 0)
    expect(result.event.y).toBeCloseTo(75, 0)
  })

  test("should remove all listeners", async ({ page }) => {
    const result = await page.evaluate(
      `(async () => {
      ${getInputSetup()}

      const events = []
      input.onClick((e) => events.push("click"))
      input.onPointerDown((e) => events.push("down"))
      input.onKeyDown((e) => events.push("key"))

      testContainer.dispatchEvent(new MouseEvent("click", { clientX: 100, clientY: 100, bubbles: true, cancelable: true, composed: true }))

      const beforeRemoveCount = events.length

      input.removeAllListeners()

      testContainer.dispatchEvent(new MouseEvent("click", { clientX: 100, clientY: 100, bubbles: true, cancelable: true, composed: true }))
      testContainer.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, clientY: 100, bubbles: true, cancelable: true, composed: true }))

      const afterRemoveCount = events.length

      return {
        beforeRemoveCount,
        afterRemoveCount,
        shouldBeEqual: beforeRemoveCount === afterRemoveCount,
      }
    })()`,
    )

    expect(result.beforeRemoveCount).toBe(1)
    expect(result.afterRemoveCount).toBe(1)
    expect(result.shouldBeEqual).toBe(true)
  })
})
