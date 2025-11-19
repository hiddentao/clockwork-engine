import { beforeEach, describe, expect, test } from "bun:test"
import { Apple } from "../demo/src/gameObjects/Apple"
import { Snake } from "../demo/src/gameObjects/Snake"
import { Wall } from "../demo/src/gameObjects/Wall"
import { Direction } from "../demo/src/utils/constants"
import { Vector2D } from "../src/geometry/Vector2D"

describe("Demo GameObject Dirty Tracking", () => {
  describe("Snake", () => {
    let snake: Snake

    beforeEach(() => {
      snake = new Snake("snake1", new Vector2D(5, 5))
    })

    test("starts dirty when created", () => {
      expect(snake.needsRepaint).toBe(true)
    })

    test("setDirection marks dirty when direction changes", () => {
      snake.needsRepaint = false
      expect(snake.needsRepaint).toBe(false)

      snake.setDirection(Direction.DOWN)
      expect(snake.needsRepaint).toBe(true)
    })

    test("setDirection does not mark dirty when hitting neck", () => {
      // Set up snake with at least 2 segments going right
      snake.needsRepaint = false
      expect(snake.needsRepaint).toBe(false)

      // Try to go left (would hit neck) - should not change direction or mark dirty
      snake.setDirection(Direction.LEFT)
      expect(snake.needsRepaint).toBe(false)
      expect(snake.getDirection()).toBe(Direction.RIGHT) // Should still be going right
    })

    test("move marks dirty", () => {
      snake.needsRepaint = false
      expect(snake.needsRepaint).toBe(false)

      snake.move()
      expect(snake.needsRepaint).toBe(true)
    })

    test("grow marks dirty", () => {
      snake.needsRepaint = false
      expect(snake.needsRepaint).toBe(false)

      snake.grow()
      expect(snake.needsRepaint).toBe(true)
    })

    test("needsRepaint can be cleared", () => {
      snake.setDirection(Direction.DOWN)
      expect(snake.needsRepaint).toBe(true)

      snake.needsRepaint = false
      expect(snake.needsRepaint).toBe(false)
    })
  })

  describe("Apple", () => {
    let apple: Apple

    beforeEach(() => {
      apple = new Apple("apple1", new Vector2D(3, 3), 500)
    })

    test("starts dirty when created", () => {
      expect(apple.needsRepaint).toBe(true)
    })

    test("setSpawnFrame does not mark dirty", () => {
      apple.needsRepaint = false
      expect(apple.needsRepaint).toBe(false)

      apple.setSpawnFrame(100)
      expect(apple.needsRepaint).toBe(false) // Should not mark dirty as it only affects computed visuals
    })

    test("inherited setters mark dirty", () => {
      apple.needsRepaint = false
      expect(apple.needsRepaint).toBe(false)

      apple.setPosition(new Vector2D(5, 5))
      expect(apple.needsRepaint).toBe(true)
    })

    test("needsRepaint can be cleared", () => {
      apple.setPosition(new Vector2D(1, 1))
      expect(apple.needsRepaint).toBe(true)

      apple.needsRepaint = false
      expect(apple.needsRepaint).toBe(false)
    })
  })

  describe("Wall", () => {
    let wall: Wall

    beforeEach(() => {
      wall = new Wall("wall1", new Vector2D(2, 2))
    })

    test("starts dirty when created", () => {
      expect(wall.needsRepaint).toBe(true)
    })

    test("inherited setters mark dirty", () => {
      wall.needsRepaint = false
      expect(wall.needsRepaint).toBe(false)

      wall.setPosition(new Vector2D(4, 4))
      expect(wall.needsRepaint).toBe(true)
    })

    test("needsRepaint can be cleared", () => {
      wall.setPosition(new Vector2D(1, 1))
      expect(wall.needsRepaint).toBe(true)

      wall.needsRepaint = false
      expect(wall.needsRepaint).toBe(false)
    })
  })
})
