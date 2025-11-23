import type {
  GameEngineInterface,
  GameObjectEvents,
} from "@hiddentao/clockwork-engine"
import { GameObject, Vector2D } from "@hiddentao/clockwork-engine"
import { DIRECTION_VECTORS, Direction, GAME_CONFIG } from "../utils/constants"

interface SnakeSegment {
  position: Vector2D
}

interface SnakeEvents extends GameObjectEvents {
  segmentAdded: (snake: Snake, position: Vector2D, index: number) => void
  segmentRemoved: (snake: Snake, position: Vector2D, index: number) => void
}

export class Snake extends GameObject<SnakeEvents> {
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
    if (!this.wouldHitNeck(newDirection)) {
      this.direction = newDirection
      this.needsRepaint = true
    }
  }

  move(): void {
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
    this.emit("segmentAdded", this, newHeadPosition, 0)

    // Update main position to head position
    this.setPosition(newHeadPosition)

    // Remove tail unless growing
    if (this.pendingGrowth > 0) {
      this.pendingGrowth--
    } else {
      const removed = this.segments.pop()
      if (removed) {
        this.emit(
          "segmentRemoved",
          this,
          removed.position,
          this.segments.length,
        )
      }
    }

    this.needsRepaint = true
  }

  grow(): void {
    this.pendingGrowth++
    this.applesEaten++
    this.needsRepaint = true
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

  // Get the next N positions in current direction (up to arena edge)
  getProjectedPath(maxSteps: number = 8): Vector2D[] {
    const path: Vector2D[] = []
    const directionVector = DIRECTION_VECTORS[this.direction]
    let currentPos = this.segments[0].position.clone()

    for (let i = 0; i < maxSteps; i++) {
      const nextPos = currentPos.add(
        new Vector2D(directionVector.x, directionVector.y),
      )

      // Stop at arena edge (don't wrap around for projection)
      if (
        nextPos.x < 0 ||
        nextPos.x >= GAME_CONFIG.GRID_SIZE ||
        nextPos.y < 0 ||
        nextPos.y >= GAME_CONFIG.GRID_SIZE
      ) {
        break
      }

      path.push(nextPos)
      currentPos = nextPos
    }

    return path
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
