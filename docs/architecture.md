# 🏗️ Architecture Overview

Clockwork Engine is designed around the principle of deterministic gameplay through frame-based updates and centralized state management. This document explains the high-level architecture, design patterns, and how the various systems work together to create a robust, reproducible game engine.

## Core Architecture Principles

### Deterministic by Design
Every aspect of the engine is built to produce identical results given the same inputs, enabling perfect recording and replay functionality.

### Frame-Based Timing
All updates use integer frame counts rather than wall-clock time, eliminating floating-point precision issues and timing variations.

### Event-Driven Communication
Systems communicate through a centralized event system, reducing coupling and enabling powerful recording/replay capabilities.

### Type-Safe Object Management
Game objects are automatically organized by type with compile-time safety and runtime validation.

### Universal Serialization
All game data can be serialized and restored exactly, supporting save/load systems and network synchronization.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   MyGame    │  │  Renderer   │  │   Input Handler     │  │
│  │  (extends   │  │  (Pixi.js)  │  │                     │  │
│  │GameEngine)  │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Clockwork Engine Core                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                GameEngine                           │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │    State    │ │   Update    │ │  Lifecycle  │   │   │
│  │  │ Management  │ │    Loop     │ │ Management  │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Core Systems                          │   │
│  │                                                     │   │
│  │ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐  │   │
│  │ │ GameEventM-  │ │   Timer      │ │    PRNG     │  │   │
│  │ │   anager     │ │   System     │ │   System    │  │   │
│  │ └──────────────┘ └──────────────┘ └─────────────┘  │   │
│  │                                                     │   │
│  │ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐  │   │
│  │ │ GameObject   │ │   Collision  │ │ Serializer  │  │   │
│  │ │   Groups     │ │     BSP      │ │             │  │   │
│  │ │              │ │    Tree      │ │             │  │   │
│  │ └──────────────┘ └──────────────┘ └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Recording & Replay                       │   │
│  │                                                     │   │
│  │ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐  │   │
│  │ │ GameRecorder │ │ ReplayManager│ │EventSources │  │   │
│  │ │              │ │              │ │             │  │   │
│  │ └──────────────┘ └──────────────┘ └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Relationships

### GameEngine (Central Hub)

The `GameEngine` class serves as the central coordinator for all systems:

```typescript
abstract class GameEngine {
  // State Management
  private state: GameState
  private totalFrames: number
  
  // Core Systems
  private eventManager: GameEventManager
  private timer: Timer
  private prng: PRNG
  private serializer: Serializer
  
  // Object Management
  private gameObjectGroups: Map<string, GameObjectGroup>
  
  // Collision System
  private collisionTree: CollisionBspTree
  
  // Recording System
  private recorder?: GameRecorder
}
```

### System Interactions

#### Frame Update Flow
1. **GameEngine.update()** orchestrates the frame
2. **GameEventManager** processes queued events
3. **Timer** executes scheduled callbacks
4. **GameObjectGroups** update all objects by type
5. Frame counter increments

#### Event Flow
1. **Input** → UserInputEventSource → GameEventManager
2. **Object Changes** → ObjectUpdateEvent → GameEventManager  
3. **Recording** ← GameRecorder ← GameEventManager
4. **Replay** → RecordedEventSource → GameEventManager

#### Object Lifecycle
1. **Creation** → Constructor registers with GameEngine
2. **Grouping** → Automatic type-based organization
3. **Updates** → GameObjectGroup.update() calls object.update()
4. **Destruction** → Object marked for cleanup
5. **Cleanup** → GameObjectGroup.clearDestroyed()

## Design Patterns

### Abstract Factory Pattern (GameObjects)

Objects self-register and are automatically grouped by type:

```typescript
class Player extends GameObject {
  constructor(id: string, position: Vector2D, engine: GameEngine) {
    super(id, position, size, health, engine)
    // Automatically registers with engine and joins "Player" group
  }
  
  getType(): string {
    return "Player" // Determines group membership
  }
}
```

### Observer Pattern (Events)

Event-driven communication throughout the system:

```typescript
// Publishers emit events
player.emit('healthChanged', player, newHealth, maxHealth)

// Subscribers listen for events
player.on('healthChanged', (player, health, maxHealth) => {
  ui.updateHealthBar(health / maxHealth)
})
```

### Strategy Pattern (Event Sources)

Pluggable event sources for different input modes:

```typescript
// Live gameplay
eventManager.setSource(new UserInputEventSource())

// Replay mode
eventManager.setSource(new RecordedEventSource(recording.events))

// AI control
eventManager.setSource(new AIEventSource())
```

### Command Pattern (Events)

Events encapsulate all information needed for execution:

```typescript
interface ObjectUpdateEvent {
  type: GameEventType.OBJECT_UPDATE
  frame: number
  objectType: string
  objectId: string  
  method: string
  params: any[] // Serialized parameters
}
```

### Template Method Pattern (Game Loop)

Fixed update order with customizable behavior:

```typescript
// GameEngine.update() - fixed structure
update(deltaFrames: number): void {
  this.totalFrames += deltaFrames
  this.eventManager.update(deltaFrames, this.totalFrames)
  this.timer.update(deltaFrames, this.totalFrames)
  
  // Customizable per-type updates
  for (const [type, group] of this.gameObjectGroups) {
    group.update(deltaFrames, this.totalFrames)
  }
}
```

### Flyweight Pattern (Object Grouping)

GameObjectGroups share common behavior across object instances:

```typescript
class GameObjectGroup<T extends GameObject> {
  update(deltaFrames: number, totalFrames: number): void {
    // Single update logic applied to all objects of this type
    for (const obj of this.getAllActive()) {
      obj.update(deltaFrames)
    }
  }
}
```

## Data Flow Architecture

### Input Processing Flow

```
User Input → DOM Events → InputHandler → UserInputEventSource 
    ↓
GameEventManager → processUserInput() → Game Logic
    ↓
Object Updates → GameObjectGroups → Individual Objects
```

### Recording Flow

```
Game Events → GameEventManager → GameRecorder
    ↓
Serialized Events → GameRecording → Storage/Network
```

### Replay Flow

```
GameRecording → RecordedEventSource → GameEventManager
    ↓
Event Processing → Deterministic Recreation → Identical Behavior
```

### Serialization Flow

```
Game Objects → serialize() → Serializer → JSON-safe Data
    ↓
Storage/Network → JSON → Deserializer → recreate() → Game Objects
```

## Memory Management

### Object Lifecycle Management

```typescript
class GameEngine {
  // Objects register themselves automatically
  registerGameObject(obj: GameObject): void {
    const group = this.getOrCreateGroup(obj.getType())
    group.add(obj)
  }
  
  // Periodic cleanup of destroyed objects
  cleanupObjects(): void {
    for (const [type, group] of this.gameObjectGroups) {
      group.clearDestroyed()
    }
  }
}
```

### Event System Memory Management

```typescript
class EventEmitter {
  // Automatic cleanup prevents memory leaks
  clearListeners(): void {
    for (const listeners of this.listeners.values()) {
      listeners.clear()
    }
  }
}
```

### Timer System Resource Management

```typescript
class Timer {
  // Timers are automatically cleaned up after execution
  update(deltaFrames: number, totalFrames: number): void {
    // Execute ready timers
    // Remove one-time timers
    // Reschedule repeating timers
  }
}
```

## Threading Model

### Single-Threaded Design

Clockwork Engine uses a single-threaded model for deterministic behavior:

- **Main Thread**: All game logic, updates, and rendering
- **No Workers**: Avoids threading synchronization issues
- **Deterministic Timing**: Frame-based updates ensure consistency

### Async Operations

When async operations are needed, they're integrated carefully:

```typescript
class AsyncGameSystem implements IGameLoop {
  private pendingOperations = new Map<number, Promise<any>>()
  
  async update(deltaFrames: number, totalFrames: number): Promise<void> {
    // Process completed async operations synchronously
    await this.processCompletedOperations()
    
    // Start new async operations for future frames
    this.startNewOperations(totalFrames)
  }
}
```

## Performance Architecture

### Spatial Partitioning

Collision detection uses BSP trees for O(log n) performance:

```typescript
class CollisionBspTree {
  // Spatial subdivision for efficient queries
  private root: SpatialNode
  
  // O(log n) point queries instead of O(n²) brute force
  containsPoint(point: Vector2D): ICollisionSource[] {
    return this.searchNode(this.root, point)
  }
}
```

### Object Pooling (Recommended Pattern)

For frequently created/destroyed objects:

```typescript
class BulletPool {
  private pool: Bullet[] = []
  private activeCount = 0
  
  getBullet(): Bullet {
    if (this.activeCount < this.pool.length) {
      return this.pool[this.activeCount++]
    }
    
    const bullet = new Bullet()
    this.pool.push(bullet)
    this.activeCount++
    return bullet
  }
  
  returnBullet(bullet: Bullet): void {
    // Move returned bullet to inactive section
    this.activeCount--
  }
}
```

### Update Batching

Systems process objects in batches for cache efficiency:

```typescript
class GameObjectGroup {
  update(deltaFrames: number, totalFrames: number): void {
    // Batch process all objects of same type
    for (const obj of this.gameObjects.values()) {
      if (!obj.isDestroyed()) {
        obj.update(deltaFrames)
      }
    }
  }
}
```

## Error Handling Architecture

### System-Level Error Containment

Errors in one system don't crash others:

```typescript
class GameEngine {
  update(deltaFrames: number): void {
    try {
      this.eventManager.update(deltaFrames, this.totalFrames)
    } catch (error) {
      console.error("Event system error:", error)
      // Continue with other systems
    }
    
    try {
      this.timer.update(deltaFrames, this.totalFrames)
    } catch (error) {
      console.error("Timer system error:", error)
      // Continue with other systems
    }
  }
}
```

### Object-Level Error Isolation

Individual object errors don't affect others:

```typescript
class GameObjectGroup {
  update(deltaFrames: number, totalFrames: number): void {
    for (const obj of this.gameObjects.values()) {
      try {
        obj.update(deltaFrames)
      } catch (error) {
        console.error(`Object ${obj.getId()} update failed:`, error)
        // Mark object for cleanup but continue with others
        obj.destroy()
      }
    }
  }
}
```

## Extensibility Architecture

### Plugin System Pattern

New systems can be integrated following the IGameLoop pattern:

```typescript
class MyCustomSystem implements IGameLoop {
  update(deltaFrames: number, totalFrames: number): void {
    // Custom system logic
  }
}

class ExtendedGame extends GameEngine {
  private customSystem = new MyCustomSystem()
  
  update(deltaFrames: number): void {
    super.update(deltaFrames)
    
    if (this.getState() === GameState.PLAYING) {
      this.customSystem.update(deltaFrames, this.getTotalFrames())
    }
  }
}
```

### Event Source Extensions

New input sources can be added easily:

```typescript
class NetworkEventSource implements GameEventSource {
  getNextEvents(totalFrames: number): AnyGameEvent[] {
    return this.networkEvents.filter(e => e.frame <= totalFrames)
  }
  
  hasMoreEvents(): boolean {
    return this.networkEvents.length > 0
  }
  
  reset(): void {
    this.networkEvents = []
  }
}
```

### Custom GameObject Types

New object types integrate automatically:

```typescript
class PowerUp extends GameObject {
  getType(): string {
    return "PowerUp" // Automatically creates PowerUp group
  }
}

// Usage
const powerUp = new PowerUp(id, position, engine)
// Automatically registers and groups by type
```

## Testing Architecture

### Deterministic Testing

The architecture enables comprehensive testing:

```typescript
class GameTest {
  testDeterministicBehavior(): void {
    const game1 = new MyGame()
    const game2 = new MyGame()
    
    // Same seed, same inputs
    game1.reset("test-seed")
    game2.reset("test-seed")
    
    // Run identical sequences
    for (let i = 0; i < 100; i++) {
      game1.update(1.0)
      game2.update(1.0)
    }
    
    // Results must be identical
    assert(game1.serialize() === game2.serialize())
  }
}
```

### System Integration Testing

Each system can be tested in isolation and integration:

```typescript
class TimerTest {
  testFrameAccuracy(): void {
    const timer = new Timer()
    let callCount = 0
    
    timer.setInterval(() => callCount++, 60) // Every second at 60fps
    
    // Simulate 5 seconds
    for (let frame = 0; frame < 300; frame++) {
      timer.update(1, frame)
    }
    
    assert(callCount === 5) // Should have fired 5 times
  }
}
```

## Configuration Architecture

### Constants Management

System behavior is configurable through constants:

```typescript
export const ENGINE_CONSTANTS = {
  DEFAULT_FPS: 60,
  MAX_OBJECTS_PER_GROUP: 10000,
  CLEANUP_INTERVAL_FRAMES: 300
} as const

export const COLLISION_CONSTANTS = {
  MAX_POINTS_PER_NODE: 10,
  MAX_TREE_DEPTH: 8
} as const
```

### Runtime Configuration

Systems can be configured at runtime:

```typescript
class ConfigurableEngine extends GameEngine {
  constructor(config: EngineConfig) {
    super()
    this.applyConfiguration(config)
  }
  
  private applyConfiguration(config: EngineConfig): void {
    if (config.maxFrameRate) {
      this.targetFrameRate = config.maxFrameRate
    }
    
    if (config.collisionTreeDepth) {
      this.collisionTree.setMaxDepth(config.collisionTreeDepth)
    }
  }
}
```

## Future Architecture Considerations

### Modular System Loading
Future versions might support dynamic system loading for reduced bundle sizes.

### Multi-Threading Support
Careful consideration of deterministic multi-threading for performance-critical applications.

### Network Architecture
Built-in networking support while maintaining deterministic behavior across clients.


The Clockwork Engine architecture prioritizes deterministic behavior, maintainability, and extensibility. By understanding these architectural patterns and principles, you can build robust games that take full advantage of the engine's unique capabilities.