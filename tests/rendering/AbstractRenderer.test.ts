import { beforeEach, describe, expect, it } from "bun:test"
import { AbstractRenderer, PIXI } from "../../src"

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
})
