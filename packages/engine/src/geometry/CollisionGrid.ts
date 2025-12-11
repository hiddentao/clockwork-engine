import { EventEmitter } from "../EventEmitter"
import type { ICollisionSource } from "./ICollisionSource"
import type { Vector2D } from "./Vector2D"

/**
 * Events emitted by CollisionGrid
 */
export enum CollisionGridEventType {
  POINTS_CHANGED = "pointsChanged",
}

export interface CollisionGridEvents
  extends Record<string, (...args: any[]) => void> {
  [CollisionGridEventType.POINTS_CHANGED]: () => void
}

/**
 * CollisionGrid uses direct coordinate mapping for extremely fast collision detection
 */
export class CollisionGrid extends EventEmitter<CollisionGridEvents> {
  protected gridMap: Map<string, ICollisionSource[]> = new Map()
  protected sourceMap: Map<string, Set<string>> = new Map()

  constructor() {
    super()
  }

  public add(point: Vector2D, source: ICollisionSource): boolean {
    const key = this.getKey(point)
    const sourceId = source.getCollisionSourceId()

    // Check if already exists
    const existing = this.gridMap.get(key) || []
    for (const existingSource of existing) {
      if (existingSource.getCollisionSourceId() === sourceId) {
        return false
      }
    }

    // Add to grid
    if (!this.gridMap.has(key)) {
      this.gridMap.set(key, [])
    }
    this.gridMap.get(key)!.push(source)

    // Update source index
    if (!this.sourceMap.has(sourceId)) {
      this.sourceMap.set(sourceId, new Set())
    }
    this.sourceMap.get(sourceId)!.add(key)

    this.emit(CollisionGridEventType.POINTS_CHANGED)
    return true
  }

  public remove(point: Vector2D, source: ICollisionSource): boolean {
    const key = this.getKey(point)
    const sources = this.gridMap.get(key)
    if (!sources) return false

    const sourceId = source.getCollisionSourceId()
    const initialLength = sources.length

    for (let i = sources.length - 1; i >= 0; i--) {
      if (sources[i].getCollisionSourceId() === sourceId) {
        sources.splice(i, 1)
        break
      }
    }

    if (sources.length === 0) {
      this.gridMap.delete(key)
    }

    const sourceCoords = this.sourceMap.get(sourceId)
    if (sourceCoords) {
      sourceCoords.delete(key)
      if (sourceCoords.size === 0) {
        this.sourceMap.delete(sourceId)
      }
    }

    const removed = sources.length < initialLength
    if (removed) {
      this.emit(CollisionGridEventType.POINTS_CHANGED)
    }
    return removed
  }

  public removeSource(source: ICollisionSource): boolean {
    const sourceId = source.getCollisionSourceId()
    const coords = this.sourceMap.get(sourceId)
    if (!coords || coords.size === 0) return false

    for (const key of coords) {
      const sources = this.gridMap.get(key)
      if (sources) {
        const filtered = sources.filter(
          (s) => s.getCollisionSourceId() !== sourceId,
        )
        if (filtered.length === 0) {
          this.gridMap.delete(key)
        } else {
          this.gridMap.set(key, filtered)
        }
      }
    }

    this.sourceMap.delete(sourceId)
    this.emit(CollisionGridEventType.POINTS_CHANGED)
    return true
  }

  public containsPoint(point: Vector2D): ICollisionSource[] {
    const key = this.getKey(point)
    return this.gridMap.get(key) || []
  }

  public clear(): void {
    this.gridMap.clear()
    this.sourceMap.clear()
    this.emit(CollisionGridEventType.POINTS_CHANGED)
  }

  private getKey(point: Vector2D): string {
    return `${point.x},${point.y}`
  }
}
