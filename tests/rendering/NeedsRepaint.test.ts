import { beforeEach, describe, expect, it } from "bun:test"
import { GameObject } from "../../src/GameObject"
import { Vector2D } from "../../src/geometry/Vector2D"
import { DisplayNode } from "../../src/platform/DisplayNode"
import { AbstractRenderer } from "../../src/rendering/AbstractRenderer"
import { MockPlatformLayer } from "../helpers/PlatformMocks"

class TestGameObject extends GameObject {
  constructor(id: string, x: number, y: number) {
    super(id, new Vector2D(x, y), new Vector2D(1, 1), 100)
  }

  getType(): string {
    return "TestGameObject"
  }
}

class TestRenderer extends AbstractRenderer<TestGameObject> {
  public repaintCallCount = 0
  public lastRepaintedItem: TestGameObject | null = null

  protected create(item: TestGameObject): DisplayNode {
    const node = this.createRectangle(10, 10, 0xff0000)
    node.setPosition(item.getPosition().x, item.getPosition().y)
    return node
  }

  protected repaintNode(node: DisplayNode, item: TestGameObject): void {
    this.repaintCallCount++
    this.lastRepaintedItem = item
    node.setPosition(item.getPosition().x, item.getPosition().y)
  }

  public getId(item: TestGameObject): string {
    return item.getId()
  }

  public testUpdateNode(node: DisplayNode, item: TestGameObject): void {
    this.updateNode(node, item)
  }
}

describe("NeedsRepaint Functionality", () => {
  let renderer: TestRenderer
  let gameNode: DisplayNode
  let platform: MockPlatformLayer
  let testObject: TestGameObject

  beforeEach(() => {
    platform = new MockPlatformLayer()
    const nodeId = platform.rendering.createNode()
    gameNode = new DisplayNode(nodeId, platform.rendering)
    renderer = new TestRenderer(gameNode)
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
      testObject.setRotation(0)
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint to true when health changes", () => {
      testObject.needsRepaint = false
      testObject.setHealth(80)
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when health doesn't change", () => {
      testObject.needsRepaint = false
      testObject.setHealth(100)
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should set needsRepaint to true when maxHealth changes", () => {
      testObject.needsRepaint = false
      testObject.setMaxHealth(150)
      expect(testObject.needsRepaint).toBe(true)
    })

    it("should not set needsRepaint when maxHealth doesn't change", () => {
      testObject.needsRepaint = false
      testObject.setMaxHealth(100)
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
    it("should call repaintNode when needsRepaint is true", () => {
      renderer.add(testObject)
      const node = renderer.getNode(testObject.getId())!

      expect(testObject.needsRepaint).toBe(false)
      expect(renderer.repaintCallCount).toBe(1)

      testObject.needsRepaint = true
      renderer.testUpdateNode(node, testObject)

      expect(renderer.repaintCallCount).toBe(2)
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should not call repaintNode when needsRepaint is false", () => {
      renderer.add(testObject)
      const node = renderer.getNode(testObject.getId())!

      testObject.needsRepaint = false
      renderer.repaintCallCount = 0

      renderer.testUpdateNode(node, testObject)

      expect(renderer.repaintCallCount).toBe(0)
      expect(testObject.needsRepaint).toBe(false)
    })

    it("should reset needsRepaint to false after repainting", () => {
      renderer.add(testObject)
      const node = renderer.getNode(testObject.getId())!

      testObject.needsRepaint = true
      renderer.testUpdateNode(node, testObject)

      expect(testObject.needsRepaint).toBe(false)
    })

    it("should handle multiple update calls efficiently", () => {
      renderer.add(testObject)
      const node = renderer.getNode(testObject.getId())!

      renderer.testUpdateNode(node, testObject)
      expect(renderer.repaintCallCount).toBe(1)

      renderer.testUpdateNode(node, testObject)
      renderer.testUpdateNode(node, testObject)
      expect(renderer.repaintCallCount).toBe(1)

      testObject.setPosition(new Vector2D(50, 60))
      renderer.testUpdateNode(node, testObject)
      expect(renderer.repaintCallCount).toBe(2)
    })

    it("should work correctly with renderer update method", () => {
      renderer.add(testObject)

      expect(renderer.repaintCallCount).toBe(1)

      renderer.repaintCallCount = 0
      testObject.needsRepaint = false
      renderer.update(testObject)
      expect(renderer.repaintCallCount).toBe(0)

      testObject.setPosition(new Vector2D(70, 80))
      renderer.update(testObject)
      expect(renderer.repaintCallCount).toBe(1)
      expect(testObject.needsRepaint).toBe(false)
    })
  })
})
