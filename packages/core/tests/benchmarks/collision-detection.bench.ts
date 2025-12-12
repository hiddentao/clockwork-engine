import { CollisionGrid } from "../../src/geometry/CollisionGrid"
import type { ICollisionSource } from "../../src/geometry/ICollisionSource"
import { Vector2D } from "../../src/geometry/Vector2D"
import { formatSuite, suite } from "./framework"

/**
 * Benchmark collision detection performance at different scales
 */

class TestCollisionSource implements ICollisionSource {
  constructor(
    private id: string,
    private position: Vector2D,
  ) {}

  getCollisionSourceId(): string {
    return this.id
  }

  getPosition(): Vector2D {
    return this.position
  }

  setPosition(position: Vector2D): void {
    this.position = position
  }
}

function createTestObjects(
  count: number,
  gridSize: number,
): TestCollisionSource[] {
  const objects: TestCollisionSource[] = []
  for (let i = 0; i < count; i++) {
    objects.push(
      new TestCollisionSource(
        `obj-${i}`,
        new Vector2D(
          Math.floor(Math.random() * gridSize),
          Math.floor(Math.random() * gridSize),
        ),
      ),
    )
  }
  return objects
}

async function runCollisionBenchmarks() {
  const gridSize = 1000

  const results = await suite("Collision Detection Benchmarks", [
    {
      name: "Insert 100 objects",
      fn: () => {
        const grid = new CollisionGrid()
        const objects = createTestObjects(100, gridSize)
        for (const obj of objects) {
          grid.add(obj.getPosition(), obj)
        }
      },
    },
    {
      name: "Insert 500 objects",
      fn: () => {
        const grid = new CollisionGrid()
        const objects = createTestObjects(500, gridSize)
        for (const obj of objects) {
          grid.add(obj.getPosition(), obj)
        }
      },
    },
    {
      name: "Insert 1000 objects",
      fn: () => {
        const grid = new CollisionGrid()
        const objects = createTestObjects(1000, gridSize)
        for (const obj of objects) {
          grid.add(obj.getPosition(), obj)
        }
      },
    },
    {
      name: "Query nearby (100 objects)",
      fn: () => {
        const grid = new CollisionGrid()
        const objects = createTestObjects(100, gridSize)
        for (const obj of objects) {
          grid.add(obj.getPosition(), obj)
        }
        // Query center of grid
        grid.containsPoint(new Vector2D(gridSize / 2, gridSize / 2))
      },
    },
    {
      name: "Query nearby (500 objects)",
      fn: () => {
        const grid = new CollisionGrid()
        const objects = createTestObjects(500, gridSize)
        for (const obj of objects) {
          grid.add(obj.getPosition(), obj)
        }
        grid.containsPoint(new Vector2D(gridSize / 2, gridSize / 2))
      },
    },
    {
      name: "Query nearby (1000 objects)",
      fn: () => {
        const grid = new CollisionGrid()
        const objects = createTestObjects(1000, gridSize)
        for (const obj of objects) {
          grid.add(obj.getPosition(), obj)
        }
        grid.containsPoint(new Vector2D(gridSize / 2, gridSize / 2))
      },
    },
    {
      name: "Update position (100 objects, 10x each)",
      fn: () => {
        const grid = new CollisionGrid()
        const objects = createTestObjects(100, gridSize)
        for (const obj of objects) {
          grid.add(obj.getPosition(), obj)
        }
        for (let i = 0; i < 10; i++) {
          for (const obj of objects) {
            const oldPos = obj.getPosition()
            const newPos = new Vector2D(
              Math.floor(Math.random() * gridSize),
              Math.floor(Math.random() * gridSize),
            )
            grid.remove(oldPos, obj)
            obj.setPosition(newPos)
            grid.add(newPos, obj)
          }
        }
      },
    },
    {
      name: "Clear and rebuild (100 objects)",
      fn: () => {
        const grid = new CollisionGrid()
        const objects = createTestObjects(100, gridSize)
        for (const obj of objects) {
          grid.add(obj.getPosition(), obj)
        }
        grid.clear()
        for (const obj of objects) {
          grid.add(obj.getPosition(), obj)
        }
      },
    },
  ])

  console.log(formatSuite(results))
}

// Run if executed directly
if (import.meta.main) {
  runCollisionBenchmarks()
}
