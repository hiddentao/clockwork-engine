import { EventEmitter } from "./EventEmitter"
import type { GameObject } from "./GameObject"
import type { IGameLoop } from "./IGameLoop"

export enum GameObjectGroupEventType {
  ITEM_ADDED = "itemAdded",
  ITEM_REMOVED = "itemRemoved",
  LIST_CLEARED = "listCleared",
  DESTROYED_ITEMS_CLEARED = "destroyedItemsCleared",
}

export interface GameObjectGroupEvents
  extends Record<string, (...args: any[]) => void> {
  [GameObjectGroupEventType.ITEM_ADDED]: (gameObject: GameObject) => void
  [GameObjectGroupEventType.ITEM_REMOVED]: (gameObjectId: string) => void
  [GameObjectGroupEventType.LIST_CLEARED]: () => void
  [GameObjectGroupEventType.DESTROYED_ITEMS_CLEARED]: (
    gameObjects: GameObject[],
  ) => void
}

/**
 * A group/collection manager for GameObjects
 */
export class GameObjectGroup<T extends GameObject = GameObject>
  extends EventEmitter<GameObjectGroupEvents>
  implements IGameLoop
{
  protected gameObjects: Map<string, T> = new Map()

  constructor() {
    super()
  }

  /**
   * Add a GameObject to the group
   * @param gameObject The GameObject to add
   * @returns The same GameObject that was added
   */
  public add(gameObject: T): T {
    const id = gameObject.getId()
    const isNew = !this.gameObjects.has(id)
    this.gameObjects.set(id, gameObject)
    if (isNew) {
      this.emit(GameObjectGroupEventType.ITEM_ADDED, gameObject)
    }
    return gameObject
  }

  /**
   * Remove a GameObject from the group
   * @param gameObject The GameObject to remove
   * @returns True if the GameObject was removed, false if it wasn't in the group
   */
  public remove(gameObject: T): boolean {
    const gameObjectId = gameObject.getId()
    const wasRemoved = this.gameObjects.delete(gameObjectId)
    if (wasRemoved) {
      this.emit(GameObjectGroupEventType.ITEM_REMOVED, gameObjectId)
    }
    return wasRemoved
  }

  /**
   * Check if a GameObject is in the group
   * @param gameObject The GameObject to check for
   * @returns True if the GameObject is in the group
   */
  public has(gameObject: T): boolean {
    return this.gameObjects.has(gameObject.getId())
  }

  /**
   * Check if a GameObject with the given ID is in the group
   * @param id The ID to check for
   * @returns True if a GameObject with this ID is in the group
   */
  public hasId(id: string): boolean {
    return this.gameObjects.has(id)
  }

  /**
   * Get a GameObject by its ID
   * @param id The ID of the GameObject to retrieve
   * @returns The GameObject with the given ID, or undefined if not found
   */
  public getById(id: string): T | undefined {
    return this.gameObjects.get(id)
  }

  /**
   * Get all active (non-destroyed) GameObjects
   * @returns Array of active GameObjects
   */
  public getAllActive(): T[] {
    return Array.from(this.gameObjects.values()).filter(
      (obj) => !obj.isDestroyed(),
    )
  }

  /**
   * Get the number of GameObjects in the group
   * @returns Total count of GameObjects (including destroyed ones)
   */
  public size(): number {
    return this.gameObjects.size
  }

  /**
   * Get the number of active (non-destroyed) GameObjects
   * @returns Count of non-destroyed GameObjects
   */
  public activeSize(): number {
    return this.getAllActive().length
  }

  /**
   * Clear all GameObjects from the group
   */
  public clear(): void {
    this.gameObjects.clear()
    this.emit(GameObjectGroupEventType.LIST_CLEARED)
  }

  /**
   * Destroy all active GameObjects and then clear the group
   */
  public clearAndDestroy(): void {
    for (const gameObject of this.gameObjects.values()) {
      if (!gameObject.isDestroyed()) {
        gameObject.destroy()
      }
    }
    this.clear()
  }

  /**
   * Remove all destroyed GameObjects from the group
   * @returns Number of destroyed GameObjects that were removed
   */
  public clearDestroyed(): number {
    const destroyedObjects: T[] = []
    for (const [id, gameObject] of this.gameObjects) {
      if (gameObject.isDestroyed()) {
        destroyedObjects.push(gameObject)
        this.gameObjects.delete(id)
      }
    }
    if (destroyedObjects.length > 0) {
      this.emit(
        GameObjectGroupEventType.DESTROYED_ITEMS_CLEARED,
        destroyedObjects,
      )
    }
    return destroyedObjects.length
  }

  /**
   * Update all GameObjects in the group
   * @param deltaFrames Number of frames since last update
   * @param totalFrames Total number of frames processed since start
   */
  public update(deltaFrames: number, totalFrames: number): void {
    for (const gameObject of this.gameObjects.values()) {
      if (!gameObject.isDestroyed()) {
        gameObject.update(deltaFrames, totalFrames)
      }
    }
  }
}
