import type { GameEngineInterface } from "../../src/GameObject"
import { GameObject } from "../../src/GameObject"
import { Vector2D } from "../../src/geometry/Vector2D"

export class TestPlayer extends GameObject {
  private level: number = 1
  private experience: number = 0

  constructor(
    id: string,
    position: { x: number; y: number },
    engine?: GameEngineInterface,
  ) {
    super(
      id,
      new Vector2D(position.x, position.y),
      new Vector2D(1, 1),
      100,
      engine,
    )
  }

  getType(): string {
    return "Player"
  }

  // Test methods for recording/replay
  setLevel(level: number): void {
    this.level = level
  }

  getLevel(): number {
    return this.level
  }

  gainExperience(amount: number): void {
    this.experience += amount
    if (this.experience >= 100) {
      this.level++
      this.experience -= 100
    }
  }

  getExperience(): number {
    return this.experience
  }

  // Move methods for testing
  moveUp(distance: number = 1): void {
    this.setPosition(this.getPosition().add(new Vector2D(0, -distance)))
  }

  moveDown(distance: number = 1): void {
    this.setPosition(this.getPosition().add(new Vector2D(0, distance)))
  }

  moveLeft(distance: number = 1): void {
    this.setPosition(this.getPosition().add(new Vector2D(-distance, 0)))
  }

  moveRight(distance: number = 1): void {
    this.setPosition(this.getPosition().add(new Vector2D(distance, 0)))
  }

  // Serialization for testing
  serialize() {
    return {
      ...super.serialize(),
      level: this.level,
      experience: this.experience,
    }
  }

  static deserialize(data: any): TestPlayer {
    const player = new TestPlayer(data.id, {
      x: data.position.x,
      y: data.position.y,
    })
    player.level = data.level
    player.experience = data.experience
    return player
  }
}
