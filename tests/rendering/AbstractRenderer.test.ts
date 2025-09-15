// @ts-nocheck
import { beforeEach, describe, expect, it, mock } from "bun:test"

// EventEmitter-like functionality for PIXI mock objects
class EventEmitter {
  private _events: Map<string, ((...args: any[]) => void)[]> = new Map()

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this._events.has(event)) {
      this._events.set(event, [])
    }
    this._events.get(event)!.push(listener)
    return this
  }

  off(event: string, listener: (...args: any[]) => void): this {
    const listeners = this._events.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
    return this
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this._events.get(event)
    if (listeners) {
      listeners.forEach((listener) => listener(...args))
      return true
    }
    return false
  }
}

// Mock PIXI.Container with event system
class MockContainer extends EventEmitter {
  public children: MockContainer[] = []
  public eventMode = "auto"
  public label?: string
  public position = {
    set: (x: number, y: number) => {
      this.position.x = x
      this.position.y = y
    },
    x: 0,
    y: 0,
  }
  public rotation = 0
  public visible = true
  public parent: MockContainer | null = null
  public destroyed = false

  addChild(child: MockContainer): MockContainer {
    this.children.push(child)
    child.parent = this
    child.emit("added", this)
    return child
  }

  addChildAt(child: MockContainer, index: number): MockContainer {
    this.children.splice(index, 0, child)
    child.parent = this
    child.emit("added", this)
    return child
  }

  removeChild(child: MockContainer): MockContainer {
    const index = this.children.indexOf(child)
    if (index > -1) {
      this.children.splice(index, 1)
      child.parent = null
      child.emit("removed", this)
    }
    return child
  }

  getChildByLabel(label: string): MockContainer | null {
    return this.children.find((child) => child.label === label) || null
  }

  destroy(options?: any): void {
    this.destroyed = true
    this.emit("destroyed")

    // Remove from parent
    if (this.parent) {
      this.parent.removeChild(this)
    }

    // Destroy children if requested
    if (options?.children) {
      this.children.forEach((child) => child.destroy(options))
    } else {
      // Just clear parent references
      this.children.forEach((child) => {
        child.parent = null
      })
    }

    this.children = []
    this.parent = null
  }
}

// Mock PIXI.Graphics with drawing methods and event system
class MockGraphics extends MockContainer {
  public geometry: any = {}
  public shader: any = {}
  public state: any = {}
  public tint = 0xffffff
  public blendMode = 0
  public width = 100 // Mock width for testing
  public height = 50 // Mock height for testing

  rect(_x: number, _y: number, _width: number, _height: number): this {
    this.width = _width
    this.height = _height
    return this
  }

  circle(_x: number, _y: number, _radius: number): this {
    this.width = _radius * 2
    this.height = _radius * 2
    return this
  }

  poly(_points: number[]): this {
    return this
  }

  fill(_color: number | string): this {
    return this
  }

  stroke(_options: any): this {
    return this
  }

  clear(): this {
    return this
  }

  setStrokeStyle(_options: any): this {
    return this
  }

  moveTo(_x: number, _y: number): this {
    return this
  }

  lineTo(_x: number, _y: number): this {
    return this
  }
}

// Mock PIXI object
const PIXI = {
  Container: MockContainer as any,
  Graphics: MockGraphics as any,
}

// Mock the PIXI module to use our mock classes
mock.module("../../src/lib/pixi", () => ({
  PIXI: PIXI,
  // Mock other exports that might be needed
  Viewport: class MockViewport {} as any,
  // Mock TypeScript type exports (these won't affect runtime)
  Application: MockContainer as any,
  Container: MockContainer as any,
  Graphics: MockGraphics as any,
  Sprite: MockContainer as any,
  Texture: {} as any,
  ColorSource: {} as any,
  IViewportOptions: {} as any,
}))

// Types handled by @ts-nocheck directive above

// Import AbstractRenderer after mocking
const { AbstractRenderer } = await import("../../src")

// Mock game object for testing
interface TestGameObject {
  id: string
  x: number
  y: number
  type: string
  visible?: boolean
}

// Test implementation of AbstractRenderer
class TestRenderer extends AbstractRenderer<TestGameObject> {
  public createCallCount = 0
  public updateContainerCallCount = 0
  public lastCreatedItem: TestGameObject | null = null

  protected create(item: TestGameObject): PIXI.Container {
    this.createCallCount++
    this.lastCreatedItem = item

    const container = new PIXI.Container()
    container.label = `container-${item.id}`

    // Create visual representation based on item properties
    const graphics = new PIXI.Graphics()
    graphics.rect(0, 0, 32, 32)
    graphics.fill(0xff0000)

    container.addChild(graphics)
    container.position.set(item.x, item.y)

    return container
  }

  protected updateContainer(
    container: PIXI.Container,
    item: TestGameObject,
  ): void {
    this.updateContainerCallCount++

    // Update position based on item changes
    container.position.set(item.x, item.y)
    container.visible = item.visible !== false
  }

  public getId(item: TestGameObject): string {
    return item.id
  }

  // Expose protected methods for testing
  public testGetNamedChild(container: PIXI.Container, name: string) {
    return this.getNamedChild(container, name)
  }

  public testAddNamedChild(
    container: PIXI.Container,
    child: PIXI.Container,
    name: string,
  ) {
    return this.addNamedChild(container, child, name)
  }

  public testCreateRectangle(width: number, height: number, color: number) {
    return this.createRectangle(width, height, color)
  }

  public testCreateCircle(radius: number, color: number) {
    return this.createCircle(radius, color)
  }

  public testCreatePolygon(points: number[], color: number) {
    return this.createPolygon(points, color)
  }

  public testCreateBorderRectangle(
    width: number,
    height: number,
    strokeWidth: number,
    color: number,
    alpha?: number,
  ) {
    return this.createBorderRectangle(width, height, strokeWidth, color, alpha)
  }

  public testCreateStandardContainer(
    x: number,
    y: number,
    rotation: number | undefined,
    bodyGraphic: PIXI.Graphics,
  ) {
    return this.createStandardContainer(x, y, rotation, bodyGraphic)
  }

  public testCalculateHealthBasedAlpha(
    currentHealth: number,
    maxHealth: number,
    threshold?: number,
  ) {
    return this.calculateHealthBasedAlpha(currentHealth, maxHealth, threshold)
  }

  public testCreateGraphics() {
    return this.createGraphics()
  }
}

describe("AbstractRenderer", () => {
  let gameContainer: PIXI.Container
  let renderer: TestRenderer
  let testItems: TestGameObject[]

  beforeEach(() => {
    gameContainer = new PIXI.Container()
    renderer = new TestRenderer(gameContainer)

    testItems = [
      { id: "item1", x: 10, y: 20, type: "test" },
      { id: "item2", x: 30, y: 40, type: "test", visible: true },
      { id: "item3", x: 50, y: 60, type: "test", visible: false },
    ]
  })

  describe("Initialization", () => {
    it("should initialize with empty collections", () => {
      expect(renderer.createCallCount).toBe(0)
      expect(renderer.updateContainerCallCount).toBe(0)
      expect(gameContainer.children.length).toBe(0)
    })

    it("should store reference to game container", () => {
      const newContainer = new PIXI.Container()
      const newRenderer = new TestRenderer(newContainer)

      // The game container reference is protected, but we can test its usage
      newRenderer.add(testItems[0])
      expect(newContainer.children.length).toBe(1)
    })
  })

  describe("Adding Items", () => {
    it("should add new items correctly", () => {
      renderer.add(testItems[0])

      expect(renderer.createCallCount).toBe(1)
      expect(renderer.lastCreatedItem).toBe(testItems[0])
      expect(gameContainer.children.length).toBe(1)

      const container = gameContainer.children[0] as PIXI.Container
      expect(container.label).toBe("container-item1")
      expect(container.position.x).toBe(10)
      expect(container.position.y).toBe(20)
    })

    it("should not duplicate items with same ID", () => {
      renderer.add(testItems[0])
      renderer.add(testItems[0]) // Same item again

      expect(renderer.createCallCount).toBe(1)
      expect(gameContainer.children.length).toBe(1)
    })

    it("should delegate to update for existing items", () => {
      renderer.add(testItems[0])

      // Modify the item and add again
      testItems[0].x = 100
      renderer.add(testItems[0])

      expect(renderer.createCallCount).toBe(1)
      expect(renderer.updateContainerCallCount).toBe(1)

      const container = gameContainer.children[0] as PIXI.Container
      expect(container.position.x).toBe(100)
    })

    it("should handle add errors gracefully", () => {
      const invalidItem = { id: "", x: 0, y: 0, type: "test" }

      expect(() => renderer.add(invalidItem)).not.toThrow()
    })
  })

  describe("Updating Items", () => {
    it("should update existing items", () => {
      renderer.add(testItems[0])

      testItems[0].x = 200
      testItems[0].y = 300
      renderer.update(testItems[0])

      expect(renderer.updateContainerCallCount).toBe(1)

      const container = gameContainer.children[0] as PIXI.Container
      expect(container.position.x).toBe(200)
      expect(container.position.y).toBe(300)
    })

    it("should create items that don't exist when updating", () => {
      renderer.update(testItems[0])

      expect(renderer.createCallCount).toBe(1)
      expect(gameContainer.children.length).toBe(1)
    })

    it("should handle visibility updates", () => {
      renderer.add(testItems[1]) // visible: true

      testItems[1].visible = false
      renderer.update(testItems[1])

      const container = gameContainer.children[0] as PIXI.Container
      expect(container.visible).toBe(false)
    })

    it("should handle update errors gracefully", () => {
      const invalidItem = { id: "valid", x: NaN, y: NaN, type: "test" }

      expect(() => renderer.update(invalidItem)).not.toThrow()
    })
  })

  describe("Removing Items", () => {
    it("should remove items by ID", () => {
      renderer.add(testItems[0])
      expect(gameContainer.children.length).toBe(1)

      renderer.remove("item1")
      expect(gameContainer.children.length).toBe(0)
    })

    it("should handle removal of non-existent items", () => {
      expect(() => renderer.remove("nonexistent")).not.toThrow()
      expect(gameContainer.children.length).toBe(0)
    })

    it("should clean up internal tracking when removing", () => {
      renderer.add(testItems[0])
      renderer.add(testItems[1])

      renderer.remove("item1")

      // Add item1 again - should trigger create, not update
      renderer.add(testItems[0])
      expect(renderer.createCallCount).toBe(3) // 2 initial + 1 re-add
    })
  })

  describe("Setting Items in Bulk", () => {
    it("should set multiple items at once", () => {
      renderer.setItems(testItems)

      expect(renderer.createCallCount).toBe(3)
      expect(gameContainer.children.length).toBe(3)

      // Check all items are positioned correctly
      const containers = gameContainer.children as PIXI.Container[]
      expect(
        containers.find((c) => c.label === "container-item1"),
      ).toBeDefined()
      expect(
        containers.find((c) => c.label === "container-item2"),
      ).toBeDefined()
      expect(
        containers.find((c) => c.label === "container-item3"),
      ).toBeDefined()
    })

    it("should replace existing items when setting new ones", () => {
      renderer.add(testItems[0])

      const newItems = [
        { id: "item2", x: 100, y: 200, type: "test" },
        { id: "item3", x: 300, y: 400, type: "test" },
      ]

      renderer.setItems(newItems)

      expect(gameContainer.children.length).toBe(2)

      // item1 should be removed, item2 and item3 should be present
      const containers = gameContainer.children as PIXI.Container[]
      expect(
        containers.find((c) => c.label === "container-item1"),
      ).toBeUndefined()
      expect(
        containers.find((c) => c.label === "container-item2"),
      ).toBeDefined()
      expect(
        containers.find((c) => c.label === "container-item3"),
      ).toBeDefined()
    })

    it("should handle empty arrays", () => {
      renderer.setItems(testItems)
      expect(gameContainer.children.length).toBe(3)

      renderer.setItems([])
      expect(gameContainer.children.length).toBe(0)
    })

    it("should update existing items instead of recreating", () => {
      renderer.add(testItems[0])

      // Modify item and set with same ID
      testItems[0].x = 500
      renderer.setItems([testItems[0]])

      expect(renderer.createCallCount).toBe(1) // Should not create again
      expect(renderer.updateContainerCallCount).toBe(1) // Should update

      const container = gameContainer.children[0] as PIXI.Container
      expect(container.position.x).toBe(500)
    })
  })

  describe("Helper Methods", () => {
    it("should create rectangles correctly", () => {
      const rect = renderer.testCreateRectangle(100, 50, 0x00ff00)

      expect(rect).toBeInstanceOf(PIXI.Graphics)
      // Graphics properties are harder to test directly, but we can verify it was created
      expect(rect.width).toBeGreaterThan(0)
      expect(rect.height).toBeGreaterThan(0)
    })

    it("should create circles correctly", () => {
      const circle = renderer.testCreateCircle(25, 0x0000ff)

      expect(circle).toBeInstanceOf(PIXI.Graphics)
      expect(circle.width).toBeGreaterThan(0)
      expect(circle.height).toBeGreaterThan(0)
    })

    it("should add named children correctly", () => {
      const container = new PIXI.Container()
      const child = new PIXI.Graphics()

      renderer.testAddNamedChild(container, child, "test-child")

      expect(container.children.length).toBe(1)
      expect(child.label).toBe("test-child")
    })

    it("should retrieve named children correctly", () => {
      const container = new PIXI.Container()
      const child = new PIXI.Graphics()
      child.label = "test-child"
      container.addChild(child)

      const retrieved = renderer.testGetNamedChild(container, "test-child")
      expect(retrieved).toBe(child)
    })

    it("should return null for non-existent named children", () => {
      const container = new PIXI.Container()

      const retrieved = renderer.testGetNamedChild(container, "nonexistent")
      expect(retrieved).toBeNull()
    })
  })

  describe("Error Handling and Edge Cases", () => {
    it("should handle null or undefined items gracefully", () => {
      expect(() => renderer.add(null as any)).not.toThrow()
      expect(() => renderer.add(undefined as any)).not.toThrow()
      expect(() => renderer.update(null as any)).not.toThrow()
    })

    it("should handle items with missing properties", () => {
      const incompleteItem = { id: "incomplete" } as any

      expect(() => renderer.add(incompleteItem)).not.toThrow()
    })

    it("should handle create method exceptions", () => {
      // Create a renderer that throws in create method
      class FailingRenderer extends AbstractRenderer<TestGameObject> {
        protected create(): PIXI.Container {
          throw new Error("Create failed")
        }

        public getId(item: TestGameObject): string {
          return item.id
        }
      }

      const failingRenderer = new FailingRenderer(gameContainer)

      expect(() => failingRenderer.add(testItems[0])).not.toThrow()
      expect(gameContainer.children.length).toBe(0) // Should not add if create fails
    })

    it("should handle getId method exceptions", () => {
      class FailingIdRenderer extends AbstractRenderer<TestGameObject> {
        protected create(_item: TestGameObject): PIXI.Container {
          return new PIXI.Container()
        }

        public getId(): string {
          throw new Error("getId failed")
        }
      }

      const failingRenderer = new FailingIdRenderer(gameContainer)

      expect(() => failingRenderer.add(testItems[0])).not.toThrow()
      expect(gameContainer.children.length).toBe(0)
    })

    it("should handle updateContainer method exceptions", () => {
      class FailingUpdateRenderer extends AbstractRenderer<TestGameObject> {
        protected create(item: TestGameObject): PIXI.Container {
          const container = new PIXI.Container()
          container.label = `container-${item.id}`
          return container
        }

        protected updateContainer(): void {
          throw new Error("Update failed")
        }

        public getId(item: TestGameObject): string {
          return item.id
        }
      }

      const failingRenderer = new FailingUpdateRenderer(gameContainer)
      failingRenderer.add(testItems[0])

      expect(() => failingRenderer.update(testItems[0])).not.toThrow()
    })

    it("should handle very large item sets", () => {
      const largeItemSet: TestGameObject[] = []
      for (let i = 0; i < 5000; i++) {
        largeItemSet.push({
          id: `large-item-${i}`,
          x: i % 100,
          y: Math.floor(i / 100),
          type: "large-test",
        })
      }

      const start = Date.now()
      renderer.setItems(largeItemSet)
      const duration = Date.now() - start

      expect(gameContainer.children.length).toBe(5000)
      expect(duration).toBeLessThan(5000) // Should complete in reasonable time
      expect(renderer.getAllItems().size).toBe(5000)
    })

    it("should handle rapid add/remove cycles", () => {
      for (let i = 0; i < 100; i++) {
        const item = { id: `cycle-${i}`, x: i, y: i, type: "cycle-test" }
        renderer.add(item)
        expect(gameContainer.children.length).toBe(1)
        renderer.remove(`cycle-${i}`)
        expect(gameContainer.children.length).toBe(0)
      }
    })

    it("should handle concurrent operations", () => {
      // Add multiple items
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: `concurrent-${i}`,
        x: i,
        y: i,
        type: "concurrent-test",
      }))

      items.forEach((item) => renderer.add(item))
      expect(gameContainer.children.length).toBe(50)

      // Update all items
      items.forEach((item) => {
        item.x += 100
        renderer.update(item)
      })

      // Remove half the items
      for (let i = 0; i < 25; i++) {
        renderer.remove(`concurrent-${i}`)
      }
      expect(gameContainer.children.length).toBe(25)

      // Clear remaining with setItems
      renderer.setItems([])
      expect(gameContainer.children.length).toBe(0)
    })
  })

  describe("Performance Considerations", () => {
    it("should efficiently handle large numbers of items", () => {
      const manyItems: TestGameObject[] = []
      for (let i = 0; i < 1000; i++) {
        manyItems.push({
          id: `item${i}`,
          x: i % 100,
          y: Math.floor(i / 100),
          type: "test",
        })
      }

      const start = Date.now()
      renderer.setItems(manyItems)
      const duration = Date.now() - start

      expect(gameContainer.children.length).toBe(1000)
      expect(duration).toBeLessThan(1000) // Should complete in reasonable time
    })

    it("should reuse containers efficiently", () => {
      renderer.add(testItems[0])
      const originalCreateCount = renderer.createCallCount

      // Update same item multiple times
      for (let i = 0; i < 10; i++) {
        testItems[0].x = i * 10
        renderer.update(testItems[0])
      }

      expect(renderer.createCallCount).toBe(originalCreateCount) // No new containers created
      expect(renderer.updateContainerCallCount).toBe(10) // All updates called
    })
  })

  describe("Container Hierarchy", () => {
    it("should maintain proper parent-child relationships", () => {
      renderer.add(testItems[0])

      const container = gameContainer.children[0] as PIXI.Container
      expect(container.parent).toBe(gameContainer)

      // Check that graphics is child of container
      expect(container.children.length).toBeGreaterThan(0)
    })

    it("should clean up parent relationships on removal", () => {
      renderer.add(testItems[0])
      const container = gameContainer.children[0] as PIXI.Container

      renderer.remove("item1")

      expect(container.parent).toBeNull()
    })
  })

  describe("Graphics Creation Methods", () => {
    describe("createGraphics", () => {
      it("should create a PIXI Graphics object", () => {
        const graphics = renderer.testCreateGraphics()
        expect(graphics).toBeInstanceOf(PIXI.Graphics)
      })

      it("should attach 'removed' event listener for automatic cleanup", () => {
        const graphics = renderer.testCreateGraphics()
        const container = new PIXI.Container()

        container.addChild(graphics)
        expect(container.children.length).toBe(1)
        expect(graphics.destroyed).toBe(false)

        // Remove should trigger destroy via the event handler
        container.removeChild(graphics)
        expect(graphics.destroyed).toBe(true)
      })

      it("should handle multiple graphics objects independently", () => {
        const graphics1 = renderer.testCreateGraphics()
        const graphics2 = renderer.testCreateGraphics()
        const container = new PIXI.Container()

        container.addChild(graphics1)
        container.addChild(graphics2)
        expect(container.children.length).toBe(2)

        // Remove only first graphics
        container.removeChild(graphics1)
        expect(graphics1.destroyed).toBe(true)
        expect(graphics2.destroyed).toBe(false)
        expect(container.children.length).toBe(1)

        // Remove second graphics
        container.removeChild(graphics2)
        expect(graphics2.destroyed).toBe(true)
        expect(container.children.length).toBe(0)
      })

      it("should not interfere with manual destroy calls", () => {
        const graphics = renderer.testCreateGraphics()
        const container = new PIXI.Container()

        container.addChild(graphics)

        // Manually destroy should work fine
        graphics.destroy()
        expect(graphics.destroyed).toBe(true)

        // Remove from container shouldn't cause issues
        expect(() => container.removeChild(graphics)).not.toThrow()
      })
    })

    describe("createPolygon", () => {
      it("should create polygon graphics correctly", () => {
        const points = [0, 0, 100, 0, 50, 100] // Triangle
        const polygon = renderer.testCreatePolygon(points, 0x00ff00)

        expect(polygon).toBeInstanceOf(PIXI.Graphics)
        expect(polygon.width).toBeGreaterThan(0)
        expect(polygon.height).toBeGreaterThan(0)
      })

      it("should handle complex polygons", () => {
        const points = [0, 0, 50, 0, 50, 50, 0, 50] // Square
        const polygon = renderer.testCreatePolygon(points, 0xff0000)

        expect(polygon).toBeInstanceOf(PIXI.Graphics)
      })
    })

    describe("createBorderRectangle", () => {
      it("should create border rectangles correctly", () => {
        const border = renderer.testCreateBorderRectangle(100, 50, 2, 0x0000ff)

        expect(border).toBeInstanceOf(PIXI.Graphics)
        expect(border.width).toBeGreaterThan(0)
        expect(border.height).toBeGreaterThan(0)
      })

      it("should handle alpha transparency", () => {
        const border = renderer.testCreateBorderRectangle(
          100,
          50,
          2,
          0x0000ff,
          0.5,
        )

        expect(border).toBeInstanceOf(PIXI.Graphics)
      })

      it("should use default alpha when not specified", () => {
        const border = renderer.testCreateBorderRectangle(100, 50, 2, 0x0000ff)

        expect(border).toBeInstanceOf(PIXI.Graphics)
      })
    })

    describe("createStandardContainer", () => {
      it("should create positioned containers with body graphics", () => {
        const bodyGraphic = renderer.testCreateRectangle(50, 50, 0xff0000)
        const container = renderer.testCreateStandardContainer(
          100,
          200,
          undefined,
          bodyGraphic,
        )

        expect(container).toBeInstanceOf(PIXI.Container)
        expect(container.position.x).toBe(100)
        expect(container.position.y).toBe(200)
        expect(container.children.length).toBe(1)
        expect(container.children[0]).toBe(bodyGraphic)
        expect(bodyGraphic.label).toBe("body")
      })

      it("should apply rotation when specified", () => {
        const bodyGraphic = renderer.testCreateRectangle(50, 50, 0xff0000)
        const rotation = Math.PI / 4 // 45 degrees
        const container = renderer.testCreateStandardContainer(
          0,
          0,
          rotation,
          bodyGraphic,
        )

        expect(container.rotation).toBe(rotation)
      })

      it("should not apply rotation when undefined", () => {
        const bodyGraphic = renderer.testCreateRectangle(50, 50, 0xff0000)
        const container = renderer.testCreateStandardContainer(
          0,
          0,
          undefined,
          bodyGraphic,
        )

        expect(container.rotation).toBe(0)
      })
    })
  })

  describe("Health-Based Alpha Calculation", () => {
    describe("calculateHealthBasedAlpha", () => {
      it("should return minimum alpha for zero health", () => {
        const alpha = renderer.testCalculateHealthBasedAlpha(0, 100)
        expect(alpha).toBe(0.3)
      })

      it("should return full alpha for full health", () => {
        const alpha = renderer.testCalculateHealthBasedAlpha(100, 100)
        expect(alpha).toBe(1.0)
      })

      it("should return full alpha for health at or above threshold", () => {
        const alpha = renderer.testCalculateHealthBasedAlpha(75, 100, 50)
        expect(alpha).toBe(1.0)
      })

      it("should return interpolated alpha for health below threshold", () => {
        const alpha = renderer.testCalculateHealthBasedAlpha(25, 100, 50)
        expect(alpha).toBeGreaterThan(0.3)
        expect(alpha).toBeLessThan(1.0)
        expect(alpha).toBeCloseTo(0.65, 2) // 0.3 + 0.7 * (25/50)
      })

      it("should use default threshold of half max health", () => {
        const alphaAbove = renderer.testCalculateHealthBasedAlpha(60, 100) // Above 50
        const alphaBelow = renderer.testCalculateHealthBasedAlpha(40, 100) // Below 50

        expect(alphaAbove).toBe(1.0)
        expect(alphaBelow).toBeGreaterThan(0.3)
        expect(alphaBelow).toBeLessThan(1.0)
      })

      it("should handle edge cases", () => {
        expect(renderer.testCalculateHealthBasedAlpha(-10, 100)).toBe(0.3)
        expect(renderer.testCalculateHealthBasedAlpha(150, 100)).toBe(1.0)
      })
    })
  })

  describe("Container and Item Retrieval", () => {
    describe("getContainer", () => {
      it("should retrieve containers by ID", () => {
        renderer.add(testItems[0])
        const container = renderer.getContainer("item1")

        expect(container).toBeInstanceOf(PIXI.Container)
        expect(container?.label).toBe("container-item1")
      })

      it("should return undefined for non-existent IDs", () => {
        const container = renderer.getContainer("nonexistent")
        expect(container).toBeUndefined()
      })
    })

    describe("getItem", () => {
      it("should retrieve items by ID", () => {
        renderer.add(testItems[0])
        const item = renderer.getItem("item1")

        expect(item).toBe(testItems[0])
      })

      it("should return undefined for non-existent IDs", () => {
        const item = renderer.getItem("nonexistent")
        expect(item).toBeUndefined()
      })
    })

    describe("getAllItems", () => {
      it("should return all tracked items", () => {
        renderer.add(testItems[0])
        renderer.add(testItems[1])

        const allItems = renderer.getAllItems()
        expect(allItems.size).toBe(2)
        expect(allItems.get("item1")).toBe(testItems[0])
        expect(allItems.get("item2")).toBe(testItems[1])
      })

      it("should return empty map when no items", () => {
        const allItems = renderer.getAllItems()
        expect(allItems.size).toBe(0)
      })
    })
  })

  describe("Rerendering", () => {
    describe("rerender", () => {
      it("should call updateContainer for all tracked items", () => {
        renderer.add(testItems[0])
        renderer.add(testItems[1])

        const initialUpdateCount = renderer.updateContainerCallCount
        renderer.rerender()

        expect(renderer.updateContainerCallCount).toBe(initialUpdateCount + 2)
      })

      it("should handle empty renderer gracefully", () => {
        expect(() => renderer.rerender()).not.toThrow()
      })

      it("should handle missing containers gracefully", () => {
        renderer.add(testItems[0])
        // Manually corrupt state by removing container but keeping item
        const container = gameContainer.children[0] as PIXI.Container
        gameContainer.removeChild(container)

        expect(() => renderer.rerender()).not.toThrow()
      })
    })
  })

  describe("Destruction and Cleanup", () => {
    describe("destroy", () => {
      it("should remove all containers from game container", () => {
        renderer.add(testItems[0])
        renderer.add(testItems[1])
        expect(gameContainer.children.length).toBe(2)

        renderer.destroy()
        expect(gameContainer.children.length).toBe(0)
      })

      it("should clear all internal tracking", () => {
        renderer.add(testItems[0])
        renderer.add(testItems[1])

        renderer.destroy()

        expect(renderer.getAllItems().size).toBe(0)
        expect(renderer.getContainer("item1")).toBeUndefined()
        expect(renderer.getContainer("item2")).toBeUndefined()
      })

      it("should handle empty renderer gracefully", () => {
        expect(() => renderer.destroy()).not.toThrow()
      })

      it("should destroy PIXI containers with children", () => {
        renderer.add(testItems[0])
        const container = gameContainer.children[0] as PIXI.Container
        const originalDestroy = container.destroy
        let destroyCalled = false

        container.destroy = (options?: any) => {
          destroyCalled = true
          return originalDestroy.call(container, options)
        }

        renderer.destroy()
        expect(destroyCalled).toBe(true)
      })
    })
  })
})
