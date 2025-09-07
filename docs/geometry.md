# 📐 Geometry System

Clockwork Engine provides a comprehensive 2D geometry system built around vectors, mathematical operations, and spatial interfaces. The geometry system forms the foundation for positioning, movement, collision detection, and spatial calculations throughout the engine.

## Overview

The geometry system centers around the `Vector2D` class and supporting utilities that provide deterministic mathematical operations. All geometric calculations are designed to be consistent across platforms and maintain the engine's deterministic behavior.

## Core Components

### Vector2D Class

The fundamental 2D vector implementation with comprehensive mathematical operations:

```typescript
class Vector2D {
  constructor(public x: number = 0, public y: number = 0) {}
  
  // Mathematical operations
  add(other: Vector2D): Vector2D
  subtract(other: Vector2D): Vector2D
  multiply(scalar: number): Vector2D
  divide(scalar: number): Vector2D
  
  // Vector analysis
  magnitude(): number
  normalize(): Vector2D
  distance(other: Vector2D): number
  dot(other: Vector2D): number
  
  // Utility methods
  equals(other: Vector2D): boolean
  clone(): Vector2D
  toString(): string
}
```

### IPositionable Interface

Standard interface for objects that exist in 2D space:

```typescript
interface IPositionable {
  getPosition(): Vector2D
  getSize(): Vector2D
}
```

### GeometryUtils

Static utility functions for common geometric calculations:

```typescript
class GeometryUtils {
  static distance(a: Vector2D, b: Vector2D): number
  static angle(a: Vector2D, b: Vector2D): number
  static lineIntersection(line1: Line, line2: Line): Vector2D | null
  static pointInCircle(point: Vector2D, center: Vector2D, radius: number): boolean
  static pointInRectangle(point: Vector2D, rect: Rectangle): boolean
}
```

## Vector2D Operations

### Basic Arithmetic

```typescript
const v1 = new Vector2D(10, 5)
const v2 = new Vector2D(3, 7)

// Vector addition
const sum = v1.add(v2) // Vector2D(13, 12)

// Vector subtraction
const diff = v1.subtract(v2) // Vector2D(7, -2)

// Scalar multiplication
const scaled = v1.multiply(2) // Vector2D(20, 10)

// Scalar division
const divided = v1.divide(2) // Vector2D(5, 2.5)
```

### Vector Analysis

```typescript
const vector = new Vector2D(3, 4)

// Magnitude (length)
const length = vector.magnitude() // 5.0

// Normalized vector (unit vector)
const unit = vector.normalize() // Vector2D(0.6, 0.8)

// Distance between vectors
const distance = v1.distance(v2) // Distance between points

// Dot product
const dotProduct = v1.dot(v2) // Scalar projection
```

### Practical Applications

#### Movement and Physics

```typescript
class MovingObject {
  private position: Vector2D
  private velocity: Vector2D
  private acceleration: Vector2D
  
  constructor(startPosition: Vector2D) {
    this.position = startPosition
    this.velocity = new Vector2D(0, 0)
    this.acceleration = new Vector2D(0, 0)
  }
  
  update(deltaFrames: number): void {
    // Apply acceleration to velocity
    this.velocity = this.velocity.add(this.acceleration.multiply(deltaFrames))
    
    // Apply velocity to position
    this.position = this.position.add(this.velocity.multiply(deltaFrames))
    
    // Apply drag/friction
    this.velocity = this.velocity.multiply(0.98)
  }
  
  applyForce(force: Vector2D): void {
    this.acceleration = this.acceleration.add(force)
  }
}
```

#### Direction and Aiming

```typescript
class AimingSystem {
  static calculateDirection(from: Vector2D, to: Vector2D): Vector2D {
    return to.subtract(from).normalize()
  }
  
  static calculateAngle(direction: Vector2D): number {
    return Math.atan2(direction.y, direction.x)
  }
  
  static aimAt(shooter: Vector2D, target: Vector2D, bulletSpeed: number): Vector2D {
    const direction = this.calculateDirection(shooter, target)
    return direction.multiply(bulletSpeed)
  }
}

// Usage
class Player {
  shootAt(targetPosition: Vector2D): void {
    const direction = AimingSystem.calculateDirection(this.position, targetPosition)
    const bulletVelocity = direction.multiply(400) // 400 units/second
    
    const bullet = new Bullet(this.position, bulletVelocity)
  }
}
```

#### Circular Motion

```typescript
class CircularMotion {
  constructor(
    private center: Vector2D,
    private radius: number,
    private angularSpeed: number // radians per frame
  ) {}
  
  getPositionAtTime(totalFrames: number): Vector2D {
    const angle = this.angularSpeed * totalFrames
    const x = this.center.x + Math.cos(angle) * this.radius
    const y = this.center.y + Math.sin(angle) * this.radius
    return new Vector2D(x, y)
  }
}

// Usage in a satellite object
class Satellite extends GameObject {
  private orbit: CircularMotion
  
  constructor(id: string, center: Vector2D, radius: number) {
    const startPos = new Vector2D(center.x + radius, center.y)
    super(id, startPos, new Vector2D(10, 10))
    
    this.orbit = new CircularMotion(center, radius, 0.02) // Slow orbit
  }
  
  update(deltaFrames: number, totalFrames: number): void {
    const newPosition = this.orbit.getPositionAtTime(totalFrames)
    this.setPosition(newPosition)
  }
}
```

## GeometryUtils Examples

### Line Intersection

```typescript
interface Line {
  start: Vector2D
  end: Vector2D
}

class LaserSystem {
  castRay(start: Vector2D, direction: Vector2D, maxDistance: number): Vector2D[] {
    const end = start.add(direction.normalize().multiply(maxDistance))
    const ray: Line = { start, end }
    
    const intersections: Vector2D[] = []
    
    // Check intersection with all walls
    for (const wall of this.walls) {
      const intersection = GeometryUtils.lineIntersection(ray, wall)
      if (intersection) {
        intersections.push(intersection)
      }
    }
    
    return intersections.sort((a, b) => start.distance(a) - start.distance(b))
  }
}
```

### Collision Detection Helpers

```typescript
class CollisionDetection {
  static circleToCircle(
    pos1: Vector2D, radius1: number,
    pos2: Vector2D, radius2: number
  ): boolean {
    const distance = pos1.distance(pos2)
    return distance < radius1 + radius2
  }
  
  static pointInCircle(point: Vector2D, center: Vector2D, radius: number): boolean {
    return point.distance(center) <= radius
  }
  
  static rectangleToRectangle(rect1: Rectangle, rect2: Rectangle): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y
  }
}

interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}
```

### Field of View Calculations

```typescript
class FieldOfView {
  static isInFOV(
    observer: Vector2D,
    observerFacing: Vector2D,
    target: Vector2D,
    fovAngle: number // in radians
  ): boolean {
    const toTarget = target.subtract(observer).normalize()
    const facingDirection = observerFacing.normalize()
    
    // Calculate angle between facing direction and target
    const dotProduct = facingDirection.dot(toTarget)
    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)))
    
    return angle <= fovAngle / 2
  }
  
  static getVisibleTargets(
    observer: Vector2D,
    facing: Vector2D,
    targets: Vector2D[],
    fovAngle: number,
    maxRange: number
  ): Vector2D[] {
    return targets.filter(target => {
      const distance = observer.distance(target)
      const inRange = distance <= maxRange
      const inFOV = this.isInFOV(observer, facing, target, fovAngle)
      return inRange && inFOV
    })
  }
}
```

## Advanced Geometric Operations

### Bezier Curves

```typescript
class BezierCurve {
  constructor(
    private p0: Vector2D,
    private p1: Vector2D,
    private p2: Vector2D,
    private p3: Vector2D
  ) {}
  
  getPoint(t: number): Vector2D {
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    const t2 = t * t
    const t3 = t2 * t
    
    const x = mt3 * this.p0.x + 3 * mt2 * t * this.p1.x + 3 * mt * t2 * this.p2.x + t3 * this.p3.x
    const y = mt3 * this.p0.y + 3 * mt2 * t * this.p1.y + 3 * mt * t2 * this.p2.y + t3 * this.p3.y
    
    return new Vector2D(x, y)
  }
  
  getLength(segments = 100): number {
    let length = 0
    let prevPoint = this.getPoint(0)
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments
      const point = this.getPoint(t)
      length += prevPoint.distance(point)
      prevPoint = point
    }
    
    return length
  }
}

// Usage for smooth enemy movement
class CurvedMovement {
  constructor(
    private curve: BezierCurve,
    private duration: number // frames
  ) {}
  
  getPositionAtFrame(frame: number): Vector2D {
    const t = Math.min(1, frame / this.duration)
    return this.curve.getPoint(t)
  }
}
```

### Polygon Operations

```typescript
class Polygon {
  constructor(private vertices: Vector2D[]) {}
  
  contains(point: Vector2D): boolean {
    let inside = false
    const n = this.vertices.length
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const vi = this.vertices[i]
      const vj = this.vertices[j]
      
      if (((vi.y > point.y) !== (vj.y > point.y)) &&
          (point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x)) {
        inside = !inside
      }
    }
    
    return inside
  }
  
  getCenter(): Vector2D {
    let sumX = 0
    let sumY = 0
    
    for (const vertex of this.vertices) {
      sumX += vertex.x
      sumY += vertex.y
    }
    
    return new Vector2D(sumX / this.vertices.length, sumY / this.vertices.length)
  }
  
  getBounds(): { min: Vector2D, max: Vector2D } {
    if (this.vertices.length === 0) {
      return { min: new Vector2D(0, 0), max: new Vector2D(0, 0) }
    }
    
    let minX = this.vertices[0].x
    let minY = this.vertices[0].y
    let maxX = this.vertices[0].x
    let maxY = this.vertices[0].y
    
    for (const vertex of this.vertices) {
      minX = Math.min(minX, vertex.x)
      minY = Math.min(minY, vertex.y)
      maxX = Math.max(maxX, vertex.x)
      maxY = Math.max(maxY, vertex.y)
    }
    
    return {
      min: new Vector2D(minX, minY),
      max: new Vector2D(maxX, maxY)
    }
  }
}
```

## Spatial Queries

### Grid-Based Spatial Partitioning

```typescript
class SpatialGrid {
  private grid: Map<string, Vector2D[]> = new Map()
  
  constructor(
    private cellSize: number,
    private worldWidth: number,
    private worldHeight: number
  ) {}
  
  insert(point: Vector2D): void {
    const cellKey = this.getCellKey(point)
    
    if (!this.grid.has(cellKey)) {
      this.grid.set(cellKey, [])
    }
    
    this.grid.get(cellKey)!.push(point)
  }
  
  query(center: Vector2D, radius: number): Vector2D[] {
    const result: Vector2D[] = []
    const minCell = this.getCellCoords(new Vector2D(center.x - radius, center.y - radius))
    const maxCell = this.getCellCoords(new Vector2D(center.x + radius, center.y + radius))
    
    for (let x = minCell.x; x <= maxCell.x; x++) {
      for (let y = minCell.y; y <= maxCell.y; y++) {
        const cellKey = `${x},${y}`
        const cellPoints = this.grid.get(cellKey) || []
        
        for (const point of cellPoints) {
          if (center.distance(point) <= radius) {
            result.push(point)
          }
        }
      }
    }
    
    return result
  }
  
  private getCellKey(point: Vector2D): string {
    const coords = this.getCellCoords(point)
    return `${coords.x},${coords.y}`
  }
  
  private getCellCoords(point: Vector2D): { x: number, y: number } {
    return {
      x: Math.floor(point.x / this.cellSize),
      y: Math.floor(point.y / this.cellSize)
    }
  }
}
```

## Performance Considerations

### Vector Operations Optimization

```typescript
class OptimizedVector2D extends Vector2D {
  // Pre-allocated objects to reduce garbage collection
  private static tempVector = new Vector2D()
  
  static addTo(a: Vector2D, b: Vector2D, result: Vector2D): Vector2D {
    result.x = a.x + b.x
    result.y = a.y + b.y
    return result
  }
  
  static fastDistance(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  static fastDistanceSquared(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return dx * dx + dy * dy
  }
}
```

### Collision Detection Optimization

```typescript
class FastCollisionDetection {
  // Use squared distance to avoid expensive sqrt operations
  static circleToCircleFast(
    pos1: Vector2D, radius1: number,
    pos2: Vector2D, radius2: number
  ): boolean {
    const distanceSquared = OptimizedVector2D.fastDistanceSquared(pos1, pos2)
    const radiusSum = radius1 + radius2
    return distanceSquared < radiusSum * radiusSum
  }
  
  // Early rejection using bounding boxes
  static rectangleToRectangleWithEarlyReject(
    rect1: Rectangle, 
    rect2: Rectangle
  ): boolean {
    // Quick AABB test
    if (rect1.x + rect1.width < rect2.x || rect2.x + rect2.width < rect1.x) {
      return false
    }
    if (rect1.y + rect1.height < rect2.y || rect2.y + rect2.height < rect1.y) {
      return false
    }
    return true
  }
}
```

## Best Practices

### 1. Use Immutable Operations

```typescript
// GOOD - Immutable operations
const newPosition = currentPosition.add(velocity.multiply(deltaFrames))
object.setPosition(newPosition)

// AVOID - Mutating vectors directly
currentPosition.x += velocity.x * deltaFrames
currentPosition.y += velocity.y * deltaFrames
```

### 2. Cache Expensive Calculations

```typescript
class OptimizedGameObject extends GameObject {
  private cachedDistance: number = -1
  private lastCacheFrame: number = -1
  
  getDistanceToPlayer(player: GameObject, currentFrame: number): number {
    if (this.lastCacheFrame !== currentFrame) {
      this.cachedDistance = this.getPosition().distance(player.getPosition())
      this.lastCacheFrame = currentFrame
    }
    return this.cachedDistance
  }
}
```

### 3. Use Appropriate Precision

```typescript
// For gameplay logic, use reasonable precision
class Movement {
  static snapToGrid(position: Vector2D, gridSize: number): Vector2D {
    return new Vector2D(
      Math.round(position.x / gridSize) * gridSize,
      Math.round(position.y / gridSize) * gridSize
    )
  }
  
  static equals(a: Vector2D, b: Vector2D, epsilon = 0.001): boolean {
    return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon
  }
}
```

### 4. Optimize for Common Cases

```typescript
class QuickMath {
  // Fast operations for common cases
  static moveToward(from: Vector2D, to: Vector2D, maxDistance: number): Vector2D {
    const direction = to.subtract(from)
    const distance = direction.magnitude()
    
    if (distance <= maxDistance) {
      return to // Already close enough
    }
    
    return from.add(direction.divide(distance).multiply(maxDistance))
  }
  
  static isZero(vector: Vector2D, epsilon = 0.001): boolean {
    return Math.abs(vector.x) < epsilon && Math.abs(vector.y) < epsilon
  }
}
```

### 5. Document Coordinate Systems

```typescript
/**
 * Coordinate System:
 * - Origin (0,0) is at top-left
 * - X increases to the right
 * - Y increases downward
 * - All measurements in pixels
 * - Rotation in radians, 0 = facing right
 */
class CoordinateSystem {
  static screenToWorld(screenPos: Vector2D, camera: Camera): Vector2D {
    return screenPos.add(camera.position).subtract(camera.offset)
  }
  
  static worldToScreen(worldPos: Vector2D, camera: Camera): Vector2D {
    return worldPos.subtract(camera.position).add(camera.offset)
  }
}
```

The geometry system provides the mathematical foundation for all spatial operations in Clockwork Engine. By understanding vectors, spatial interfaces, and geometric utilities, you can create complex movement patterns, collision detection, and spatial queries while maintaining the engine's deterministic behavior.