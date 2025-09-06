import type { GameEngineInterface } from "../../src/GameObject"
import { GameObject } from "../../src/GameObject"
import { Vector2D } from "../../src/geometry/Vector2D"

export type PowerUpType =
  | "health"
  | "damage"
  | "speed"
  | "shield"
  | "experience"

export class TestPowerUp extends GameObject {
  private powerType: PowerUpType
  private value: number
  private duration: number // For temporary effects
  private respawnTime: number
  private isActive: boolean = true
  private timeSincePickup: number = 0

  constructor(
    id: string,
    position: Vector2D,
    powerType: PowerUpType = "health",
    value = 50,
    duration = 0, // 0 = permanent effect
    respawnTime = 0, // 0 = no respawn
    engine?: GameEngineInterface,
  ) {
    super(id, position, new Vector2D(15, 15), 1, engine)
    this.powerType = powerType
    this.value = value
    this.duration = duration
    this.respawnTime = respawnTime
  }

  getType(): string {
    return "PowerUp"
  }

  update(deltaFrames: number): void {
    super.update(deltaFrames)

    // Handle respawn timer if power-up was picked up
    if (!this.isActive) {
      this.timeSincePickup += deltaFrames
      if (this.respawnTime > 0 && this.timeSincePickup >= this.respawnTime) {
        this.respawn()
      }
    }

    // Simple floating animation
    const time = Date.now() * 0.001
    const offset = Math.sin(time * 2) * 2
    this.setPosition(
      this.getPosition().add(new Vector2D(0, offset * deltaFrames * 0.1)),
    )
  }

  apply(target: GameObject): boolean {
    if (!this.isActive) {
      return false
    }

    let applied = false

    switch (this.powerType) {
      case "health":
        if (typeof target.heal === "function") {
          target.heal(this.value)
          applied = true
        } else if (typeof target.setHealth === "function") {
          const newHealth = Math.min(
            target.getHealth() + this.value,
            target.getMaxHealth(),
          )
          target.setHealth(newHealth)
          applied = true
        }
        break

      case "damage":
        if (typeof target.takeDamage === "function") {
          target.takeDamage(this.value)
          applied = true
        }
        break

      case "speed":
        if (typeof target.setVelocity === "function") {
          const currentVel = target.getVelocity()
          const newVel = currentVel.scale(this.value / 100) // value is percentage
          target.setVelocity(newVel)
          applied = true
        }
        break

      case "shield":
        if (typeof (target as any).setShield === "function") {
          ;(target as any).setShield(this.value)
          applied = true
        }
        break

      case "experience":
        if (typeof (target as any).gainExperience === "function") {
          ;(target as any).gainExperience(this.value)
          applied = true
        }
        break
    }

    if (applied) {
      this.pickup()
    }

    return applied
  }

  pickup(): void {
    this.isActive = false
    this.timeSincePickup = 0

    if (this.respawnTime === 0) {
      // No respawn, destroy the power-up
      this.destroy()
    } else {
      // Hide the power-up until respawn
      this.setSize(new Vector2D(0, 0))
    }
  }

  respawn(): void {
    this.isActive = true
    this.timeSincePickup = 0
    this.setSize(new Vector2D(15, 15))
  }

  getPowerType(): PowerUpType {
    return this.powerType
  }

  setValue(value: number): void {
    this.value = value
  }

  getValue(): number {
    return this.value
  }

  getDuration(): number {
    return this.duration
  }

  getRespawnTime(): number {
    return this.respawnTime
  }

  isAvailable(): boolean {
    return this.isActive
  }

  getTimeSincePickup(): number {
    return this.timeSincePickup
  }

  getTimeUntilRespawn(): number {
    if (this.isActive || this.respawnTime === 0) {
      return 0
    }
    return Math.max(0, this.respawnTime - this.timeSincePickup)
  }

  serialize() {
    return {
      ...super.serialize(),
      powerType: this.powerType,
      value: this.value,
      duration: this.duration,
      respawnTime: this.respawnTime,
      isActive: this.isActive,
      timeSincePickup: this.timeSincePickup,
    }
  }

  static deserialize(data: any): TestPowerUp {
    const powerUp = new TestPowerUp(
      data.id,
      Vector2D.deserialize(data.position),
      data.powerType,
      data.value,
      data.duration,
      data.respawnTime,
    )

    // Restore state
    powerUp.isActive = data.isActive
    powerUp.timeSincePickup = data.timeSincePickup

    // Restore base GameObject state
    powerUp.setHealth(data.health)
    if (data.destroyed) {
      powerUp.destroy()
    }

    // Restore size based on active state
    if (!powerUp.isActive && powerUp.respawnTime > 0) {
      powerUp.setSize(new Vector2D(0, 0))
    }

    return powerUp
  }

  // Test-specific methods
  forcePickup(): void {
    this.pickup()
  }

  forceRespawn(): void {
    this.respawn()
  }

  clone(newId: string): TestPowerUp {
    const clone = new TestPowerUp(
      newId,
      this.getPosition(),
      this.powerType,
      this.value,
      this.duration,
      this.respawnTime,
    )
    clone.isActive = this.isActive
    clone.timeSincePickup = this.timeSincePickup
    clone.setHealth(this.getHealth())
    return clone
  }

  // Static factory methods for common power-up types
  static createHealthPack(
    id: string,
    position: Vector2D,
    healAmount = 50,
  ): TestPowerUp {
    return new TestPowerUp(id, position, "health", healAmount)
  }

  static createDamageBoost(
    id: string,
    position: Vector2D,
    boostPercent = 150,
  ): TestPowerUp {
    return new TestPowerUp(id, position, "damage", boostPercent, 300) // 5 second boost at 60fps
  }

  static createSpeedBoost(
    id: string,
    position: Vector2D,
    speedPercent = 150,
  ): TestPowerUp {
    return new TestPowerUp(id, position, "speed", speedPercent, 180) // 3 second boost
  }

  static createRespawningHealth(
    id: string,
    position: Vector2D,
    respawnTime = 1800,
  ): TestPowerUp {
    return new TestPowerUp(id, position, "health", 75, 0, respawnTime) // 30 second respawn
  }
}
