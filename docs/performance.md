# Performance Optimization Guide

Clockwork is designed for high-performance browser-based games. This guide covers optimization strategies and performance considerations.

## Performance Goals

* **Game loop**: < 16ms per frame (60 FPS)
* **Platform overhead**: < 5% vs direct PIXI.js
* **Collision detection**: 1000+ objects at 60 FPS
* **Serialization**: < 1ms for typical game states

## Profiling

### Built-in Performance Utilities

Use [`performance.ts`](https://github.com/hiddentao/clockwork-engine/blob/main/src/lib/performance.ts) helpers:

```typescript
import { measureTime } from '@hiddentao/clockwork-engine'

const time = measureTime(() => {
  // Operation to measure
})

console.log(`Took ${time}ms`)
```

### Browser DevTools

Profile with Chrome/Firefox DevTools:

1. Open DevTools → Performance tab
2. Start recording
3. Play game for 10-30 seconds
4. Stop recording
5. Analyze flame graph for hot paths

Look for:
* Game loop bottlenecks
* Excessive allocations
* Long-running frame callbacks

## Optimization Strategies

### Game Loop Efficiency

**Avoid loops unless necessary**:

```typescript
// Bad - O(n²) nested loops
for (const objA of objects) {
  for (const objB of objects) {
    checkCollision(objA, objB)
  }
}

// Good - Use CollisionGrid for O(n) spatial queries
grid.clear()
for (const obj of objects) {
  grid.insert(obj.id, obj.x, obj.y, obj.radius)
}

for (const obj of objects) {
  const nearby = grid.getNearby(obj.x, obj.y, obj.radius * 2)
  for (const other of nearby) {
    checkCollision(obj, other)
  }
}
```

See [`CollisionGrid`](https://github.com/hiddentao/clockwork-engine/blob/main/src/geometry/CollisionGrid.ts) for spatial optimization.

**Use early returns**:

```typescript
update(deltaTicks: number): void {
  if (this.state !== GameState.PLAYING) {
    return // Skip expensive processing
  }

  // Game logic...
}
```

### Rendering Optimization

**Only repaint when needed**:

```typescript
update(deltaTicks: number): void {
  const oldPosition = this.position

  // Update logic...
  this.position = newPosition

  // Only mark for repaint if actually changed
  if (oldPosition.x !== this.position.x || oldPosition.y !== this.position.y) {
    this.isRepaintNeeded = true
  }
}
```

**Update transforms instead of recreating**:

```typescript
// Bad - destroys and recreates node
updateNode(node: DisplayNode, obj: GameObject): void {
  node.destroy()
  return this.create(obj) // Expensive!
}

// Good - updates existing node properties
repaintNode(node: DisplayNode, obj: GameObject): void {
  node.setPosition(obj.position.x, obj.position.y)
  node.setRotation(obj.rotation)
  // Fast property updates
}
```

See [AbstractRenderer](https://github.com/hiddentao/clockwork-engine/blob/main/src/rendering/AbstractRenderer.ts) patterns.

### Memory Management

**Reuse objects instead of allocating**:

```typescript
// Bad - creates new Vector2D every frame
update(): void {
  const velocity = new Vector2D(this.vx, this.vy)
  this.position = this.position.add(velocity)
}

// Good - reuse instance
update(): void {
  this.position.x += this.vx
  this.position.y += this.vy
}
```

**Pool frequently-allocated objects**:

```typescript
class BulletPool {
  private pool: Bullet[] = []

  acquire(): Bullet {
    return this.pool.pop() || new Bullet()
  }

  release(bullet: Bullet): void {
    bullet.reset()
    this.pool.push(bullet)
  }
}
```

### Collision Detection

**Use appropriate cell sizes**:

```typescript
// Cell size should be ~2x typical object size
const cellSize = avgObjectRadius * 2

const grid = new CollisionGrid(
  worldWidth,
  worldHeight,
  cellSize
)
```

**Update grid efficiently**:

```typescript
// Bad - clear and rebuild every frame
update(): void {
  grid.clear()
  for (const obj of objects) {
    grid.insert(obj.id, obj.x, obj.y, obj.radius)
  }
}

// Good - update only changed positions
update(): void {
  for (const obj of objects) {
    if (obj.positionChanged) {
      grid.update(obj.id, obj.x, obj.y)
    }
  }
}
```

### Serialization

**Register types once**:

```typescript
// Do this once at startup
Serializer.registerType('Vector2D', Vector2D)
Serializer.registerType('MyGameObject', MyGameObject)

// Not every frame!
```

**Minimize serialized data**:

```typescript
// Bad - serializes everything
serialize(): SerializedData {
  return Serializer.serialize(this)
}

// Good - serialize only necessary state
serialize(): SerializedData {
  return Serializer.serialize({
    id: this.id,
    position: this.position,
    health: this.health,
    // Omit derived/temporary data
  })
}
```

## Platform Layer Performance

Platform abstraction adds minimal overhead:

* DisplayNode wrapper: ~0.1% memory increase
* Method calls: Inlined by JIT, zero overhead
* State tracking: Only in Memory platform (headless)

Measured overhead: **< 2%** vs direct PIXI.js

Benchmarks: [tests/benchmarks/platform-overhead.bench.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/benchmarks/platform-overhead.bench.ts)

## Common Bottlenecks

### GameObject Updates

**Problem**: Hundreds of objects calling `update()` each frame

**Solution**: Group related objects, process in batches

```typescript
// Instead of 100 individual GameObjects
class BulletSwarm extends GameObject {
  bullets: Array<{ x: number, y: number, vx: number, vy: number }> = []

  update(): void {
    // Single update call for all bullets
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx
      bullet.y += bullet.vy
    }
  }
}
```

### Rendering Many Objects

**Problem**: Rendering 1000+ sprites individually

**Solution**: Use sprite batching, minimize draw calls

PIXI.js handles batching automatically. Ensure:
* Use same texture atlas for similar sprites
* Minimize state changes (blend modes, shaders)
* Group static objects separately from dynamic

### Excessive Allocations

**Problem**: Creating objects in hot paths

**Solution**: Profile with DevTools Memory tab, add object pools

Look for:
* Array allocations in loops
* Temporary Vector2D instances
* String concatenation in game loop

## Performance Benchmarks

Run benchmarks to establish baselines:

```bash
bun run tests/benchmarks/run-all.ts
```

Generates `tests/benchmarks/RESULTS.md` with:
* Platform overhead measurements
* Collision detection performance
* Serialization speed
* Operations per second

Compare against baselines to detect regressions.

## Monitoring Production

**Frame time tracking**:

```typescript
class PerformanceMonitor {
  private frameTimes: number[] = []

  recordFrame(time: number): void {
    this.frameTimes.push(time)
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift()
    }
  }

  getAverageFrameTime(): number {
    const sum = this.frameTimes.reduce((a, b) => a + b, 0)
    return sum / this.frameTimes.length
  }
}
```

**Slow frame detection**:

```typescript
const FRAME_BUDGET = 16 // 60 FPS target

if (frameTime > FRAME_BUDGET) {
  console.warn(`Slow frame: ${frameTime}ms (budget: ${FRAME_BUDGET}ms)`)
}
```

## Advanced Optimization

### Web Workers

For CPU-intensive tasks:
* Pathfinding
* AI decision trees
* Physics simulation

Clockwork core runs on main thread (for rendering), but custom game logic can offload work.

### WebAssembly

For performance-critical algorithms:
* Complex collision detection
* Physics engines
* Procedural generation

Interface via JavaScript, keep game loop in JS.

### Lazy Evaluation

Defer expensive calculations until needed:

```typescript
class ExpensiveData {
  private _cache: Result | null = null

  get result(): Result {
    if (!this._cache) {
      this._cache = this.calculateExpensiveResult()
    }
    return this._cache
  }

  invalidate(): void {
    this._cache = null
  }
}
```

## Related Documentation

* [Engine Guide](./engine.md) - Core architecture and patterns
* [Testing Guide](./testing.md) - Performance testing strategies
* [Benchmarks README](https://github.com/hiddentao/clockwork-engine/blob/main/tests/benchmarks/README.md) - Running and interpreting benchmarks
