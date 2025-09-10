# 🏃‍♂️ Collision Detection

Clockwork Engine provides a high-performance spatial partitioning system for collision detection through the `CollisionBspTree` class. This system uses a quadtree-like binary space partitioning (BSP) structure to efficiently organize and query collision points in 2D space.

## Overview

The collision detection system is designed around the concept of **collision points** rather than traditional bounding boxes or shapes. This approach provides exceptional performance for point-based collision queries while maintaining simplicity and deterministic behavior.

## How It Works

### Spatial Partitioning Structure

The system uses a recursive tree structure where each node represents a rectangular region of 2D space:

```
Root Node (entire world)
├── Quadrant 1 (top-left)
│   ├── Sub-quadrant 1a
│   └── Sub-quadrant 1b
├── Quadrant 2 (top-right)
├── Quadrant 3 (bottom-left)
└── Quadrant 4 (bottom-right)
```

### Point-Based Collision Model

Instead of complex shape collision, the system focuses on **collision points**:
- Each object can register multiple collision points
- Points are associated with their source objects
- Queries return all collision sources at a given point

### Dynamic Tree Management

The tree automatically rebuilds as objects move:
- Adding/removing points triggers tree reconstruction
- Batch operations can defer rebuilding for performance
- Point indices maintain O(1) lookup for removals

## Key Concepts

### Collision Points

A collision point represents a specific coordinate associated with a collision source:

```typescript
interface CollisionPoint {
  point: Vector2D        // 2D coordinates
  source: ICollisionSource  // Object that owns this point
}
```

### Collision Sources

Any object can be a collision source by implementing the `ICollisionSource` interface:

```typescript
interface ICollisionSource {
  getCollisionSourceId(): string  // Unique identifier
}
```

### Tree Configuration

The tree behavior is controlled by constants:
- `MAX_POINTS_PER_NODE`: Maximum points before subdivision
- `MAX_TREE_DEPTH`: Maximum recursion depth to prevent infinite subdivision

### Batch Operations

For performance, you can batch multiple operations:
```typescript
tree.beginBatch()
// Multiple add/remove operations
tree.endBatch() // Triggers single rebuild
```

## CollisionBspTree API

### Adding and Removing Points

```typescript
const tree = new CollisionBspTree()

// Add a collision point
tree.add(new Vector2D(100, 150), myGameObject)

// Remove a specific point
tree.remove(new Vector2D(100, 150), myGameObject)

// Remove all points from a source
tree.removeSource(myGameObject)

// Replace all points for a source
tree.setAll([point1, point2, point3], myGameObject)
```

### Querying Collisions

```typescript
// Check what's at a specific point
const sources = tree.containsPoint(new Vector2D(100, 150))
if (sources.length > 0) {
  console.log(`Found ${sources.length} collision sources`)
}

// Get all points in the tree
const allPoints = tree.getAll()

// Get points from a specific source
const myPoints = tree.getBySource(myGameObject)
```

### Tree Management

```typescript
// Get current point count
console.log(`Tree contains ${tree.size()} points`)

// Clear all points
tree.clear()

// Batch operations for performance
tree.beginBatch()
for (const point of manyPoints) {
  tree.add(point, source)
}
tree.endBatch() // Single rebuild instead of many
```

### Event System

The tree emits events when points change:

```typescript
tree.on('pointsChanged', () => {
  console.log('Tree structure updated')
  // Update UI, recalculate pathfinding, etc.
})
```

## Code Examples

### Basic GameObject Integration

```typescript
class Bullet extends GameObject {
  constructor(id: string, position: Vector2D, velocity: Vector2D) {
    super(id, position, new Vector2D(2, 2), 1)
    this.setVelocity(velocity)
    
    // Register collision point with tree
    const engine = this.getEngine()
    if (engine) {
      engine.getCollisionTree().add(this.getPosition(), this)
    }
  }
  
  update(deltaFrames: number): void {
    const oldPosition = this.getPosition()
    super.update(deltaFrames) // Updates position
    const newPosition = this.getPosition()
    
    const engine = this.getEngine()
    if (engine && !oldPosition.equals(newPosition)) {
      const tree = engine.getCollisionTree()
      // Update collision point
      tree.remove(oldPosition, this)
      tree.add(newPosition, this)
    }
  }
  
  destroy(): void {
    // Clean up collision point
    const engine = this.getEngine()
    if (engine) {
      engine.getCollisionTree().removeSource(this)
    }
    super.destroy()
  }
}
```

### Multi-Point Collision Objects

```typescript
class Tank extends GameObject {
  private collisionPoints: Vector2D[] = []
  
  constructor(id: string, position: Vector2D) {
    super(id, position, new Vector2D(40, 40), 100)
    this.updateCollisionPoints()
    this.registerCollisionPoints()
  }
  
  private updateCollisionPoints(): void {
    const pos = this.getPosition()
    const size = this.getSize()
    
    // Create collision points around the tank's perimeter
    this.collisionPoints = [
      new Vector2D(pos.x - size.x/2, pos.y - size.y/2), // Top-left
      new Vector2D(pos.x + size.x/2, pos.y - size.y/2), // Top-right  
      new Vector2D(pos.x - size.x/2, pos.y + size.y/2), // Bottom-left
      new Vector2D(pos.x + size.x/2, pos.y + size.y/2), // Bottom-right
      new Vector2D(pos.x, pos.y)                        // Center
    ]
  }
  
  private registerCollisionPoints(): void {
    const engine = this.getEngine()
    if (engine) {
      const tree = engine.getCollisionTree()
      tree.setAll(this.collisionPoints, this)
    }
  }
  
  setPosition(position: Vector2D): void {
    super.setPosition(position)
    this.updateCollisionPoints()
    this.registerCollisionPoints()
  }
}
```

### Efficient Collision System

```typescript
class CollisionManager {
  constructor(private engine: GameEngine) {}
  
  checkBulletCollisions(): void {
    const bulletGroup = this.engine.getGameObjectGroup<Bullet>("Bullet")
    const tree = this.engine.getCollisionTree()
    
    if (!bulletGroup) return
    
    for (const bullet of bulletGroup.getAllActive()) {
      const colliders = tree.containsPoint(bullet.getPosition())
      
      for (const collider of colliders) {
        // Skip self-collision
        if (collider.getCollisionSourceId() === bullet.getId()) continue
        
        // Check if it's a valid target
        if (this.isValidTarget(bullet, collider)) {
          this.handleCollision(bullet, collider)
        }
      }
    }
  }
  
  private isValidTarget(bullet: Bullet, target: ICollisionSource): boolean {
    // Example: bullets don't hit other bullets
    if (target instanceof Bullet) return false
    
    // Example: friendly fire check
    const bulletOwner = bullet.getOwner()
    if (bulletOwner && target instanceof GameObject) {
      return bulletOwner !== target.getOwner()
    }
    
    return true
  }
  
  private handleCollision(bullet: Bullet, target: ICollisionSource): void {
    if (target instanceof GameObject) {
      target.takeDamage(bullet.getDamage())
    }
    bullet.destroy()
  }
}
```

### Batch Operations for Performance

```typescript
class BulletSystem {
  private bullets: Bullet[] = []
  private tree: CollisionBspTree
  
  constructor(tree: CollisionBspTree) {
    this.tree = tree
  }
  
  updateAllBullets(deltaFrames: number): void {
    // Batch collision updates for better performance
    this.tree.beginBatch()
    
    try {
      for (const bullet of this.bullets) {
        if (!bullet.isDestroyed()) {
          const oldPos = bullet.getPosition()
          bullet.update(deltaFrames)
          const newPos = bullet.getPosition()
          
          // Update collision position
          this.tree.remove(oldPos, bullet)
          this.tree.add(newPos, bullet)
        }
      }
    } finally {
      // Always end batch, even if errors occur
      this.tree.endBatch()
    }
    
    // Clean up destroyed bullets
    this.bullets = this.bullets.filter(bullet => {
      if (bullet.isDestroyed()) {
        this.tree.removeSource(bullet)
        return false
      }
      return true
    })
  }
}
```

### Area-Based Queries

```typescript
class AreaEffectSpell {
  constructor(
    private center: Vector2D,
    private radius: number,
    private tree: CollisionBspTree
  ) {}
  
  getAffectedTargets(): ICollisionSource[] {
    const affected: ICollisionSource[] = []
    const visited = new Set<string>()
    
    // Sample points in a circle around the effect center
    const samples = this.generateCircleSamples(this.center, this.radius, 16)
    
    for (const samplePoint of samples) {
      const sources = this.tree.containsPoint(samplePoint)
      
      for (const source of sources) {
        const id = source.getCollisionSourceId()
        if (!visited.has(id)) {
          visited.add(id)
          affected.push(source)
        }
      }
    }
    
    return affected
  }
  
  private generateCircleSamples(center: Vector2D, radius: number, count: number): Vector2D[] {
    const points: Vector2D[] = []
    const angleStep = (2 * Math.PI) / count
    
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      points.push(new Vector2D(x, y))
    }
    
    return points
  }
}
```

## Edge Cases and Gotchas

### Moving Object Synchronization

**Issue**: Objects that move between frames may leave "ghost" collision points.

**Solution**: Always update collision points when position changes:

```typescript
class MovingObject extends GameObject {
  setPosition(position: Vector2D): void {
    const oldPosition = this.getPosition()
    super.setPosition(position)
    
    // Update collision tree
    const tree = this.getEngine()?.getCollisionTree()
    if (tree) {
      tree.remove(oldPosition, this)
      tree.add(position, this)
    }
  }
}
```

### Batch Operation Error Handling

**Issue**: Errors during batch operations can leave tree in inconsistent state.

**Solution**: Always use try/finally blocks:

```typescript
tree.beginBatch()
try {
  // Batch operations
} finally {
  tree.endBatch() // Always complete the batch
}
```

### Performance with Dense Point Clusters

**Issue**: Many points in the same location can degrade performance.

**Solution**: Consider using a single representative point or grid-based collision:

```typescript
class DenseAreaManager {
  private gridSize = 10
  
  addObjectToGrid(obj: GameObject): void {
    // Snap to grid to reduce point density
    const pos = obj.getPosition()
    const gridX = Math.floor(pos.x / this.gridSize) * this.gridSize
    const gridY = Math.floor(pos.y / this.gridSize) * this.gridSize
    const gridPos = new Vector2D(gridX, gridY)
    
    tree.add(gridPos, obj)
  }
}
```

### Memory Leaks with Destroyed Objects

**Issue**: Destroyed objects may remain in collision tree.

**Solution**: Ensure cleanup in destroy methods:

```typescript
class GameObject {
  destroy(): void {
    // Always clean up collision points
    this.getEngine()?.getCollisionTree().removeSource(this)
    super.destroy()
  }
}
```

### Tree Depth Limitations

**Issue**: Objects clustered in small areas may exceed maximum tree depth.

**Solution**: Adjust constants or implement custom subdivision logic:

```typescript
// In constants.ts
export const COLLISION_CONSTANTS = {
  MAX_POINTS_PER_NODE: 10,  // Increase for denser areas
  MAX_TREE_DEPTH: 8         // Increase for more subdivision
}
```

## Performance Considerations

### Tree Rebuilding Cost

Frequent tree rebuilding can impact performance. Consider:

```typescript
// BAD - Rebuilds tree for each point
for (const point of manyPoints) {
  tree.add(point, source)
}

// GOOD - Single rebuild for all points
tree.beginBatch()
for (const point of manyPoints) {
  tree.add(point, source)
}
tree.endBatch()
```

### Query Optimization

For frequent queries, cache results when possible:

```typescript
class CachedCollisionManager {
  private queryCache = new Map<string, ICollisionSource[]>()
  private cacheValidFrame = -1
  
  getCachedCollisions(point: Vector2D, currentFrame: number): ICollisionSource[] {
    if (this.cacheValidFrame !== currentFrame) {
      this.queryCache.clear()
      this.cacheValidFrame = currentFrame
    }
    
    const key = `${point.x},${point.y}`
    if (!this.queryCache.has(key)) {
      this.queryCache.set(key, this.tree.containsPoint(point))
    }
    
    return this.queryCache.get(key)!
  }
}
```

### Memory Usage

Monitor tree size and implement cleanup strategies:

```typescript
class CollisionTreeMonitor {
  checkTreeHealth(tree: CollisionBspTree): void {
    const pointCount = tree.size()
    
    if (pointCount > 50000) {
      console.warn(`Large collision tree: ${pointCount} points`)
      // Consider implementing spatial limits or object culling
    }
  }
  
  periodicCleanup(tree: CollisionBspTree): void {
    // Rebuild tree occasionally to optimize structure
    const allPoints = tree.getAll()
    tree.clear()
    
    tree.beginBatch()
    for (const collisionPoint of allPoints) {
      tree.add(collisionPoint.point, collisionPoint.source)
    }
    tree.endBatch()
  }
}
```

### Spatial Locality

Organize collision checks to take advantage of spatial locality:

```typescript
class SpatiallyOptimizedCollision {
  checkCollisionsByRegion(objects: GameObject[]): void {
    // Sort objects by position for better cache locality
    objects.sort((a, b) => {
      const posA = a.getPosition()
      const posB = b.getPosition()
      return (posA.x + posA.y * 1000) - (posB.x + posB.y * 1000)
    })
    
    // Process objects in spatial order
    for (const obj of objects) {
      this.checkCollisionsForObject(obj)
    }
  }
}
```

## Best Practices

### 1. Minimize Collision Point Count

```typescript
// GOOD - Strategic point placement
class Enemy extends GameObject {
  registerCollisionPoints(): void {
    // Only register essential collision points
    const center = this.getPosition()
    tree.add(center, this)
  }
}

// AVOID - Excessive collision points
class OverComplexEnemy extends GameObject {
  registerCollisionPoints(): void {
    // Don't create unnecessary detail
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        tree.add(this.getPosition().add(new Vector2D(x, y)), this)
      }
    }
  }
}
```

### 2. Use Batch Operations

```typescript
// GOOD - Batch multiple operations
class LevelLoader {
  loadLevel(levelData: LevelData): void {
    const tree = this.engine.getCollisionTree()
    tree.beginBatch()
    
    for (const objectData of levelData.objects) {
      const obj = this.createObject(objectData)
      tree.add(obj.getPosition(), obj)
    }
    
    tree.endBatch()
  }
}
```

### 3. Clean Up Properly

```typescript
// GOOD - Comprehensive cleanup
class GameObject {
  destroy(): void {
    // Remove from collision tree first
    this.getEngine()?.getCollisionTree().removeSource(this)
    
    // Then handle other cleanup
    this.removeAllEventListeners()
    
    super.destroy()
  }
}
```

### 4. Handle Edge Cases

```typescript
// GOOD - Defensive collision checking
class CollisionManager {
  checkCollision(obj: GameObject): void {
    const tree = this.engine.getCollisionTree()
    if (!tree || obj.isDestroyed()) return
    
    const sources = tree.containsPoint(obj.getPosition())
    for (const source of sources) {
      if (this.isValidCollision(obj, source)) {
        this.handleCollision(obj, source)
      }
    }
  }
  
  private isValidCollision(obj1: GameObject, obj2: ICollisionSource): boolean {
    // Comprehensive validation
    return obj1.getId() !== obj2.getCollisionSourceId() &&
           !obj1.isDestroyed() &&
           (!(obj2 instanceof GameObject) || !obj2.isDestroyed())
  }
}
```

### 5. Monitor Performance

```typescript
// GOOD - Performance monitoring
class PerformanceMonitor {
  monitorCollisionPerformance(): void {
    const startTime = performance.now()
    
    this.collisionManager.checkAllCollisions()
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    if (duration > 16) { // More than one frame at 60fps
      console.warn(`Collision detection took ${duration.toFixed(2)}ms`)
    }
  }
}
```

The collision detection system provides efficient, deterministic spatial queries that scale well with game complexity. By understanding its architecture and following best practices, you can build games with smooth collision detection even with thousands of interactive objects.