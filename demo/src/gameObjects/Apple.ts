import type { GameEngineInterface } from "clockwork"
import { GameObject, Vector2D } from "clockwork"

export class Apple extends GameObject {
  private spawnFrame: number
  private timeoutFrames: number

  constructor(
    id: string,
    position: Vector2D,
    timeoutFrames: number = 500,
    engine?: GameEngineInterface,
  ) {
    super(id, position, new Vector2D(1, 1), 1, engine)
    this.timeoutFrames = timeoutFrames
    this.spawnFrame = 0 // Will be set by the game engine
  }

  getType(): string {
    return "Apple"
  }

  setSpawnFrame(frame: number): void {
    this.spawnFrame = frame
  }

  isExpired(currentFrame: number): boolean {
    return currentFrame - this.spawnFrame >= this.timeoutFrames
  }

  getAge(currentFrame: number): number {
    return currentFrame - this.spawnFrame
  }

  getRemainingTime(currentFrame: number): number {
    return Math.max(0, this.timeoutFrames - (currentFrame - this.spawnFrame))
  }

  // Visual properties for rendering
  getAlpha(currentFrame: number): number {
    const age = this.getAge(currentFrame)
    const fadeStartFrame = this.timeoutFrames * 0.8 // Start fading at 80% of lifetime

    if (age < fadeStartFrame) {
      return 1.0
    }

    const fadeProgress =
      (age - fadeStartFrame) / (this.timeoutFrames - fadeStartFrame)
    return Math.max(0.3, 1.0 - fadeProgress)
  }

  getPulse(currentFrame: number): number {
    const age = this.getAge(currentFrame)
    const pulseSpeed = 0.1 // How fast it pulses
    return 0.9 + 0.1 * Math.sin(age * pulseSpeed)
  }

  // Serialization
  serialize() {
    return {
      ...super.serialize(),
      spawnFrame: this.spawnFrame,
      timeoutFrames: this.timeoutFrames,
    }
  }

  static deserialize(data: any): Apple {
    const apple = new Apple(
      data.id,
      Vector2D.deserialize(data.position),
      data.timeoutFrames,
    )
    apple.spawnFrame = data.spawnFrame
    return apple
  }
}
