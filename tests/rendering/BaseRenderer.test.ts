import { beforeEach, describe, expect, it } from "bun:test"
import { BaseRenderer } from "../../src/rendering/BaseRenderer"

// Mock implementation for testing the interface contract
interface TestItem {
  id: string
  value: string
}

class MockRenderer implements BaseRenderer<TestItem> {
  private items: Map<string, TestItem> = new Map()
  public addCalls: TestItem[] = []
  public updateCalls: TestItem[] = []
  public removeCalls: string[] = []
  public setItemsCalls: TestItem[][] = []

  add(item: TestItem): void {
    this.addCalls.push(item)
    this.items.set(item.id, item)
  }

  update(item: TestItem): void {
    this.updateCalls.push(item)
    this.items.set(item.id, item)
  }

  remove(itemId: string): void {
    this.removeCalls.push(itemId)
    this.items.delete(itemId)
  }

  setItems(items: TestItem[]): void {
    this.setItemsCalls.push([...items])
    this.items.clear()
    items.forEach((item) => this.items.set(item.id, item))
  }

  rerender(): void {
    // Mock implementation - no-op
  }

  getId(item: TestItem): string {
    return item.id
  }

  clear(): void {
    this.items.clear()
    this.addCalls = []
    this.updateCalls = []
    this.removeCalls = []
    this.setItemsCalls = []
  }

  // Helper methods for testing
  getStoredItems(): TestItem[] {
    return Array.from(this.items.values())
  }

  hasItem(id: string): boolean {
    return this.items.has(id)
  }

  reset(): void {
    this.items.clear()
    this.addCalls = []
    this.updateCalls = []
    this.removeCalls = []
    this.setItemsCalls = []
  }
}

// Alternative implementation to test interface flexibility
class AlternativeRenderer implements BaseRenderer<TestItem> {
  private storage: TestItem[] = []

  add(item: TestItem): void {
    const existing = this.storage.findIndex((i) => i.id === item.id)
    if (existing === -1) {
      this.storage.push(item)
    }
  }

  update(item: TestItem): void {
    const index = this.storage.findIndex((i) => i.id === item.id)
    if (index !== -1) {
      this.storage[index] = item
    } else {
      this.storage.push(item)
    }
  }

  remove(itemId: string): void {
    this.storage = this.storage.filter((item) => item.id !== itemId)
  }

  setItems(items: TestItem[]): void {
    this.storage = [...items]
  }

  rerender(): void {
    // Mock implementation - no-op
  }

  getId(item: TestItem): string {
    return item.id
  }

  clear(): void {
    this.storage = []
  }

  getItems(): TestItem[] {
    return [...this.storage]
  }
}

describe("BaseRenderer Interface", () => {
  describe("Interface Contract", () => {
    it("should define all required methods", () => {
      const renderer = new MockRenderer()

      // Check that all required methods exist
      expect(typeof renderer.add).toBe("function")
      expect(typeof renderer.update).toBe("function")
      expect(typeof renderer.remove).toBe("function")
      expect(typeof renderer.setItems).toBe("function")
    })

    it("should be implementable with different storage strategies", () => {
      const mockRenderer = new MockRenderer()
      const altRenderer = new AlternativeRenderer()

      // Both should implement the same interface
      const testItem: TestItem = { id: "test1", value: "hello" }

      mockRenderer.add(testItem)
      altRenderer.add(testItem)

      // Both should have the item (verification methods differ)
      expect(mockRenderer.hasItem("test1")).toBe(true)
      expect(altRenderer.getItems().length).toBe(1)
      expect(altRenderer.getItems()[0]).toEqual(testItem)
    })
  })

  describe("MockRenderer Implementation", () => {
    let renderer: MockRenderer
    const testItems: TestItem[] = [
      { id: "item1", value: "first" },
      { id: "item2", value: "second" },
      { id: "item3", value: "third" },
    ]

    beforeEach(() => {
      renderer = new MockRenderer()
    })

    describe("add() method", () => {
      it("should add items correctly", () => {
        renderer.add(testItems[0])

        expect(renderer.addCalls.length).toBe(1)
        expect(renderer.addCalls[0]).toBe(testItems[0])
        expect(renderer.hasItem("item1")).toBe(true)
      })

      it("should handle multiple adds", () => {
        renderer.add(testItems[0])
        renderer.add(testItems[1])

        expect(renderer.addCalls.length).toBe(2)
        expect(renderer.getStoredItems().length).toBe(2)
      })

      it("should replace items with same ID", () => {
        const originalItem = { id: "test", value: "original" }
        const updatedItem = { id: "test", value: "updated" }

        renderer.add(originalItem)
        renderer.add(updatedItem)

        expect(renderer.addCalls.length).toBe(2)
        expect(renderer.getStoredItems().length).toBe(1)
        expect(renderer.getStoredItems()[0].value).toBe("updated")
      })
    })

    describe("update() method", () => {
      it("should update existing items", () => {
        renderer.add(testItems[0])

        const updatedItem = { id: "item1", value: "updated" }
        renderer.update(updatedItem)

        expect(renderer.updateCalls.length).toBe(1)
        expect(renderer.updateCalls[0]).toBe(updatedItem)
        expect(renderer.getStoredItems()[0].value).toBe("updated")
      })

      it("should add items that don't exist", () => {
        renderer.update(testItems[0])

        expect(renderer.updateCalls.length).toBe(1)
        expect(renderer.hasItem("item1")).toBe(true)
      })
    })

    describe("remove() method", () => {
      it("should remove items by ID", () => {
        renderer.add(testItems[0])
        renderer.add(testItems[1])

        renderer.remove("item1")

        expect(renderer.removeCalls.length).toBe(1)
        expect(renderer.removeCalls[0]).toBe("item1")
        expect(renderer.hasItem("item1")).toBe(false)
        expect(renderer.hasItem("item2")).toBe(true)
      })

      it("should handle removal of non-existent items", () => {
        renderer.remove("nonexistent")

        expect(renderer.removeCalls.length).toBe(1)
        expect(renderer.removeCalls[0]).toBe("nonexistent")
      })
    })

    describe("setItems() method", () => {
      it("should set multiple items at once", () => {
        renderer.setItems(testItems)

        expect(renderer.setItemsCalls.length).toBe(1)
        expect(renderer.setItemsCalls[0]).toEqual(testItems)
        expect(renderer.getStoredItems().length).toBe(3)
      })

      it("should replace existing items", () => {
        renderer.add(testItems[0])

        const newItems = [testItems[1], testItems[2]]
        renderer.setItems(newItems)

        expect(renderer.getStoredItems().length).toBe(2)
        expect(renderer.hasItem("item1")).toBe(false)
        expect(renderer.hasItem("item2")).toBe(true)
        expect(renderer.hasItem("item3")).toBe(true)
      })

      it("should handle empty arrays", () => {
        renderer.setItems(testItems)
        renderer.setItems([])

        expect(renderer.setItemsCalls.length).toBe(2)
        expect(renderer.getStoredItems().length).toBe(0)
      })

      it("should create defensive copies of input arrays", () => {
        const items = [...testItems]
        renderer.setItems(items)

        // Modify original array
        items.push({ id: "item4", value: "fourth" })

        // Renderer should not be affected
        expect(renderer.getStoredItems().length).toBe(3)
        expect(renderer.setItemsCalls[0].length).toBe(3)
      })
    })
  })

  describe("AlternativeRenderer Implementation", () => {
    let renderer: AlternativeRenderer

    beforeEach(() => {
      renderer = new AlternativeRenderer()
    })

    it("should implement add() differently but correctly", () => {
      const item1 = { id: "test1", value: "first" }
      const item1Updated = { id: "test1", value: "updated" }

      renderer.add(item1)
      renderer.add(item1Updated) // Should not add duplicate

      const items = renderer.getItems()
      expect(items.length).toBe(1)
      expect(items[0].value).toBe("first") // Should keep original since add doesn't update
    })

    it("should implement update() correctly", () => {
      const item1 = { id: "test1", value: "first" }
      const item1Updated = { id: "test1", value: "updated" }

      renderer.update(item1)
      renderer.update(item1Updated)

      const items = renderer.getItems()
      expect(items.length).toBe(1)
      expect(items[0].value).toBe("updated")
    })

    it("should implement remove() correctly", () => {
      renderer.add({ id: "test1", value: "first" })
      renderer.add({ id: "test2", value: "second" })

      renderer.remove("test1")

      const items = renderer.getItems()
      expect(items.length).toBe(1)
      expect(items[0].id).toBe("test2")
    })

    it("should implement setItems() correctly", () => {
      const items = [
        { id: "item1", value: "first" },
        { id: "item2", value: "second" },
      ]

      renderer.setItems(items)

      expect(renderer.getItems()).toEqual(items)
    })
  })

  describe("Type Safety", () => {
    it("should work with different item types", () => {
      interface NumberItem {
        id: string
        num: number
      }

      class NumberRenderer implements BaseRenderer<NumberItem> {
        private items: NumberItem[] = []

        add(item: NumberItem): void {
          this.items.push(item)
        }

        update(item: NumberItem): void {
          const index = this.items.findIndex((i) => i.id === item.id)
          if (index !== -1) {
            this.items[index] = item
          }
        }

        remove(itemId: string): void {
          this.items = this.items.filter((item) => item.id !== itemId)
        }

        setItems(items: NumberItem[]): void {
          this.items = [...items]
        }

        rerender(): void {
          // Mock implementation - no-op
        }

        getId(item: NumberItem): string {
          return item.id
        }

        clear(): void {
          this.items = []
        }

        getItems(): NumberItem[] {
          return this.items
        }
      }

      const numberRenderer = new NumberRenderer()
      const numberItem: NumberItem = { id: "num1", num: 42 }

      numberRenderer.add(numberItem)
      expect(numberRenderer.getItems().length).toBe(1)
      expect(numberRenderer.getItems()[0].num).toBe(42)
    })

    it("should enforce type constraints at compile time", () => {
      const renderer = new MockRenderer()

      // This should compile (correct type)
      renderer.add({ id: "test", value: "hello" })

      // These would cause TypeScript errors (incorrect types):
      // renderer.add({ id: 123, value: "hello" }) // id should be string
      // renderer.add({ value: "hello" }) // missing id
      // renderer.add({ id: "test", num: 42 }) // wrong property name
    })
  })

  describe("Interface Flexibility", () => {
    it("should allow implementations to add extra functionality", () => {
      class ExtendedRenderer implements BaseRenderer<TestItem> {
        private items: Map<string, TestItem> = new Map()

        add(item: TestItem): void {
          this.items.set(item.id, item)
        }

        update(item: TestItem): void {
          this.items.set(item.id, item)
        }

        remove(itemId: string): void {
          this.items.delete(itemId)
        }

        setItems(items: TestItem[]): void {
          this.items.clear()
          items.forEach((item) => this.items.set(item.id, item))
        }

        rerender(): void {
          // Mock implementation - no-op
        }

        getId(item: TestItem): string {
          return item.id
        }

        clear(): void {
          this.items.clear()
        }

        // Extra functionality beyond the interface

        getCount(): number {
          return this.items.size
        }

        findByValue(value: string): TestItem | undefined {
          return Array.from(this.items.values()).find(
            (item) => item.value === value,
          )
        }
      }

      const renderer = new ExtendedRenderer()

      // Use base interface methods
      renderer.add({ id: "test1", value: "hello" })
      renderer.add({ id: "test2", value: "world" })

      // Use extended methods
      expect(renderer.getCount()).toBe(2)
      expect(renderer.findByValue("hello")?.id).toBe("test1")

      renderer.clear()
      expect(renderer.getCount()).toBe(0)
    })
  })
})
