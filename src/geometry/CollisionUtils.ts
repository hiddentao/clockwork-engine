import { EventEmitter } from "../EventEmitter"
import { COLLISION_CONSTANTS } from "../constants"
import type { Vector2D } from "./Vector2D"

/**
 * Interface for objects that can be collision sources
 */
export interface ICollisionSource {
  getCollisionSourceId(): string
}

/**
 * A point in space with an associated collision source
 */
export interface CollisionPoint {
  point: Vector2D
  source: ICollisionSource
}

/**
 * Events emitted by CollisionBspTree
 */
export interface CollisionBspEvents
  extends Record<string, (...args: any[]) => void> {
  pointsChanged: () => void
}

/**
 * A node in the spatial partitioning tree
 */
interface SpatialNode {
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  points: CollisionPoint[]
  children?: SpatialNode[]
  isLeaf: boolean
  // Hashtable for efficient point lookup in leaf nodes: "x,y" -> CollisionPoint[]
  pointMap?: Map<string, CollisionPoint[]>
}

/**
 * CollisionBspTree uses spatial partitioning (quadtree-like structure)
 * to efficiently detect collisions with a set of points
 */
export class CollisionBspTree extends EventEmitter<CollisionBspEvents> {
  private points: CollisionPoint[] = []
  private pointIndex: Map<string, number> = new Map() // Fast lookup for removal
  private root: SpatialNode | null = null
  private readonly maxPointsPerNode = COLLISION_CONSTANTS.MAX_POINTS_PER_NODE
  private readonly maxDepth = COLLISION_CONSTANTS.MAX_TREE_DEPTH
  private deferRebuild = false
  private needsRebuild = false

  constructor(initialPoints: CollisionPoint[] = []) {
    super()
    this.points = [...initialPoints]
    this.rebuildPointIndex()
    if (initialPoints.length > 0) {
      this.rebuildTree()
    }
  }

  /**
   * Begin batch mode to optimize multiple collision operations
   * Defers expensive tree rebuilding until endBatch() is called
   * Use for bulk add/remove operations to improve performance
   */
  public beginBatch(): void {
    this.deferRebuild = true
  }

  /**
   * End batch mode and apply deferred tree rebuilding
   * Rebuilds spatial tree if changes occurred during batch and emits events
   */
  public endBatch(): void {
    this.deferRebuild = false
    if (this.needsRebuild) {
      this.rebuildTree()
      this.needsRebuild = false
      this.emit("pointsChanged")
    }
  }

  /**
   * Add a collision point to the spatial partitioning tree
   * Updates internal index for O(1) removal operations
   * @param point 2D coordinates of the collision point
   * @param source Object that owns this collision point
   */
  public add(point: Vector2D, source: ICollisionSource): void {
    const collisionPoint = { point, source }
    const key = this.createCollisionPointKey(collisionPoint)
    this.pointIndex.set(key, this.points.length)
    this.points.push(collisionPoint)
    if (this.deferRebuild) {
      this.needsRebuild = true
    } else {
      this.rebuildTree()
      this.emit("pointsChanged")
    }
  }

  /**
   * Remove a specific collision point from the tree
   * Uses optimized lookup for O(1) performance
   * @param point 2D coordinates to remove
   * @param source Owner of the collision point
   * @returns True if point was found and removed, false otherwise
   */
  public remove(point: Vector2D, source: ICollisionSource): boolean {
    const key = this.createCollisionPointKey({ point, source })
    const index = this.pointIndex.get(key)

    if (index !== undefined && index < this.points.length) {
      // Remove from points array
      this.points.splice(index, 1)
      this.pointIndex.delete(key)

      // Update indices after removal
      this.rebuildPointIndex()

      if (this.deferRebuild) {
        this.needsRebuild = true
      } else {
        this.rebuildTree()
        this.emit("pointsChanged")
      }
      return true
    }
    return false
  }

  /**
   * Get all collision points in the collision grid
   */
  public getAll(): CollisionPoint[] {
    return [...this.points]
  }

  /**
   * Get all collision points in the collision grid for given source.
   */
  public getBySource(source: ICollisionSource): CollisionPoint[] {
    return this.points.filter(
      (p) => p.source.getCollisionSourceId() === source.getCollisionSourceId(),
    )
  }

  /**
   * Set all points in the collision grid (replaces existing points)
   */
  public setAll(points: Vector2D[], source: ICollisionSource): void {
    this.points = points.map((point) => ({ point, source }))
    this.rebuildPointIndex()
    if (this.deferRebuild) {
      this.needsRebuild = true
    } else {
      this.rebuildTree()
      this.emit("pointsChanged")
    }
  }

  /**
   * Remove all points associated with a specific collision source
   */
  public removeSource(source: ICollisionSource): boolean {
    const sourceId = source.getCollisionSourceId()
    const initialLength = this.points.length

    // Remove all points from the main points array
    this.points = this.points.filter(
      (cp) => cp.source.getCollisionSourceId() !== sourceId,
    )

    const removed = this.points.length !== initialLength

    if (removed) {
      this.rebuildPointIndex()
      if (this.deferRebuild) {
        this.needsRebuild = true
      } else {
        this.rebuildTree()
        this.emit("pointsChanged")
      }
    }

    return removed
  }

  /**
   * Check if a point collides with any point in the grid and return collision sources
   */
  public containsPoint(point: Vector2D): ICollisionSource[] {
    if (!this.root || this.points.length === 0) {
      return []
    }
    return this.searchNode(this.root, point)
  }

  /**
   * Get the number of points in the grid
   */
  public size(): number {
    return this.points.length
  }

  /**
   * Clear all points from the grid
   */
  public clear(): void {
    this.points = []
    this.pointIndex.clear()
    this.root = null
    this.emit("pointsChanged")
  }

  /**
   * Create a string key for hashtable lookup from point coordinates
   */
  private createPointKey(point: Vector2D): string {
    return `${point.x},${point.y}`
  }

  /**
   * Create a unique key for collision point including source ID for efficient lookups
   */
  private createCollisionPointKey(collisionPoint: CollisionPoint): string {
    return `${collisionPoint.point.x},${collisionPoint.point.y},${collisionPoint.source.getCollisionSourceId()}`
  }

  /**
   * Rebuild the point index map for fast lookups
   */
  private rebuildPointIndex(): void {
    this.pointIndex.clear()
    for (let i = 0; i < this.points.length; i++) {
      const key = this.createCollisionPointKey(this.points[i])
      this.pointIndex.set(key, i)
    }
  }

  /**
   * Rebuild the spatial partitioning tree
   */
  private rebuildTree(): void {
    if (this.points.length === 0) {
      this.root = null
      return
    }

    // Calculate bounds
    const bounds = this.calculateBounds(this.points)
    this.root = this.buildNode(this.points, bounds, 0)
  }

  /**
   * Calculate the bounding box for a set of collision points
   */
  private calculateBounds(points: CollisionPoint[]): SpatialNode["bounds"] {
    if (points.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }

    let minX = points[0].point.x
    let maxX = points[0].point.x
    let minY = points[0].point.y
    let maxY = points[0].point.y

    for (const collisionPoint of points) {
      minX = Math.min(minX, collisionPoint.point.x)
      maxX = Math.max(maxX, collisionPoint.point.x)
      minY = Math.min(minY, collisionPoint.point.y)
      maxY = Math.max(maxY, collisionPoint.point.y)
    }

    return { minX, maxX, minY, maxY }
  }

  /**
   * Build a spatial partitioning node
   */
  private buildNode(
    points: CollisionPoint[],
    bounds: SpatialNode["bounds"],
    depth: number,
  ): SpatialNode {
    const node: SpatialNode = {
      bounds,
      points: [...points],
      isLeaf: true,
    }

    // If we have few points or reached max depth, make this a leaf
    if (points.length <= this.maxPointsPerNode || depth >= this.maxDepth) {
      // Populate hashtable for efficient lookups in leaf nodes
      node.pointMap = new Map<string, CollisionPoint[]>()
      for (const collisionPoint of points) {
        const key = this.createPointKey(collisionPoint.point)
        const existing = node.pointMap.get(key)
        if (existing) {
          existing.push(collisionPoint)
        } else {
          node.pointMap.set(key, [collisionPoint])
        }
      }
      return node
    }

    // Split into quadrants
    const midX = (bounds.minX + bounds.maxX) / 2
    const midY = (bounds.minY + bounds.maxY) / 2

    const quadrants = [
      { minX: bounds.minX, maxX: midX, minY: bounds.minY, maxY: midY }, // Top-left
      { minX: midX, maxX: bounds.maxX, minY: bounds.minY, maxY: midY }, // Top-right
      { minX: bounds.minX, maxX: midX, minY: midY, maxY: bounds.maxY }, // Bottom-left
      { minX: midX, maxX: bounds.maxX, minY: midY, maxY: bounds.maxY }, // Bottom-right
    ]

    const children: SpatialNode[] = []
    let hasChildren = false

    for (const quadrantBounds of quadrants) {
      const quadrantPoints = points.filter(
        (cp) =>
          cp.point.x >= quadrantBounds.minX &&
          cp.point.x <= quadrantBounds.maxX &&
          cp.point.y >= quadrantBounds.minY &&
          cp.point.y <= quadrantBounds.maxY,
      )

      if (quadrantPoints.length > 0) {
        children.push(this.buildNode(quadrantPoints, quadrantBounds, depth + 1))
        hasChildren = true
      }
    }

    if (hasChildren) {
      node.children = children
      node.isLeaf = false
      node.points = [] // Clear points from non-leaf nodes to save memory
      node.pointMap = undefined // Clear hashtable from non-leaf nodes
    }

    return node
  }

  /**
   * Search for a point in a spatial node
   */
  private searchNode(node: SpatialNode, point: Vector2D): ICollisionSource[] {
    // Check if point is within node bounds
    if (
      point.x < node.bounds.minX ||
      point.x > node.bounds.maxX ||
      point.y < node.bounds.minY ||
      point.y > node.bounds.maxY
    ) {
      return []
    }

    if (node.isLeaf) {
      // Use hashtable for efficient point lookup in leaf nodes
      if (node.pointMap) {
        const key = this.createPointKey(point)
        const collisionPoints = node.pointMap.get(key)
        if (collisionPoints) {
          return collisionPoints.map((cp) => cp.source)
        }
        return []
      }

      // Fallback to linear search if hashtable is not available
      const sources: ICollisionSource[] = []
      for (const collisionPoint of node.points) {
        if (
          collisionPoint.point.x === point.x &&
          collisionPoint.point.y === point.y
        ) {
          sources.push(collisionPoint.source)
        }
      }
      return sources
    }

    // Search children and collect all collision sources
    const sources: ICollisionSource[] = []
    if (node.children) {
      for (const child of node.children) {
        sources.push(...this.searchNode(child, point))
      }
    }

    return sources
  }
}
