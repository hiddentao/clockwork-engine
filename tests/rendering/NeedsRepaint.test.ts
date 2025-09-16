import { beforeEach, describe, expect, it, mock } from "bun:test"
import { GameObject } from "../../src/GameObject"
import { Vector2D } from "../../src/geometry/Vector2D"
import { AbstractRenderer } from "../../src/rendering/AbstractRenderer"

// Mock PIXI for testing
class MockContainer {
  public children: MockContainer[] = []
  public position = {
    x: 0,
    y: 0,
    set: (x: number, y: number) => {
      this.position.x = x
      this.position.y = y
    },
  }
  public destroyed = false
  public label?: string

  addChild(child: MockContainer): MockContainer {
    this.children.push(child)
    return child
  }

  removeChild(child: MockContainer): MockContainer {
    const index = this.children.indexOf(child)
    if (index > -1) {
      this.children.splice(index, 1)
    }
    return child
  }

  getChildByLabel(label: string): MockContainer | null {
    return this.children.find((child) => child.label === label) || null
  }

  destroy(): void {
    this.destroyed = true
    this.children.forEach((child) => child.destroy())
    this.children = []
  }
}

class MockGraphics extends MockContainer {
  rect(): this {
    return this
  }
  circle(): this {
    return this
  }
  fill(): this {
    return this
  }
}

const PIXI = {
  Container: MockContainer as any,
  Graphics: MockGraphics as any,
}

// Mock the PIXI module
mock.module("../../src/lib/pixi", () => ({
  PIXI: PIXI,
}))

// Test GameObject implementation
class TestGameObject extends GameObject {
  constructor(id: string, x: number, y: number) {
    super(id, new Vector2D(x, y), new Vector2D(1, 1), 100)
  }

  getType(): string {
    return "TestGameObject"
  }
}

// Test renderer implementation
class TestRenderer extends AbstractRenderer<TestGameObject> {
  public repaintCallCount = 0
  public lastRepaintedItem: TestGameObject | null = null

  protected create(item: TestGameObject): any {
    const container = new PIXI.Container()
    container.position.set(item.getPosition().x, item.getPosition().y)
    return container
  }

  protected repaintContainer(container: any, item: TestGameObject): void {
    this.repaintCallCount++
    this.lastRepaintedItem = item
    container.position.set(item.getPosition().x, item.getPosition().y)
  }

  public getId(item: TestGameObject): string {
    return item.getId()
  }

  // Expose protected methods for testing
  public testUpdateContainer(container: any, item: TestGameObject): void {
    this.updateContainer(container, item)
  }
}

describe("NeedsRepaint Functionality", () => {
  let renderer: TestRenderer
  let gameContainer: any
  let testObject: TestGameObject

  beforeEach(() => {
    gameContainer = new PIXI.Container()
    renderer = new TestRenderer(gameContainer)
    testObject = new TestGameObject("test-1", 10, 20)
  })

  describe("GameObject needsRepaint flag", () => {
    it("should start with needsRepaint = true", () => {
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should allow setting needsRepaint flag", () => {
      testObject.needsRepaint = false
      expect(testObject.needsRepaint).toBe(false)

      testObject.needsRepaint = true
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should set needsRepaint to true when position changes", () => {
      testObject.needsRepaint = false
      testObject.setPosition(new Vector2D(30, 40))
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when position doesn't change", () => {
      const currentPos = testObject.getPosition()
      testObject.needsRepaint = false
      testObject.setPosition(new Vector2D(currentPos.x, currentPos.y))
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint to true when size changes", () => {
      testObject.needsRepaint = false
      testObject.setSize(new Vector2D(2, 2))
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when size doesn't change", () => {
      const currentSize = testObject.getSize()
      testObject.needsRepaint = false
      testObject.setSize(new Vector2D(currentSize.x, currentSize.y))
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint to true when rotation changes", () => {
      testObject.needsRepaint = false
      testObject.setRotation(1.5)
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when rotation doesn't change", () => {
      testObject.needsRepaint = false
      testObject.setRotation(0) // default rotation
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint to true when health changes", () => {
      testObject.needsRepaint = false
      testObject.setHealth(80)
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when health doesn't change", () => {
      testObject.needsRepaint = false
      testObject.setHealth(100) // current health
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint to true when maxHealth changes", () => {
      testObject.needsRepaint = false
      testObject.setMaxHealth(150)
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when maxHealth doesn't change", () => {
      testObject.needsRepaint = false
      testObject.setMaxHealth(100) // current maxHealth
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint to true when taking damage", () => {
      testObject.needsRepaint = false
      testObject.takeDamage(10)
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when taking zero damage", () => {
      testObject.needsRepaint = false
      testObject.takeDamage(0)
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint to true when healing", () => {
      testObject.setHealth(50)
      testObject.needsRepaint = false
      testObject.heal(10)
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when healing has no effect", () => {
      // Already at full health
      testObject.needsRepaint = false
      testObject.heal(10)
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint to true when destroyed", () => {
      testObject.needsRepaint = false
      testObject.destroy()
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should set needsRepaint when velocity changes", () => {
      testObject.needsRepaint = false
      testObject.setVelocity(new Vector2D(5, 10))
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when velocity doesn't change", () => {
      const currentVel = testObject.getVelocity()
      testObject.needsRepaint = false
      testObject.setVelocity(new Vector2D(currentVel.x, currentVel.y))
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint when position changes during update", () => {
      testObject.setVelocity(new Vector2D(1, 1))
      testObject.needsRepaint = false
      testObject.update(1, 1)
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when position doesn't change during update", () => {
      testObject.setVelocity(new Vector2D(0, 0))
      testObject.needsRepaint = false
      testObject.update(1, 1)
      expect(testObject.needsRepaint).toBe(false)
    })
  })

  describe("AbstractRenderer needsRepaint optimization", () => {
    it("should call repaintContainer when needsRepaint is true", () => {
      renderer.add(testObject)
      const container = gameContainer.children[0]

      // After add, the object should have been repainted and flag reset
      expect(testObject.needsRepaint).toBe(false)
      expect(renderer.repaintCallCount).toBe(1)

      // Set flag to true and test again
      testObject.needsRepaint = true
      renderer.testUpdateContainer(container, testObject)

      expect(renderer.repaintCallCount).toBe(2)
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should not call repaintContainer when needsRepaint is false", () => {
      renderer.add(testObject)
      const container = gameContainer.children[0]

      // Set needsRepaint to false
      testObject.needsRepaint = false
      renderer.repaintCallCount = 0

      renderer.testUpdateContainer(container, testObject)

      expect(renderer.repaintCallCount).toBe(0)
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should reset needsRepaint to false after repainting", () => {
      renderer.add(testObject)
      const container = gameContainer.children[0]

      testObject.needsRepaint = true
      renderer.testUpdateContainer(container, testObject)

      expect(testObject.needsRepaint).toBe(false)
    })

    it("should handle multiple update calls efficiently", () => {
      renderer.add(testObject)
      const container = gameContainer.children[0]

      // First update should call repaint
      renderer.testUpdateContainer(container, testObject)
      expect(renderer.repaintCallCount).toBe(1)

      // Subsequent updates without changes should not call repaint
      renderer.testUpdateContainer(container, testObject)
      renderer.testUpdateContainer(container, testObject)
      expect(renderer.repaintCallCount).toBe(1)

      // Making a change should trigger repaint again
      testObject.setPosition(new Vector2D(50, 60))
      renderer.testUpdateContainer(container, testObject)
      expect(renderer.repaintCallCount).toBe(2)
    })

    it("should work correctly with renderer update method", () => {
      renderer.add(testObject)

      // Initial add should trigger create and update
      expect(renderer.repaintCallCount).toBe(1)

      // Update without changes should not trigger repaint
      renderer.repaintCallCount = 0
      testObject.needsRepaint = false
      renderer.update(testObject)
      expect(renderer.repaintCallCount).toBe(0)

      // Update with changes should trigger repaint
      testObject.setPosition(new Vector2D(70, 80))
      renderer.update(testObject)
      expect(renderer.repaintCallCount).toBe(1)
      expect(testObject.needsRepaint).toBe(false)
    })
  })
})
