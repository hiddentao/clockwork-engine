import type { GameEngineInterface } from "../../src/GameObject"
import { GameObject } from "../../src/GameObject"
import { Vector2D } from "../../src/geometry/Vector2D"

export class TestEnemy extends GameObject {
  private aggressionLevel: number = 1
  private targetId: string | null = null

  constructor(
    id: string,
    position: { x: number; y: number },
    engine?: GameEngineInterface,
  ) {
    super(
      id,
      new Vector2D(position.x, position.y),
      new Vector2D(1, 1),
      50,
      engine,
    )
  }

  getType(): string {
    return "Enemy"
  }

  // AI behavior methods for testing
  setAggression(level: number): void {
    this.aggressionLevel = Math.max(0, Math.min(10, level))
  }

  getAggression(): number {
    return this.aggressionLevel
  }

  setTarget(targetId: string | null): void {
    this.targetId = targetId
  }

  getTarget(): string | null {
    return this.targetId
  }

  // Movement AI
  moveTowards(target: Vector2D, speed: number = 1): void {
    const direction = target.subtract(this.getPosition()).normalize()
    const newPosition = this.getPosition().add(direction.scale(speed))
    this.setPosition(newPosition)
  }

  patrol(points: Vector2D[], currentIndex: number = 0): void {
    if (points.length === 0) return

    const target = points[currentIndex % points.length]
    this.moveTowards(target, 0.5)
  }

  // Attack behavior
  attack(_damage: number = 10): void {
    // Simple attack behavior for testing
    // In a real game, this would affect nearby targets
  }

  // Serialization for testing
  serialize() {
    return {
      ...super.serialize(),
      aggressionLevel: this.aggressionLevel,
      targetId: this.targetId,
    }
  }

  static deserialize(data: any): TestEnemy {
    const enemy = new TestEnemy(data.id, {
      x: data.position.x,
      y: data.position.y,
    })
    enemy.aggressionLevel = data.aggressionLevel
    enemy.targetId = data.targetId
    return enemy
  }
}
