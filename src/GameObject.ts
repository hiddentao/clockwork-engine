import { EventEmitter } from "./EventEmitter"
import type { ICollisionSource } from "./geometry/CollisionUtils"
import type { IPositionable } from "./geometry/IPositionable"
import { Vector2D } from "./geometry/Vector2D"

// Forward declaration to avoid circular dependency
export interface GameEngineInterface {
  registerGameObject(gameObject: GameObject): void
}

export interface SerializedGameObject {
  position: {
    x: number
    y: number
  }
  size: {
    x: number
    y: number
  }
  velocity: {
    x: number
    y: number
  }
  rotation: number
  health: number
  maxHealth: number
  isDestroyed: boolean
}

/**
 * Base events that all GameObjects can emit
 * All events include the GameObject instance as the first parameter
 */
export interface GameObjectEvents
  extends Record<string, (...args: any[]) => void> {
  positionChanged: (
    gameObject: GameObject,
    oldPosition: Vector2D,
    newPosition: Vector2D,
  ) => void
  healthChanged: (
    gameObject: GameObject,
    health: number,
    maxHealth: number,
  ) => void
  destroyed: (gameObject: GameObject) => void
}

export abstract class GameObject<T extends GameObjectEvents = GameObjectEvents>
  extends EventEmitter<T>
  implements IPositionable, ICollisionSource
{
  public static debug = false

  protected id: string
  protected position: Vector2D
  protected size: Vector2D
  protected velocity: Vector2D
  protected rotation: number
  protected health: number
  protected maxHealth: number
  protected destroyed: boolean
  private engine?: GameEngineInterface

  constructor(
    id: string,
    position: Vector2D,
    size: Vector2D,
    health = 0,
    engine?: GameEngineInterface,
  ) {
    super()
    this.id = id
    this.position = position
    this.size = size
    this.velocity = new Vector2D(0, 0)
    this.rotation = 0
    this.health = health
    this.maxHealth = health
    this.destroyed = false
    this.engine = engine

    // Auto-register with engine if provided
    if (engine) {
      engine.registerGameObject(this)
    }

    if (GameObject.debug) {
      // debug: creation log
    }
  }

  public update(deltaFrames: number): void {
    // Move object based on velocity
    const movement = this.velocity.scale(deltaFrames)
    this.position = this.position.add(movement)
  }

  public getPosition(): Vector2D {
    return this.position
  }

  public setPosition(position: Vector2D): void {
    const oldPosition = this.position
    this.position = position
    ;(this.emit as any)("positionChanged", this, oldPosition, position)
  }

  public getSize(): Vector2D {
    return this.size
  }

  public setSize(size: Vector2D): void {
    this.size = size
  }

  public getVelocity(): Vector2D {
    return this.velocity
  }

  public setVelocity(velocity: Vector2D): void {
    this.velocity = velocity
  }

  public getRotation(): number {
    return this.rotation
  }

  public setRotation(rotation: number): void {
    this.rotation = rotation
  }

  public getHealth(): number {
    return this.health
  }

  public getMaxHealth(): number {
    return this.maxHealth
  }

  public setMaxHealth(maxHealth: number): void {
    this.maxHealth = maxHealth
  }

  public setHealth(health: number): void {
    const oldHealth = this.health
    this.health = Math.max(0, Math.min(this.maxHealth, health))
    if (this.health !== oldHealth) {
      ;(this.emit as any)("healthChanged", this, this.health, this.maxHealth)
    }
    if (this.health === 0) {
      this.destroyed = true
      ;(this.emit as any)("destroyed", this)
    }
  }

  public takeDamage(amount: number): void {
    const oldHealth = this.health
    this.health = Math.max(0, this.health - amount)
    if (this.health !== oldHealth) {
      ;(this.emit as any)("healthChanged", this, this.health, this.maxHealth)
    }
    if (this.health === 0) {
      this.destroyed = true
      ;(this.emit as any)("destroyed", this)
    }
  }

  public heal(amount: number): void {
    const oldHealth = this.health
    this.health = Math.min(this.maxHealth, this.health + amount)
    if (this.health !== oldHealth) {
      ;(this.emit as any)("healthChanged", this, this.health, this.maxHealth)
    }
  }

  public isDestroyed(): boolean {
    return this.destroyed
  }

  public destroy(): void {
    this.destroyed = true
    if (GameObject.debug) {
      // debug: destroy log
    }
    ;(this.emit as any)("destroyed", this)
  }

  /**
   * Get the unique identifier for this game object
   * @returns The unique ID of this game object
   */
  public getId(): string {
    return this.id
  }

  /**
   * Get the type of this game object
   * @returns The type identifier of this game object
   */
  public abstract getType(): string

  /**
   * Get the engine this GameObject is registered with
   * @returns The game engine instance, or undefined if not registered
   */
  public getEngine(): GameEngineInterface | undefined {
    return this.engine
  }

  /**
   * Register this GameObject with an engine
   * @param engine The engine to register with
   */
  public registerWithEngine(engine: GameEngineInterface): void {
    this.engine = engine
    engine.registerGameObject(this)
  }

  /**
   * Get the collision source identifier for this game object
   * @returns The collision source ID of this game object
   */
  public getCollisionSourceId(): string {
    return this.getId()
  }

  public serialize(): SerializedGameObject {
    return {
      position: {
        x: this.position.x,
        y: this.position.y,
      },
      size: {
        x: this.size.x,
        y: this.size.y,
      },
      velocity: {
        x: this.velocity.x,
        y: this.velocity.y,
      },
      rotation: this.rotation,
      health: this.health,
      maxHealth: this.maxHealth,
      isDestroyed: this.destroyed,
    }
  }
  public static deserialize(_data: any): GameObject {
    throw new Error("GameObject.deserialize must be implemented by subclasses")
  }
}
