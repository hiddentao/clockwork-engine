import { EventEmitter } from "../EventEmitter"
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
  private root: SpatialNode | null = null
  private readonly maxPointsPerNode = 10
  private readonly maxDepth = 8
  private deferRebuild = false
  private needsRebuild = false

  constructor(initialPoints: CollisionPoint[] = []) {
    super()
    this.points = [...initialPoints]
    if (initialPoints.length > 0) {
      this.rebuildTree()
    }
  }

  /**
   * Begin batch mode - defer tree rebuilding until endBatch() is called
   */
  public beginBatch(): void {
    this.deferRebuild = true
  }

  /**
   * End batch mode - rebuild tree if needed and emit events
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
   * Add a point to the collision grid
   */
  public add(point: Vector2D, source: ICollisionSource): void {
    // console.log(`add point`, point.x, point.y, source.getCollisionSourceId())
    this.points.push({ point, source })
    if (this.deferRebuild) {
      this.needsRebuild = true
    } else {
      this.rebuildTree()
      this.emit("pointsChanged")
    }
  }

  /**
   * Remove a point from the collision grid
   */
  public remove(point: Vector2D, source: ICollisionSource): boolean {
    const index = this.points.findIndex(
      (cp) =>
        cp.point.x === point.x &&
        cp.point.y === point.y &&
        cp.source.getCollisionSourceId() === source.getCollisionSourceId(),
    )
    if (index !== -1) {
      this.points.splice(index, 1)
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
    // console.log(`set all points`, source.getCollisionSourceId())
    this.points = points.map((point) => ({ point, source }))
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
    // console.log(`removed source`, source.getCollisionSourceId())
    const sourceId = source.getCollisionSourceId()
    const initialLength = this.points.length

    // Remove all points from the main points array
    this.points = this.points.filter(
      (cp) => cp.source.getCollisionSourceId() !== sourceId,
    )

    const removed = this.points.length !== initialLength

    if (removed) {
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
