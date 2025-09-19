import type { GameEngineInterface } from "@hiddentao/clockwork-engine"
import { GameObject, Vector2D } from "@hiddentao/clockwork-engine"

export class Apple extends GameObject {
  private spawnTick: number
  private timeoutTicks: number

  constructor(
    id: string,
    position: Vector2D,
    timeoutTicks: number = 500,
    engine?: GameEngineInterface,
  ) {
    super(id, position, new Vector2D(1, 1), 1, engine)
    this.timeoutTicks = timeoutTicks
    this.spawnTick = 0 // Will be set by the game engine
  }

  getType(): string {
    return "Apple"
  }

  setSpawnTick(tick: number): void {
    this.spawnTick = tick
  }

  isExpired(currentTick: number): boolean {
    return currentTick - this.spawnTick >= this.timeoutTicks
  }

  getAge(currentTick: number): number {
    return currentTick - this.spawnTick
  }

  getRemainingTime(currentTick: number): number {
    return Math.max(0, this.timeoutTicks - (currentTick - this.spawnTick))
  }

  // Visual properties for rendering
  getAlpha(currentTick: number): number {
    const age = this.getAge(currentTick)
    const fadeStartTick = this.timeoutTicks * 0.8 // Start fading at 80% of lifetime

    if (age < fadeStartTick) {
      return 1.0
    }

    const fadeProgress =
      (age - fadeStartTick) / (this.timeoutTicks - fadeStartTick)
    return Math.max(0.3, 1.0 - fadeProgress)
  }

  getPulse(currentTick: number): number {
    const age = this.getAge(currentTick)
    const pulseSpeed = 0.1 // How fast it pulses
    return 0.9 + 0.1 * Math.sin(age * pulseSpeed)
  }

  // Serialization
  serialize() {
    return {
      ...super.serialize(),
      spawnTick: this.spawnTick,
      timeoutTicks: this.timeoutTicks,
    }
  }

  static deserialize(data: any): Apple {
    const apple = new Apple(
      data.id,
      Vector2D.deserialize(data.position),
      data.timeoutTicks,
    )
    apple.spawnTick = data.spawnTick
    return apple
  }
}
