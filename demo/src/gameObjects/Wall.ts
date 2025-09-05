import type { GameEngineInterface } from "clockwork"
import { GameObject, Vector2D } from "clockwork"

export class Wall extends GameObject {
  private isHorizontal: boolean
  private blocks: Vector2D[]

  constructor(
    id: string,
    position: Vector2D,
    isHorizontal: boolean = true,
    engine?: GameEngineInterface,
  ) {
    super(
      id,
      position,
      new Vector2D(isHorizontal ? 2 : 1, isHorizontal ? 1 : 2),
      1,
      engine,
    )
    this.isHorizontal = isHorizontal

    // Generate the 2 block positions
    this.blocks = this.generateBlockPositions()
  }

  getType(): string {
    return "Wall"
  }

  private generateBlockPositions(): Vector2D[] {
    const basePos = this.getPosition()

    if (this.isHorizontal) {
      return [basePos.clone(), basePos.add(new Vector2D(1, 0))]
    } else {
      return [basePos.clone(), basePos.add(new Vector2D(0, 1))]
    }
  }

  // Update block positions when wall position changes
  public setPosition(position: Vector2D): void {
    super.setPosition(position)
    this.blocks = this.generateBlockPositions()
  }

  getBlocks(): Vector2D[] {
    return [...this.blocks] // Return copy
  }

  getIsHorizontal(): boolean {
    return this.isHorizontal
  }

  // Check if this wall would collide with any of the given positions
  wouldCollideWith(positions: Vector2D[]): boolean {
    return this.blocks.some((block) =>
      positions.some((pos) => pos.x === block.x && pos.y === block.y),
    )
  }

  // Get bounding box for efficient collision detection
  getBoundingBox(): { min: Vector2D; max: Vector2D } {
    const positions = this.blocks
    const xs = positions.map((p) => p.x)
    const ys = positions.map((p) => p.y)

    return {
      min: new Vector2D(Math.min(...xs), Math.min(...ys)),
      max: new Vector2D(Math.max(...xs), Math.max(...ys)),
    }
  }

  // Visual properties
  getAge(_currentFrame: number): number {
    // Could track spawn frame if needed for animations
    return 0
  }

  // Serialization
  serialize() {
    return {
      ...super.serialize(),
      isHorizontal: this.isHorizontal,
      blocks: this.blocks.map((block) => block.serialize()),
    }
  }

  static deserialize(data: any): Wall {
    const wall = new Wall(
      data.id,
      Vector2D.deserialize(data.position),
      data.isHorizontal,
    )
    wall.blocks = data.blocks.map((block: any) => Vector2D.deserialize(block))
    return wall
  }
}
