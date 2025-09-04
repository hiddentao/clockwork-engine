import type { GameEngineInterface } from "clockwork"
import { GameObject, Vector2D } from "clockwork"
import { DIRECTION_VECTORS, Direction } from "../utils/constants"

interface SnakeSegment {
  position: Vector2D
}

export class Snake extends GameObject {
  private segments: SnakeSegment[] = []
  private direction: Direction = Direction.RIGHT
  private pendingGrowth: number = 0
  private applesEaten: number = 0

  constructor(id: string, position: Vector2D, engine?: GameEngineInterface) {
    super(id, position, new Vector2D(1, 1), 100, engine)

    // Initialize snake with 2 segments
    this.segments = [
      { position: position.clone() },
      { position: position.add(new Vector2D(-1, 0)) },
    ]
  }

  getType(): string {
    return "Snake"
  }

  // Movement methods (these will be recorded for replay)
  setDirection(newDirection: Direction): void {
    // Prevent reversing directly into body
    const opposites = {
      [Direction.UP]: Direction.DOWN,
      [Direction.DOWN]: Direction.UP,
      [Direction.LEFT]: Direction.RIGHT,
      [Direction.RIGHT]: Direction.LEFT,
    }

    if (opposites[newDirection] === this.direction) {
      return
    }

    this.direction = newDirection
  }

  move(): void {
    const directionVector = DIRECTION_VECTORS[this.direction]
    const headPosition = this.segments[0].position
    const newHeadPosition = headPosition.add(
      new Vector2D(directionVector.x, directionVector.y),
    )

    // Add new head
    this.segments.unshift({ position: newHeadPosition })

    // Update main position to head position
    this.setPosition(newHeadPosition)

    // Remove tail unless growing
    if (this.pendingGrowth > 0) {
      this.pendingGrowth--
    } else {
      this.segments.pop()
    }
  }

  grow(): void {
    this.pendingGrowth++
    this.applesEaten++
  }

  // Collision detection
  checkSelfCollision(): boolean {
    const head = this.segments[0].position

    // Check collision with body (skip head itself)
    for (let i = 1; i < this.segments.length; i++) {
      if (
        head.x === this.segments[i].position.x &&
        head.y === this.segments[i].position.y
      ) {
        return true
      }
    }

    return false
  }

  checkWallCollision(wallPositions: Vector2D[]): boolean {
    const head = this.segments[0].position

    return wallPositions.some(
      (wallPos) => head.x === wallPos.x && head.y === wallPos.y,
    )
  }

  checkBoundaryCollision(gridSize: number): boolean {
    const head = this.segments[0].position

    return head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize
  }

  checkAppleCollision(applePosition: Vector2D): boolean {
    const head = this.segments[0].position
    return head.x === applePosition.x && head.y === applePosition.y
  }

  // Getters
  getSegments(): SnakeSegment[] {
    return [...this.segments] // Return copy
  }

  getHead(): Vector2D {
    return this.segments[0].position.clone()
  }

  getLength(): number {
    return this.segments.length
  }

  getDirection(): Direction {
    return this.direction
  }

  getApplesEaten(): number {
    return this.applesEaten
  }

  // Serialization
  serialize() {
    return {
      ...super.serialize(),
      segments: this.segments.map((seg) => ({
        position: seg.position.serialize(),
      })),
      direction: this.direction,
      pendingGrowth: this.pendingGrowth,
      applesEaten: this.applesEaten,
    }
  }

  static deserialize(data: any): Snake {
    const snake = new Snake(data.id, new Vector2D(0, 0))

    snake.segments = data.segments.map((seg: any) => ({
      position: Vector2D.deserialize(seg.position),
    }))
    snake.direction = data.direction
    snake.pendingGrowth = data.pendingGrowth
    snake.applesEaten = data.applesEaten

    return snake
  }
}
