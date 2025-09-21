import { EventEmitter } from "./EventEmitter"
import type { ICollisionSource } from "./geometry/ICollisionSource"
import type { IPositionable } from "./geometry/IPositionable"
import { Vector2D } from "./geometry/Vector2D"

// Forward declaration to avoid circular dependency
export interface GameEngineInterface {
  registerGameObject(gameObject: GameObject): void
  getTotalTicks(): number
}

export enum GameObjectEventType {
  POSITION_CHANGED = "positionChanged",
  HEALTH_CHANGED = "healthChanged",
  MAX_HEALTH_CHANGED = "maxHealthChanged",
  DESTROYED = "destroyed",
  SIZE_CHANGED = "sizeChanged",
  VELOCITY_CHANGED = "velocityChanged",
  ROTATION_CHANGED = "rotationChanged",
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
  [GameObjectEventType.POSITION_CHANGED]: (
    gameObject: GameObject,
    oldPosition: Vector2D,
    newPosition: Vector2D,
  ) => void
  [GameObjectEventType.HEALTH_CHANGED]: (
    gameObject: GameObject,
    health: number,
    maxHealth: number,
  ) => void
  [GameObjectEventType.MAX_HEALTH_CHANGED]: (
    gameObject: GameObject,
    oldMaxHealth: number,
    newMaxHealth: number,
  ) => void
  [GameObjectEventType.DESTROYED]: (gameObject: GameObject) => void
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
  protected engine?: GameEngineInterface
  private isRepaintNeeded: boolean = true

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

  public update(deltaTicks: number, _totalTicks: number): void {
    if (this.destroyed) {
      return
    }

    // Move object based on velocity
    const movement = this.velocity.scale(deltaTicks)
    const oldPosition = this.position
    this.position = this.position.add(movement)
    if (
      oldPosition.x !== this.position.x ||
      oldPosition.y !== this.position.y
    ) {
      this.isRepaintNeeded = true
    }
  }

  public getPosition(): Vector2D {
    return this.position
  }

  public setPosition(position: Vector2D): void {
    const oldPosition = this.position
    this.position = position
    if (oldPosition.x !== position.x || oldPosition.y !== position.y) {
      this.isRepaintNeeded = true
    }
    ;(this.emit as any)(
      GameObjectEventType.POSITION_CHANGED,
      this,
      oldPosition,
      position,
    )
  }

  public getSize(): Vector2D {
    return this.size
  }

  public setSize(size: Vector2D): void {
    if (this.size.x !== size.x || this.size.y !== size.y) {
      this.size = size
      this.isRepaintNeeded = true
    }
  }

  public getVelocity(): Vector2D {
    return this.velocity
  }

  public setVelocity(velocity: Vector2D): void {
    if (this.velocity.x !== velocity.x || this.velocity.y !== velocity.y) {
      this.velocity = velocity
      this.isRepaintNeeded = true
    }
  }

  public getRotation(): number {
    return this.rotation
  }

  public setRotation(rotation: number): void {
    if (this.rotation !== rotation) {
      this.rotation = rotation
      this.isRepaintNeeded = true
    }
  }

  public getHealth(): number {
    return this.health
  }

  public getMaxHealth(): number {
    return this.maxHealth
  }

  public setMaxHealth(maxHealth: number): void {
    const oldMaxHealth = this.maxHealth
    this.maxHealth = maxHealth
    if (this.maxHealth !== oldMaxHealth) {
      this.isRepaintNeeded = true
      ;(this.emit as any)(
        GameObjectEventType.MAX_HEALTH_CHANGED,
        this,
        oldMaxHealth,
        maxHealth,
      )
    }
  }

  public setHealth(health: number): void {
    const oldHealth = this.health
    this.health = Math.max(0, Math.min(this.maxHealth, health))
    if (this.health !== oldHealth) {
      this.isRepaintNeeded = true
      ;(this.emit as any)(
        GameObjectEventType.HEALTH_CHANGED,
        this,
        this.health,
        this.maxHealth,
      )
    }
    if (this.health === 0) {
      this.destroyed = true
      ;(this.emit as any)(GameObjectEventType.DESTROYED, this)
    }
  }

  public takeDamage(amount: number): void {
    const oldHealth = this.health
    this.health = Math.max(0, this.health - amount)
    if (this.health !== oldHealth) {
      this.isRepaintNeeded = true
      ;(this.emit as any)(
        GameObjectEventType.HEALTH_CHANGED,
        this,
        this.health,
        this.maxHealth,
      )
    }
    if (this.health === 0) {
      this.destroyed = true
      ;(this.emit as any)(GameObjectEventType.DESTROYED, this)
    }
  }

  public heal(amount: number): void {
    const oldHealth = this.health
    this.health = Math.min(this.maxHealth, this.health + amount)
    if (this.health !== oldHealth) {
      this.isRepaintNeeded = true
      ;(this.emit as any)(
        GameObjectEventType.HEALTH_CHANGED,
        this,
        this.health,
        this.maxHealth,
      )
    }
  }

  public isDestroyed(): boolean {
    return this.destroyed
  }

  public destroy(): void {
    this.destroyed = true
    this.isRepaintNeeded = true
    if (GameObject.debug) {
      // debug: destroy log
    }
    ;(this.emit as any)(GameObjectEventType.DESTROYED, this)
  }

  /**
   * Get the repaint flag for this game object
   * @returns Whether the object needs to be repainted
   */
  public get needsRepaint(): boolean {
    return this.isRepaintNeeded
  }

  /**
   * Set the repaint flag for this game object
   * @param value Whether the object needs to be repainted
   */
  public set needsRepaint(value: boolean) {
    this.isRepaintNeeded = value
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
