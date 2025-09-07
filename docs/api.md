# 🔧 API Reference

Complete reference for all public APIs in the Clockwork Engine. This document provides detailed information about classes, interfaces, methods, and their usage patterns.

## Table of Contents

- [Core Engine](#core-engine)
- [Game Objects](#game-objects)
- [Recording & Replay](#recording--replay)
- [Event System](#event-system)
- [Geometry & Collision](#geometry--collision)
- [Utilities](#utilities)
- [Types & Enums](#types--enums)

## Core Engine

### GameEngine

Abstract base class that manages game state, objects, and the update loop.

```typescript
abstract class GameEngine extends EventEmitter<GameEngineEvents>
```

#### Constructor

```typescript
constructor()
```

#### Methods

##### `reset(seed?: string): void`

Resets the game engine to initial state.

```typescript
const game = new MyGame()
game.reset("deterministic-seed")
```

##### `abstract setup(): void`

Abstract method for game-specific initialization. Override in subclasses.

```typescript
class MyGame extends GameEngine {
  setup() {
    const player = new Player(new Vector2D(100, 100))
    this.registerGameObject(player)
  }
}
```

##### `start(): void`

Starts the game by transitioning from READY to PLAYING state.

```typescript
game.start() // Throws error if not in READY state
```

##### `pause(): void`

Pauses the game by transitioning from PLAYING to PAUSED state.

```typescript
game.pause() // Throws error if not in PLAYING state
```

##### `resume(): void`

Resumes the game by transitioning from PAUSED to PLAYING state.

```typescript
game.resume() // Throws error if not in PAUSED state
```

##### `end(): void`

Ends the game by transitioning to ENDED state.

```typescript
game.end()
```

##### `update(deltaFrames: number): void`

Main game loop update method.

```typescript
// Called by your game loop
game.update(1) // Process one frame
```

##### `getState(): GameState`

Returns the current game state.

```typescript
if (game.getState() === GameState.PLAYING) {
  // Game is running
}
```

##### `getTotalFrames(): number`

Returns the total number of frames processed.

```typescript
console.log(`Frame: ${game.getTotalFrames()}`)
```

##### `getPRNG(): PRNG`

Returns the deterministic random number generator.

```typescript
const randomValue = game.getPRNG().random()
```

##### `registerGameObject(obj: GameObject): void`

Registers a game object with the engine.

```typescript
const enemy = new Enemy(position, size)
game.registerGameObject(enemy)
```

##### `getGameObjectGroup<T extends GameObject>(type: string): GameObjectGroup<T> | undefined`

Gets a game object group by type.

```typescript
const enemies = game.getGameObjectGroup<Enemy>("Enemy")
```

## Game Objects

### GameObject

Abstract base class for all game entities.

```typescript
abstract class GameObject implements IPositionable
```

#### Constructor

```typescript
constructor(engine: GameEngineInterface, position: Vector2D, size: Vector2D, health: number = 100)
```

#### Abstract Methods

##### `abstract getId(): string`

Returns unique identifier for this object.

##### `abstract getType(): string`

Returns the type name for this object.

##### `abstract serialize(): any`

Returns serializable representation of this object.

#### Methods

##### `getPosition(): Vector2D`

Returns the current position.

```typescript
const pos = player.getPosition()
console.log(`Player at ${pos.x}, ${pos.y}`)
```

##### `setPosition(position: Vector2D): void`

Sets the position.

```typescript
player.setPosition(new Vector2D(100, 200))
```

##### `getHealth(): number`

Returns current health.

```typescript
if (player.getHealth() <= 0) {
  // Player is dead
}
```

##### `takeDamage(amount: number): void`

Reduces health by the specified amount.

```typescript
player.takeDamage(25)
```

##### `destroy(): void`

Marks the object for destruction.

```typescript
bullet.destroy()
```

### GameObjectGroup

Manages a collection of game objects of the same type.

```typescript
class GameObjectGroup<T extends GameObject>
```

#### Methods

##### `add(obj: T): void`

Adds an object to the group.

##### `remove(obj: T): void`

Removes an object from the group.

##### `getById(id: string): T | undefined`

Gets an object by its ID.

```typescript
const player = playerGroup.getById("player-1")
```

##### `getAll(): T[]`

Returns all objects in the group.

```typescript
const allEnemies = enemyGroup.getAll()
```

##### `update(deltaFrames: number, totalFrames: number): void`

Updates all objects in the group.

## Recording & Replay

### GameRecorder

Records game events for later replay.

```typescript
class GameRecorder
```

#### Methods

##### `startRecording(engine: GameEngine): void`

Begins recording game events.

```typescript
const recorder = new GameRecorder()
recorder.startRecording(engine)
```

##### `stopRecording(): GameRecording`

Stops recording and returns the recorded data.

```typescript
const recording = recorder.stopRecording()
```

##### `recordUserInput(inputType: string, params: any): void`

Records a user input event.

```typescript
recorder.recordUserInput("keydown", { key: "w" })
```

##### `recordObjectUpdate(event: ObjectUpdateEvent): void`

Records an object update event.

```typescript
recorder.recordObjectUpdate({
  type: GameEventType.OBJECT_UPDATE,
  frame: engine.getTotalFrames(),
  objectType: "Player",
  objectId: "player-1",
  method: "setPosition",
  params: [serializer.serialize(new Vector2D(100, 200))]
})
```

### ReplayManager

Manages playback of recorded game sessions.

```typescript
class ReplayManager
```

#### Constructor

```typescript
constructor(engine: GameEngine, eventManager: GameEventManager, serializer: Serializer)
```

#### Methods

##### `replay(recording: GameRecording): Promise<void>`

Replays a recorded game session.

```typescript
const replayManager = new ReplayManager(engine, eventManager, serializer)
await replayManager.replay(recording)
```

## Event System

### EventEmitter

Generic event emitter with type safety.

```typescript
class EventEmitter<TEvents extends Record<string, (...args: any[]) => void>>
```

#### Methods

##### `on<K extends keyof TEvents>(event: K, listener: TEvents[K]): void`

Adds an event listener.

```typescript
engine.on("stateChange", (newState, oldState) => {
  console.log(`State changed: ${oldState} → ${newState}`)
})
```

##### `off<K extends keyof TEvents>(event: K, listener: TEvents[K]): void`

Removes an event listener.

##### `emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): void`

Emits an event.

### GameEventManager

Manages processing of game events from various sources.

```typescript
class GameEventManager
```

#### Constructor

```typescript
constructor(eventSource: GameEventSource, engine: GameEngine)
```

#### Methods

##### `update(totalFrames: number): void`

Processes events for the current frame.

##### `setEventSource(eventSource: GameEventSource): void`

Changes the active event source.

```typescript
// Switch from live input to recorded input
eventManager.setEventSource(recordedEventSource)
```

## Geometry & Collision

### Vector2D

2D vector with mathematical operations.

```typescript
class Vector2D
```

#### Constructor

```typescript
constructor(x: number = 0, y: number = 0)
```

#### Methods

##### `add(other: Vector2D): Vector2D`

Vector addition.

```typescript
const result = vec1.add(vec2)
```

##### `subtract(other: Vector2D): Vector2D`

Vector subtraction.

```typescript
const direction = target.subtract(position)
```

##### `multiply(scalar: number): Vector2D`

Scalar multiplication.

```typescript
const doubled = velocity.multiply(2)
```

##### `magnitude(): number`

Returns the vector magnitude.

```typescript
const speed = velocity.magnitude()
```

##### `normalize(): Vector2D`

Returns normalized vector.

```typescript
const direction = velocity.normalize()
```

##### `distance(other: Vector2D): number`

Distance to another vector.

```typescript
const distance = playerPos.distance(enemyPos)
```

### CollisionBspTree

Spatial partitioning for efficient collision detection.

```typescript
class CollisionBspTree extends EventEmitter<CollisionBspEvents>
```

#### Methods

##### `addPoint(point: Vector2D, source: ICollisionSource): void`

Adds a collision point.

```typescript
tree.addPoint(bullet.getPosition(), bullet)
```

##### `removePoint(point: Vector2D, source: ICollisionSource): void`

Removes a collision point.

##### `queryRange(bounds: { minX: number, maxX: number, minY: number, maxY: number }): CollisionPoint[]`

Queries points within a rectangular area.

```typescript
const nearby = tree.queryRange({
  minX: x - radius,
  maxX: x + radius,
  minY: y - radius,
  maxY: y + radius
})
```

##### `clear(): void`

Removes all points from the tree.

## Utilities

### PRNG

Deterministic pseudo-random number generator.

```typescript
class PRNG
```

#### Methods

##### `initialize(seed: string): void`

Initializes with a seed value.

```typescript
prng.initialize("my-seed")
```

##### `random(): number`

Returns random number between 0 and 1.

```typescript
const value = prng.random() // 0.0 to 1.0
```

##### `randomInt(min: number, max: number): number`

Returns random integer in range.

```typescript
const dice = prng.randomInt(1, 6) // 1 to 6
```

### Timer

Frame-based timing system.

```typescript
class Timer
```

#### Methods

##### `setTimeout(callback: () => void, frames: number): number`

Sets a frame-based timeout.

```typescript
const id = timer.setTimeout(() => {
  console.log("Delayed action")
}, 60) // After 60 frames
```

##### `setInterval(callback: () => void, frames: number): number`

Sets a frame-based interval.

```typescript
const id = timer.setInterval(() => {
  spawnEnemy()
}, 120) // Every 120 frames
```

##### `clearTimeout(id: number): void`

Clears a timeout.

##### `clearInterval(id: number): void`

Clears an interval.

### Serializer

Universal serialization system.

```typescript
class Serializer
```

#### Methods

##### `registerType(typeName: string, constructor: new (...args: any[]) => any): void`

Registers a type for serialization.

```typescript
serializer.registerType("Vector2D", Vector2D)
serializer.registerType("Player", Player)
```

##### `serialize(obj: any): any`

Serializes an object.

```typescript
const serialized = serializer.serialize(new Vector2D(10, 20))
```

##### `deserialize(data: any): any`

Deserializes an object.

```typescript
const vector = serializer.deserialize(serialized) // Returns Vector2D instance
```

## Types & Enums

### GameState

```typescript
enum GameState {
  READY = "READY",
  PLAYING = "PLAYING", 
  PAUSED = "PAUSED",
  ENDED = "ENDED"
}
```

### GameEventType

```typescript
enum GameEventType {
  USER_INPUT = "USER_INPUT",
  OBJECT_UPDATE = "OBJECT_UPDATE"
}
```

### Interfaces

#### `IGameLoop`

```typescript
interface IGameLoop {
  update(deltaFrames: number, totalFrames: number): void | Promise<void>
}
```

#### `GameRecording`

```typescript
interface GameRecording {
  seed: string
  events: GameEvent[]
  deltaFrames: number[]
  totalFrames: number
  metadata?: {
    createdAt: number
    version?: string
    description?: string
  }
}
```

#### `UserInputEvent`

```typescript
interface UserInputEvent extends GameEvent {
  type: GameEventType.USER_INPUT
  inputType: string
  params: any
}
```

#### `ObjectUpdateEvent`

```typescript
interface ObjectUpdateEvent extends GameEvent {
  type: GameEventType.OBJECT_UPDATE
  objectType: string
  objectId: string
  method: string
  params: any
}
```

## Error Handling

Most methods throw descriptive errors for invalid state transitions or missing dependencies:

```typescript
try {
  game.start() // Will throw if not in READY state
} catch (error) {
  console.error(`Cannot start game: ${error.message}`)
}
```

## Performance Considerations

- **Object Registration**: Register objects once, avoid frequent re-registration
- **Collision Queries**: Use spatial partitioning with appropriate bounds
- **Event Processing**: Batch events when possible to reduce overhead
- **Serialization**: Register types once during initialization, not per-frame
- **PRNG Usage**: Reuse PRNG instance, avoid frequent re-initialization

## Best Practices

1. **Always use the engine's PRNG** for deterministic behavior
2. **Register all custom types** with the serializer
3. **Use frame-based timers** instead of JavaScript's native timers  
4. **Record object updates** manually when modifying objects outside the input flow
5. **Check game state** before performing state-dependent operations