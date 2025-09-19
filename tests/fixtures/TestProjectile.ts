import type { GameEngineInterface } from "../../src/GameObject"
import { GameObject } from "../../src/GameObject"
import { Vector2D } from "../../src/geometry/Vector2D"

export class TestProjectile extends GameObject {
  private damage: number
  private lifespan: number
  private age: number = 0
  private ownerId: string
  private speed: number

  constructor(
    id: string,
    position: Vector2D,
    velocity: Vector2D,
    damage = 10,
    lifespan = 100,
    ownerId = "",
    engine?: GameEngineInterface,
  ) {
    super(id, position, new Vector2D(5, 5), 1, engine)
    this.damage = damage
    this.lifespan = lifespan
    this.age = 0
    this.ownerId = ownerId
    this.speed = velocity.length()
    this.setVelocity(velocity)
  }

  getType(): string {
    return "Projectile"
  }

  update(deltaTicks: number, totalTicks: number): void {
    super.update(deltaTicks, totalTicks)
    this.age += deltaTicks

    // Destroy projectile when it reaches lifespan
    if (this.age >= this.lifespan) {
      this.destroy()
    }

    // Check if projectile is out of bounds (simple bounds check)
    const pos = this.getPosition()
    if (pos.x < -100 || pos.x > 1000 || pos.y < -100 || pos.y > 1000) {
      this.destroy()
    }
  }

  getDamage(): number {
    return this.damage
  }

  setDamage(damage: number): void {
    this.damage = damage
  }

  getAge(): number {
    return this.age
  }

  getLifespan(): number {
    return this.lifespan
  }

  getOwnerId(): string {
    return this.ownerId
  }

  getSpeed(): number {
    return this.speed
  }

  setSpeed(speed: number): void {
    this.speed = speed
    const direction = this.getVelocity().normalize()
    this.setVelocity(direction.scale(speed))
  }

  onHit(target: GameObject): void {
    if (typeof target.takeDamage === "function") {
      target.takeDamage(this.damage)
    }
    this.destroy()
  }

  explode(radius: number = 50): void {
    // Simple explosion - in a real game this would affect nearby objects
    this.damage *= 2
    this.setSize(new Vector2D(radius, radius))

    // Schedule destruction after explosion effect
    setTimeout(() => {
      this.destroy()
    }, 100)
  }

  serialize() {
    return {
      ...super.serialize(),
      damage: this.damage,
      lifespan: this.lifespan,
      age: this.age,
      ownerId: this.ownerId,
      speed: this.speed,
    }
  }

  static deserialize(data: any): TestProjectile {
    const projectile = new TestProjectile(
      data.id,
      Vector2D.deserialize(data.position),
      Vector2D.deserialize(data.velocity),
      data.damage,
      data.lifespan,
      data.ownerId,
    )

    // Restore state
    projectile.age = data.age
    projectile.speed = data.speed

    // Restore base GameObject state
    projectile.setHealth(data.health)
    if (data.destroyed) {
      projectile.destroy()
    }

    return projectile
  }

  // Test-specific methods for verification
  isExpired(): boolean {
    return this.age >= this.lifespan
  }

  getRemainingLife(): number {
    return Math.max(0, this.lifespan - this.age)
  }

  clone(newId: string): TestProjectile {
    const clone = new TestProjectile(
      newId,
      this.getPosition(),
      this.getVelocity(),
      this.damage,
      this.lifespan,
      this.ownerId,
    )
    clone.age = this.age
    clone.setHealth(this.getHealth())
    return clone
  }
}
