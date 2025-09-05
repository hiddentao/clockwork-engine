import type { GameEngineInterface } from "clockwork"
import { GameObject, Vector2D } from "clockwork"
import { DIRECTION_VECTORS, Direction, GAME_CONFIG } from "../utils/constants"

interface SnakeSegment {
  position: Vector2D
}

export class Snake extends GameObject {
  private segments: SnakeSegment[] = []
  private direction: Direction = Direction.RIGHT
  private directionQueue: Direction[] = []
  private static readonly MAX_QUEUE_SIZE = 3
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
    // Add to direction queue if there's space
    if (this.directionQueue.length < Snake.MAX_QUEUE_SIZE) {
      this.directionQueue.push(newDirection)
    }
  }

  move(): void {
    // Process one direction from queue if available
    if (this.directionQueue.length > 0) {
      const nextDirection = this.directionQueue[0]

      if (this.wouldHitNeck(nextDirection)) {
        // Invalid direction - clear the entire queue and continue in current direction
        this.directionQueue = []
      } else {
        // Valid direction - apply it and remove from queue
        this.direction = nextDirection
        this.directionQueue.shift()
      }
    }

    const directionVector = DIRECTION_VECTORS[this.direction]
    const headPosition = this.segments[0].position
    const newHeadPosition = headPosition.add(
      new Vector2D(directionVector.x, directionVector.y),
    )

    // Wrap around boundaries
    if (newHeadPosition.x < 0) {
      newHeadPosition.x = GAME_CONFIG.GRID_SIZE - 1
    } else if (newHeadPosition.x >= GAME_CONFIG.GRID_SIZE) {
      newHeadPosition.x = 0
    }

    if (newHeadPosition.y < 0) {
      newHeadPosition.y = GAME_CONFIG.GRID_SIZE - 1
    } else if (newHeadPosition.y >= GAME_CONFIG.GRID_SIZE) {
      newHeadPosition.y = 0
    }

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

  private wouldHitNeck(newDirection: Direction): boolean {
    if (this.segments.length < 2) {
      return false
    }

    const directionVector = DIRECTION_VECTORS[newDirection]
    const headPosition = this.segments[0].position
    const neckPosition = this.segments[1].position
    const newHeadPosition = headPosition.add(
      new Vector2D(directionVector.x, directionVector.y),
    )

    return (
      newHeadPosition.x === neckPosition.x &&
      newHeadPosition.y === neckPosition.y
    )
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
      directionQueue: this.directionQueue,
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
    snake.directionQueue = data.directionQueue || []
    snake.pendingGrowth = data.pendingGrowth
    snake.applesEaten = data.applesEaten

    return snake
  }
}
