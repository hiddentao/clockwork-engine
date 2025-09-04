import type { GameObject } from "./GameObject"
import type { IGameLoop } from "./IGameLoop"

/**
 * A group/collection manager for GameObjects
 */
export class GameObjectGroup<T extends GameObject = GameObject>
  implements IGameLoop
{
  private gameObjects: Map<string, T> = new Map()

  /**
   * Add a GameObject to the group
   * @param gameObject The GameObject to add
   * @returns The same GameObject that was added
   */
  public add(gameObject: T): T {
    this.gameObjects.set(gameObject.getId(), gameObject)
    return gameObject
  }

  /**
   * Remove a GameObject from the group
   * @param gameObject The GameObject to remove
   * @returns True if the GameObject was removed, false if it wasn't in the group
   */
  public remove(gameObject: T): boolean {
    return this.gameObjects.delete(gameObject.getId())
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
   * Get all non-destroyed GameObjects
   * @returns Array of non-destroyed GameObjects
   */
  public getAll(): T[] {
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
    return this.getAll().length
  }

  /**
   * Clear all GameObjects from the group
   */
  public clear(): void {
    this.gameObjects.clear()
  }

  /**
   * Remove all destroyed GameObjects from the group
   * @returns Number of destroyed GameObjects that were removed
   */
  public clearDestroyed(): number {
    let removedCount = 0
    for (const [id, gameObject] of this.gameObjects) {
      if (gameObject.isDestroyed()) {
        this.gameObjects.delete(id)
        removedCount++
      }
    }
    return removedCount
  }

  /**
   * Update all GameObjects in the group
   * @param deltaFrames Number of frames since last update
   * @param totalFrames Total number of frames processed since start
   */
  public update(deltaFrames: number, _totalFrames: number): void {
    for (const gameObject of this.gameObjects.values()) {
      if (!gameObject.isDestroyed()) {
        gameObject.update(deltaFrames)
      }
    }
  }
}
