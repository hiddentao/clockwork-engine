import { beforeEach, describe, expect, it } from "bun:test"
import { DisplayNode } from "../../src/platform/DisplayNode"
import { AbstractRenderer } from "../../src/rendering/AbstractRenderer"
import { GameState } from "../../src/types"
import { MockPlatformLayer } from "../helpers/PlatformMocks"

interface TestGameObject {
  id: string
  x: number
  y: number
  type: string
  visible?: boolean
  needsRepaint?: boolean
}

class TestRenderer extends AbstractRenderer<TestGameObject> {
  public createCallCount = 0
  public updateNodeCallCount = 0
  public lastCreatedItem: TestGameObject | null = null

  protected create(item: TestGameObject): DisplayNode {
    this.createCallCount++
    this.lastCreatedItem = item

    const rectNode = this.createRectangle(32, 32, 0xff0000)
    const container = this.createStandardNode(
      item.x,
      item.y,
      undefined,
      rectNode,
    )

    return container
  }

  protected repaintNode(node: DisplayNode, item: TestGameObject): void {
    this.updateNodeCallCount++

    node.setPosition(item.x, item.y)
    node.setVisible(item.visible !== false)
  }

  public getId(item: TestGameObject): string {
    return item.id
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

  public testCreateStandardNode(
    x: number,
    y: number,
    rotation: number | undefined,
    bodyNode: DisplayNode,
  ) {
    return this.createStandardNode(x, y, rotation, bodyNode)
  }

  public testCalculateHealthBasedAlpha(
    currentHealth: number,
    maxHealth: number,
    threshold?: number,
  ) {
    return this.calculateHealthBasedAlpha(currentHealth, maxHealth, threshold)
  }

  public getGameState(): GameState {
    return this.gameState
  }
}

describe("AbstractRenderer Platform Integration", () => {
  let platform: MockPlatformLayer
  let gameNode: DisplayNode
  let renderer: TestRenderer
  let testItems: TestGameObject[]

  beforeEach(() => {
    platform = new MockPlatformLayer()
    const nodeId = platform.rendering.createNode()
    gameNode = new DisplayNode(nodeId, platform.rendering)
    renderer = new TestRenderer(gameNode)

    testItems = [
      { id: "item1", x: 10, y: 20, type: "test" },
      { id: "item2", x: 30, y: 40, type: "test", visible: true },
      { id: "item3", x: 50, y: 60, type: "test", visible: false },
    ]
  })

  describe("Initialization", () => {
    it("should initialize with empty collections", () => {
      expect(renderer.createCallCount).toBe(0)
      expect(renderer.updateNodeCallCount).toBe(0)
    })

    it("should initialize with default game state", () => {
      expect(renderer.getGameState()).toBe(GameState.READY)
    })

    it("should store reference to game node", () => {
      const newNodeId = platform.rendering.createNode()
      const newNode = new DisplayNode(newNodeId, platform.rendering)
      const newRenderer = new TestRenderer(newNode)

      newRenderer.add(testItems[0])
      const mockNode = platform.rendering.getNode(newNodeId)
      expect(mockNode?.children.length).toBe(1)
    })
  })

  describe("Adding Items", () => {
    it("should add new items correctly", () => {
      renderer.add(testItems[0])

      expect(renderer.createCallCount).toBe(1)
      expect(renderer.lastCreatedItem).toBe(testItems[0])

      const node = renderer.getNode("item1")
      expect(node).toBeDefined()
    })

    it("should not duplicate items with same ID", () => {
      renderer.add(testItems[0])
      renderer.add(testItems[0])

      expect(renderer.createCallCount).toBe(1)
    })

    it("should delegate to update for existing items", () => {
      renderer.add(testItems[0])

      testItems[0].x = 100
      renderer.add(testItems[0])

      expect(renderer.createCallCount).toBe(1)
      expect(renderer.updateNodeCallCount).toBe(2)

      const node = renderer.getNode("item1")
      const mockNode = platform.rendering.getNode(node!.getNodeId())
      expect(mockNode?.x).toBe(100)
    })

    it("should handle add errors gracefully", () => {
      const invalidItem = { id: "", x: 0, y: 0, type: "test" }
      expect(() => renderer.add(invalidItem)).not.toThrow()
    })

    it("should call updateNode for newly created items", () => {
      renderer.add(testItems[0])
      expect(renderer.updateNodeCallCount).toBe(1)
    })
  })

  describe("Updating Items", () => {
    it("should update existing items", () => {
      renderer.add(testItems[0])

      testItems[0].x = 200
      testItems[0].y = 300
      testItems[0].needsRepaint = true
      renderer.update(testItems[0])

      expect(renderer.updateNodeCallCount).toBe(2)

      const node = renderer.getNode("item1")
      const mockNode = platform.rendering.getNode(node!.getNodeId())
      expect(mockNode?.x).toBe(200)
      expect(mockNode?.y).toBe(300)
    })

    it("should create items that don't exist when updating", () => {
      renderer.update(testItems[0])

      expect(renderer.createCallCount).toBe(1)
    })

    it("should handle visibility updates", () => {
      renderer.add(testItems[1])

      testItems[1].visible = false
      testItems[1].needsRepaint = true
      renderer.update(testItems[1])

      const node = renderer.getNode("item2")
      const mockNode = platform.rendering.getNode(node!.getNodeId())
      expect(mockNode?.visible).toBe(false)
    })

    it("should handle update errors gracefully", () => {
      const invalidItem = { id: "valid", x: NaN, y: NaN, type: "test" }
      expect(() => renderer.update(invalidItem)).not.toThrow()
    })

    it("should only repaint when needsRepaint is true", () => {
      renderer.add(testItems[0])
      const initialUpdateCount = renderer.updateNodeCallCount

      testItems[0].needsRepaint = false
      renderer.update(testItems[0])

      expect(renderer.updateNodeCallCount).toBe(initialUpdateCount)
    })

    it("should always repaint for items without needsRepaint property", () => {
      const item: any = { id: "item1", x: 10, y: 20, type: "test" }
      delete item.needsRepaint

      renderer.add(item)
      const initialUpdateCount = renderer.updateNodeCallCount

      item.x = 100
      renderer.update(item)

      expect(renderer.updateNodeCallCount).toBe(initialUpdateCount + 1)
    })
  })

  describe("Removing Items", () => {
    it("should remove items by ID", () => {
      renderer.add(testItems[0])
      const node = renderer.getNode("item1")
      expect(node).toBeDefined()

      renderer.remove("item1")
      expect(renderer.getNode("item1")).toBeUndefined()
    })

    it("should handle removal of non-existent items", () => {
      expect(() => renderer.remove("nonexistent")).not.toThrow()
    })

    it("should clean up internal tracking when removing", () => {
      renderer.add(testItems[0])
      renderer.add(testItems[1])

      renderer.remove("item1")

      renderer.add(testItems[0])
      expect(renderer.createCallCount).toBe(3)
    })
  })

  describe("Setting Items in Bulk", () => {
    it("should set multiple items at once", () => {
      renderer.setItems(testItems)

      expect(renderer.createCallCount).toBe(3)
      expect(renderer.getNode("item1")).toBeDefined()
      expect(renderer.getNode("item2")).toBeDefined()
      expect(renderer.getNode("item3")).toBeDefined()
    })

    it("should replace existing items when setting new ones", () => {
      renderer.add(testItems[0])

      const newItems = [
        { id: "item2", x: 100, y: 200, type: "test" },
        { id: "item3", x: 300, y: 400, type: "test" },
      ]

      renderer.setItems(newItems)

      expect(renderer.getNode("item1")).toBeUndefined()
      expect(renderer.getNode("item2")).toBeDefined()
      expect(renderer.getNode("item3")).toBeDefined()
    })

    it("should handle empty arrays", () => {
      renderer.setItems(testItems)
      expect(renderer.getAllItems().size).toBe(3)

      renderer.setItems([])
      expect(renderer.getAllItems().size).toBe(0)
    })

    it("should update existing items instead of recreating", () => {
      renderer.add(testItems[0])

      testItems[0].x = 500
      renderer.setItems([testItems[0]])

      expect(renderer.createCallCount).toBe(1)
      expect(renderer.updateNodeCallCount).toBe(2)

      const node = renderer.getNode("item1")
      const mockNode = platform.rendering.getNode(node!.getNodeId())
      expect(mockNode?.x).toBe(500)
    })
  })

  describe("Helper Methods", () => {
    it("should create rectangles correctly", () => {
      const rect = renderer.testCreateRectangle(100, 50, 0x00ff00)

      expect(rect).toBeInstanceOf(DisplayNode)
      const mockNode = platform.rendering.getNode(rect.getNodeId())
      expect(mockNode?.graphics.length).toBeGreaterThan(0)
      expect(mockNode?.graphics[0].type).toBe("rectangle")
      expect(mockNode?.graphics[0].w).toBe(100)
      expect(mockNode?.graphics[0].h).toBe(50)
    })

    it("should create circles correctly", () => {
      const circle = renderer.testCreateCircle(25, 0x0000ff)

      expect(circle).toBeInstanceOf(DisplayNode)
      const mockNode = platform.rendering.getNode(circle.getNodeId())
      expect(mockNode?.graphics.length).toBeGreaterThan(0)
      expect(mockNode?.graphics[0].type).toBe("circle")
      expect(mockNode?.graphics[0].radius).toBe(25)
    })

    it("should create polygons correctly", () => {
      const points = [0, 0, 100, 0, 50, 100]
      const polygon = renderer.testCreatePolygon(points, 0x00ff00)

      expect(polygon).toBeInstanceOf(DisplayNode)
      const mockNode = platform.rendering.getNode(polygon.getNodeId())
      expect(mockNode?.graphics.length).toBeGreaterThan(0)
      expect(mockNode?.graphics[0].type).toBe("polygon")
    })

    it("should create border rectangles correctly", () => {
      const border = renderer.testCreateBorderRectangle(100, 50, 2, 0x0000ff)

      expect(border).toBeInstanceOf(DisplayNode)
      const mockNode = platform.rendering.getNode(border.getNodeId())
      expect(mockNode?.graphics.length).toBeGreaterThan(0)
      expect(mockNode?.graphics[0].type).toBe("rectangle")
      expect(mockNode?.graphics[0].stroke).toBe(0x0000ff)
      expect(mockNode?.graphics[0].strokeWidth).toBe(2)
    })

    it("should handle alpha transparency in border rectangles", () => {
      const border = renderer.testCreateBorderRectangle(
        100,
        50,
        2,
        0x0000ff,
        0.5,
      )

      const mockNode = platform.rendering.getNode(border.getNodeId())
      expect(mockNode?.alpha).toBe(0.5)
    })

    it("should create standard nodes with position and body", () => {
      const bodyNode = renderer.testCreateRectangle(50, 50, 0xff0000)
      const container = renderer.testCreateStandardNode(
        100,
        200,
        undefined,
        bodyNode,
      )

      expect(container).toBeInstanceOf(DisplayNode)
      const mockNode = platform.rendering.getNode(container.getNodeId())
      expect(mockNode?.x).toBe(100)
      expect(mockNode?.y).toBe(200)
      expect(mockNode?.children.length).toBe(1)
    })

    it("should apply rotation when specified in standard nodes", () => {
      const bodyNode = renderer.testCreateRectangle(50, 50, 0xff0000)
      const rotation = Math.PI / 4
      const container = renderer.testCreateStandardNode(
        0,
        0,
        rotation,
        bodyNode,
      )

      const mockNode = platform.rendering.getNode(container.getNodeId())
      expect(mockNode?.rotation).toBe(rotation)
    })

    it("should not apply rotation when undefined in standard nodes", () => {
      const bodyNode = renderer.testCreateRectangle(50, 50, 0xff0000)
      const container = renderer.testCreateStandardNode(
        0,
        0,
        undefined,
        bodyNode,
      )

      const mockNode = platform.rendering.getNode(container.getNodeId())
      expect(mockNode?.rotation).toBe(0)
    })
  })

  describe("Health-Based Alpha Calculation", () => {
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
      expect(alpha).toBeCloseTo(0.65, 2)
    })

    it("should use default threshold of half max health", () => {
      const alphaAbove = renderer.testCalculateHealthBasedAlpha(60, 100)
      const alphaBelow = renderer.testCalculateHealthBasedAlpha(40, 100)

      expect(alphaAbove).toBe(1.0)
      expect(alphaBelow).toBeGreaterThan(0.3)
      expect(alphaBelow).toBeLessThan(1.0)
    })

    it("should handle edge cases", () => {
      expect(renderer.testCalculateHealthBasedAlpha(-10, 100)).toBe(0.3)
      expect(renderer.testCalculateHealthBasedAlpha(150, 100)).toBe(1.0)
    })
  })

  describe("Item Retrieval", () => {
    it("should retrieve nodes by ID", () => {
      renderer.add(testItems[0])
      const node = renderer.getNode("item1")

      expect(node).toBeInstanceOf(DisplayNode)
    })

    it("should return undefined for non-existent IDs", () => {
      const node = renderer.getNode("nonexistent")
      expect(node).toBeUndefined()
    })

    it("should retrieve items by ID", () => {
      renderer.add(testItems[0])
      const item = renderer.getItem("item1")

      expect(item).toBe(testItems[0])
    })

    it("should return undefined for non-existent item IDs", () => {
      const item = renderer.getItem("nonexistent")
      expect(item).toBeUndefined()
    })

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

  describe("Rerendering", () => {
    it("should call updateNode for all tracked items", () => {
      testItems[0].needsRepaint = true
      testItems[1].needsRepaint = true
      renderer.add(testItems[0])
      renderer.add(testItems[1])

      const initialUpdateCount = renderer.updateNodeCallCount

      testItems[0].needsRepaint = true
      testItems[1].needsRepaint = true
      renderer.rerender()

      expect(renderer.updateNodeCallCount).toBe(initialUpdateCount + 2)
    })

    it("should handle empty renderer gracefully", () => {
      expect(() => renderer.rerender()).not.toThrow()
    })
  })

  describe("Destruction and Cleanup", () => {
    it("should remove all nodes from game node", () => {
      renderer.add(testItems[0])
      renderer.add(testItems[1])

      expect(renderer.getAllItems().size).toBe(2)

      renderer.clear()
      expect(renderer.getAllItems().size).toBe(0)
    })

    it("should clear all internal tracking", () => {
      renderer.add(testItems[0])
      renderer.add(testItems[1])

      renderer.clear()

      expect(renderer.getAllItems().size).toBe(0)
      expect(renderer.getNode("item1")).toBeUndefined()
      expect(renderer.getNode("item2")).toBeUndefined()
    })

    it("should handle empty renderer gracefully", () => {
      expect(() => renderer.clear()).not.toThrow()
    })
  })

  describe("Game State Management", () => {
    it("should update the game state", () => {
      expect(renderer.getGameState()).toBe(GameState.READY)

      renderer.updateGameState(GameState.PLAYING)
      expect(renderer.getGameState()).toBe(GameState.PLAYING)

      renderer.updateGameState(GameState.PAUSED)
      expect(renderer.getGameState()).toBe(GameState.PAUSED)

      renderer.updateGameState(GameState.ENDED)
      expect(renderer.getGameState()).toBe(GameState.ENDED)
    })

    it("should maintain state during item operations", () => {
      renderer.updateGameState(GameState.PLAYING)

      renderer.add(testItems[0])
      expect(renderer.getGameState()).toBe(GameState.PLAYING)

      renderer.update(testItems[0])
      expect(renderer.getGameState()).toBe(GameState.PLAYING)

      renderer.remove("item1")
      expect(renderer.getGameState()).toBe(GameState.PLAYING)

      renderer.setItems(testItems)
      expect(renderer.getGameState()).toBe(GameState.PLAYING)

      renderer.clear()
      expect(renderer.getGameState()).toBe(GameState.PLAYING)
    })
  })

  describe("Error Handling", () => {
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
      class FailingRenderer extends AbstractRenderer<TestGameObject> {
        protected create(): DisplayNode {
          throw new Error("Create failed")
        }

        public getId(item: TestGameObject): string {
          return item.id
        }
      }

      const failingRenderer = new FailingRenderer(gameNode)
      expect(() => failingRenderer.add(testItems[0])).not.toThrow()
    })

    it("should handle getId method exceptions", () => {
      class FailingIdRenderer extends AbstractRenderer<TestGameObject> {
        protected create(): DisplayNode {
          return this.createRectangle(10, 10, 0xff0000)
        }

        public getId(): string {
          throw new Error("getId failed")
        }
      }

      const failingRenderer = new FailingIdRenderer(gameNode)
      expect(() => failingRenderer.add(testItems[0])).not.toThrow()
    })

    it("should handle repaintNode method exceptions", () => {
      class FailingUpdateRenderer extends AbstractRenderer<TestGameObject> {
        protected create(): DisplayNode {
          return this.createRectangle(10, 10, 0xff0000)
        }

        protected repaintNode(): void {
          throw new Error("Update failed")
        }

        public getId(item: TestGameObject): string {
          return item.id
        }
      }

      const failingRenderer = new FailingUpdateRenderer(gameNode)
      testItems[0].needsRepaint = true
      failingRenderer.add(testItems[0])

      expect(() => failingRenderer.update(testItems[0])).not.toThrow()
    })
  })

  describe("Performance", () => {
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

      expect(renderer.getAllItems().size).toBe(1000)
      expect(duration).toBeLessThan(1000)
    })

    it("should reuse nodes efficiently", () => {
      renderer.add(testItems[0])
      const originalCreateCount = renderer.createCallCount

      for (let i = 0; i < 10; i++) {
        testItems[0].x = i * 10
        testItems[0].needsRepaint = true
        renderer.update(testItems[0])
      }

      expect(renderer.createCallCount).toBe(originalCreateCount)
      expect(renderer.updateNodeCallCount).toBe(11)
    })
  })
})
