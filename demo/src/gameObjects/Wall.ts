import type { GameEngineInterface } from "@hiddentao/clockwork-engine"
import { GameObject, Vector2D } from "@hiddentao/clockwork-engine"

export class Wall extends GameObject {
  constructor(id: string, position: Vector2D, engine?: GameEngineInterface) {
    super(id, position, new Vector2D(1, 1), 1, engine)
  }

  getType(): string {
    return "Wall"
  }

  getBlocks(): Vector2D[] {
    return [this.getPosition()] // Single block wall
  }

  // Get bounding box for efficient collision detection
  getBoundingBox(): { min: Vector2D; max: Vector2D } {
    const position = this.getPosition()
    return {
      min: position,
      max: position,
    }
  }

  // Visual properties
  getAge(_currentTick: number): number {
    // Could track spawn tick if needed for animations
    return 0
  }

  // Serialization
  serialize() {
    return {
      ...super.serialize(),
    }
  }

  static deserialize(data: any): Wall {
    const wall = new Wall(data.id, Vector2D.deserialize(data.position))
    return wall
  }
}
