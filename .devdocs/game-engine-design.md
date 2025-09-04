# Generic Game Engine Design

## Overview

This document outlines the design for a generic, deterministic game engine that supports recording and replay functionality. The engine is frame-based (not time-based) to ensure perfect reproducibility across different hardware.

## Core Requirements

1. **Deterministic Gameplay**: Same seed + same inputs = identical game outcome
2. **Recording & Replay**: Complete game sessions can be recorded and replayed perfectly
3. **Frame-based Timing**: All timing based on frame counts, not milliseconds
4. **Serializable**: All game events can be serialized for server-side validation
5. **Clean Architecture**: Clear separation between generic engine and game-specific logic

## Architecture

### 1. Abstract Game Engine Class (`packages/engine/src/GameEngine.ts`)

The core game engine that manages the game loop and GameObject registry.

#### Key Features:
- Abstract class implementing `IGameLoop` interface
- Manages registry of GameObjectGroups indexed by type string
- Handles game state (READY/PLAYING/PAUSED)
- Frame-based update system

#### Core Methods:
```typescript
abstract class GameEngine implements IGameLoop {
  private gameObjectGroups: Map<string, GameObjectGroup> = new Map()
  private totalFrames: number = 0
  private state: GameState = GameState.READY
  private seed: string
  private prng: PRNG
  
  // Lifecycle methods
  initialize(seed: string): void  // Store seed, call reset()
  reset(): void                   // Reset state to READY, recreate PRNG, totalFrames = 0, call setup()
  abstract setup(): void          // Override in subclasses for game-specific setup
  start(): void                   // Set state to PLAYING to enable the game loop
  
  // Game loop
  update(deltaFrames: number): void {
    if (this.state !== GameState.PLAYING) return
    
    // 1. Process inputs first
    this.inputManager.update(deltaFrames)
    
    // 2. Update all game objects by type
    for (const [type, group] of this.gameObjectGroups) {
      group.update(deltaFrames)
    }
    
    // 3. Increment frame counter
    this.totalFrames += deltaFrames
  }
  
  // GameObject registry
  registerGameObject(obj: GameObject): void
  getGameObjectGroup(type: string): GameObjectGroup | undefined
  
  // State management
  start(): void    // Transition from READY to PLAYING (only if READY)
  pause(): void    // Transition from PLAYING to PAUSED (only if PLAYING)
  resume(): void   // Transition from PAUSED to PLAYING (only if PAUSED)
  end(): void      // Transition to ENDED (from PLAYING or PAUSED)
  getSeed(): string
  getTotalFrames(): number
  getState(): GameState
}
```

### 2. GameObject Type Registry System

GameObjects self-register with the engine based on their type.

```typescript
abstract class GameObject {
  abstract getType(): string  // Each subclass specifies its type
  
  constructor(engine: GameEngine, id: string, ...) {
    // Self-register with engine
    engine.registerGameObject(this)
  }
}

// Example concrete implementations
class Player extends GameObject {
  getType(): string { return "Player" }
}

class Enemy extends GameObject {
  getType(): string { return "Enemy" }
}
```

The GameEngine maintains groups automatically:
- Creates GameObjectGroup for new types as needed
- Provides access to groups by type string
- Updates all groups in the main update loop

### 3. Game Event Recording System

Records two types of events:
1. **User inputs** - Keyboard, mouse, controller inputs
2. **Manual object updates** - Direct method calls on GameObjects

#### GameEvent Types

```typescript
export enum GameEventType {
  USER_INPUT = "USER_INPUT",
  OBJECT_UPDATE = "OBJECT_UPDATE"
}

interface GameEvent {
  type: GameEventType
  frame: number  // Frame when event occurred
  timestamp?: InputTimestamp.ASAP  // For immediate execution
}

interface UserInputEvent extends GameEvent {
  type: GameEventType.USER_INPUT
  inputType: string
  params: any[]  // Serialized parameters
}

interface ObjectUpdateEvent extends GameEvent {
  type: GameEventType.OBJECT_UPDATE
  objectType: string  // GameObject type
  objectId: string    // GameObject id
  method: string      // Method name to call
  params: any[]       // Serialized parameters
}
```

#### GameRecorder (`packages/engine/src/GameRecorder.ts`)

Records game events for later replay. Does NOT execute commands - only records them.

```typescript
class GameRecorder {
  private recording: GameRecording
  private isRecording: boolean = false
  
  startRecording(engine: GameEngine): void {
    engine.reset()  // Reset engine to initial state
    this.recording = {
      seed: engine.getSeed(),
      events: []
    }
    this.isRecording = true
  }
  
  recordUserInput(input: UserInputEvent): void {
    if (this.isRecording) {
      this.recording.events.push(input)
    }
  }
  
  recordObjectUpdate(event: ObjectUpdateEvent): void {
    if (this.isRecording) {
      this.recording.events.push(event)
    }
  }
  
  stopRecording(): GameRecording {
    this.isRecording = false
    return this.recording
  }
}
```

**Important**: `recordObjectUpdate` must be manually called by developers when making direct changes to GameObjects outside the normal input flow.

### 4. Universal Serializer (`packages/engine/src/Serializer.ts`)

Handles serialization/deserialization of all parameter types in game events.

```typescript
export class Serializer {
  private typeRegistry = new Map<string, SerializableClass>()
  
  registerType(typeName: string, classConstructor: SerializableClass): void
  
  serialize(value: any): any {
    // Primitives: pass through unchanged
    // Arrays: wrap with __type: 'Array'
    // Objects with serialize(): wrap with __type: className
    // Plain objects: wrap with __type: 'Object'
    // All wrapped objects store data in __data field
  }
  
  deserialize(value: any): any {
    // No __type: primitive, return as-is
    // __type: 'Array': deserialize array elements
    // __type: 'Object': deserialize object properties
    // __type: registered class: use class.deserialize()
  }
}
```

All custom classes need serialization support:

```typescript
export class Vector2D {
  constructor(public x: number, public y: number) {}
  
  serialize(): { x: number, y: number } {
    return { x: this.x, y: this.y }
  }
  
  static deserialize(data: { x: number, y: number }): Vector2D {
    return new Vector2D(data.x, data.y)
  }
}
```

### 5. Input Management System

Abstracted input handling for both live and recorded inputs.

```typescript
interface InputSource {
  getNextInput(currentFrame: number): GameEvent | null
  hasMoreInput(): boolean
}

class LiveInputSource implements InputSource {
  private inputQueue: GameEvent[] = []
  
  queueInput(event: GameEvent): void
  getNextInput(currentFrame: number): GameEvent | null
}

class RecordedInputSource implements InputSource {
  constructor(private events: GameEvent[]) {}
  private currentIndex = 0
  
  getNextInput(currentFrame: number): GameEvent | null
  hasMoreInput(): boolean
}

class InputManager implements IGameLoop {
  constructor(private source: InputSource) {}
  
  update(deltaFrames: number): void {
    while (true) {
      const event = this.source.getNextInput(this.engine.getTotalFrames())
      if (!event) break
      this.processEvent(event)
    }
  }
  
  setSource(source: InputSource): void
}
```

### 6. Replay System (`packages/engine/src/ReplayManager.ts`)

Orchestrates game replay from recordings.

```typescript
class ReplayManager {
  constructor(
    private engine: GameEngine,
    private inputManager: InputManager,
    private serializer: Serializer
  ) {}
  
  replay(recording: GameRecording): void {
    // 1. Initialize engine with recording seed
    this.engine.initialize(recording.seed)
    
    // 2. Set input source to recorded events
    const recordedSource = new RecordedInputSource(recording.events)
    this.inputManager.setSource(recordedSource)
    
    // 3. Start engine
    this.engine.resume()
  }
  
  private executeObjectUpdate(event: ObjectUpdateEvent): void {
    const group = this.engine.getGameObjectGroup(event.objectType)
    const obj = group?.getById(event.objectId)
    if (obj) {
      // Deserialize parameters and call method
      const params = event.params.map(p => this.serializer.deserialize(p))
      obj[event.method](...params)
    }
  }
}
```

### 7. PRNG Service (`packages/engine/src/PRNG.ts`)

Deterministic random number generation using the `alea` npm package.

```typescript
export class PRNG {
  private rng: any  // alea instance
  
  initialize(seed: string): void
  random(): number
  randomInt(min: number, max: number): number
  randomChoice<T>(array: T[]): T
}
```

### 8. Enums for Type Safety

All string literals replaced with enums:

```typescript
// packages/engine/src/enums/GameState.ts
export enum GameState {
  READY = "READY",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED"
}

// packages/engine/src/enums/GameEventType.ts
export enum GameEventType {
  USER_INPUT = "USER_INPUT",
  OBJECT_UPDATE = "OBJECT_UPDATE"
}

// packages/engine/src/enums/InputTimestamp.ts
export enum InputTimestamp {
  ASAP = "ASAP"  // For immediate execution
}
```

## File Structure

```
packages/engine/src/
├── GameEngine.ts           # Abstract game engine
├── GameObject.ts           # Base GameObject class
├── GameObjectGroup.ts      # Collection manager
├── GameRecorder.ts         # Records events only
├── ReplayManager.ts        # Handles replay
├── Serializer.ts          # Universal serialization
├── InputManager.ts        # Input handling
├── InputSource.ts         # Input source interface
├── LiveInputSource.ts     # Live input implementation
├── RecordedInputSource.ts # Recorded input implementation
├── GameEvent.ts           # Event type definitions
├── PRNG.ts                # Deterministic random
├── IGameLoop.ts           # Interface (renamed from GameLoop.ts)
├── EventEmitter.ts        # Event system (renamed from events.ts)
├── index.ts               # Package exports
├── enums/                 # String enums
│   ├── GameState.ts
│   ├── GameEventType.ts
│   └── InputTimestamp.ts
├── geometry/              # Existing geometry utilities
│   └── Vector2D.ts        # With serialization methods
└── __tests__/
    └── fixtures/          # Test implementations
        ├── TestGameEngine.ts
        ├── TestPlayer.ts   # Extends GameObject
        └── TestEnemy.ts    # Extends GameObject
```

## Usage Example

### Recording a Game

```typescript
const engine = new MyGameEngine()
const recorder = new GameRecorder()
const serializer = new Serializer()

// Register types for serialization
serializer.registerType('Vector2D', Vector2D)

// Start recording
engine.initialize("seed123")
recorder.startRecording(engine)

// Play game...
// User inputs are recorded automatically via InputManager
// Manual updates must be recorded explicitly:
const player = engine.getGameObjectGroup("Player")?.getById("player1")
player.setPosition(new Vector2D(10, 20))
recorder.recordObjectUpdate({
  type: GameEventType.OBJECT_UPDATE,
  frame: engine.getTotalFrames(),
  objectType: "Player",
  objectId: "player1",
  method: "setPosition",
  params: [serializer.serialize(new Vector2D(10, 20))]
})

// Stop and save recording
const recording = recorder.stopRecording()
```

### Replaying a Game

```typescript
const replayEngine = new MyGameEngine()
const inputManager = new InputManager(new LiveInputSource())
const replayManager = new ReplayManager(replayEngine, inputManager, serializer)

// Replay the recording
replayManager.replay(recording)
// Game will play out exactly as recorded
```

## Key Design Decisions

1. **GameObject Type Registry**: Objects self-register by type string, engine manages groups automatically
2. **Manual Recording**: Developers must explicitly record direct object updates
3. **Universal Serialization**: Single serializer handles all types with registration system
4. **Simple Event Queue**: Events processed in exact order recorded (no priority system)
5. **Frame-based Timing**: All timing in frames, not milliseconds
6. **Separation of Concerns**: Recorder only records, engine executes, replay manager orchestrates

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Verify serialization/deserialization for all types
- Test deterministic behavior with fixed seeds

### Integration Tests
- Record simple game session
- Replay and verify identical outcome
- Test with different input patterns

### Test Game Implementation
Create a simple test game with:
- TestPlayer with movement and health
- TestEnemy with AI behavior
- Verify deterministic replay across multiple runs

## Migration Notes

For existing snake game:
1. Rename imports:
   - `events` → `EventEmitter`
   - `GameLoop` → `IGameLoop`
2. Import `GameObjectGroup` from new location
3. No other immediate changes required
4. Can gradually adopt recording system when ready

## Implementation Phases

1. **Phase 1 - Core**: GameEngine, GameObject, GameObjectGroup, PRNG
2. **Phase 2 - Serialization**: Serializer with type registration
3. **Phase 3 - Events**: GameEvent types and enums
4. **Phase 4 - Recording**: GameRecorder for capturing events
5. **Phase 5 - Input**: InputManager with Live/Recorded sources
6. **Phase 6 - Replay**: ReplayManager for playback
7. **Phase 7 - Testing**: Comprehensive test suite with fixtures
8. **Phase 8 - Demo Game**: Snake demo showcasing engine capabilities

## Timer System Addition

### Timer Service (`packages/engine/src/Timer.ts`)

A frame-based timer system that integrates with the game loop, eliminating the need for setTimeout/setInterval. Supports async callbacks executed in parallel with proper error handling.

```typescript
interface TimerCallback {
  id: string
  callback: () => Promise<void>
  targetFrame: number
  interval?: number  // For repeating timers
}

export class Timer implements IGameLoop {
  private timers: Map<string, TimerCallback> = new Map()
  private nextId: number = 0
  private currentFrame: number = 0
  
  // Schedule a one-time callback
  setTimeout(callback: () => Promise<void>, frames: number): string {
    const id = `timer_${this.nextId++}`
    this.timers.set(id, {
      id,
      callback,
      targetFrame: this.currentFrame + frames
    })
    return id
  }
  
  // Schedule a repeating callback
  setInterval(callback: () => Promise<void>, frames: number): string {
    const id = `timer_${this.nextId++}`
    this.timers.set(id, {
      id,
      callback,
      targetFrame: this.currentFrame + frames,
      interval: frames
    })
    return id
  }
  
  // Cancel a timer
  clearTimer(id: string): void {
    this.timers.delete(id)
  }
  
  // Called by GameEngine in update loop
  async update(deltaFrames: number): Promise<void> {
    this.currentFrame += deltaFrames
    
    const readyTimers: TimerCallback[] = []
    
    // Collect all timers ready for execution
    for (const [id, timer] of this.timers) {
      if (this.currentFrame >= timer.targetFrame) {
        readyTimers.push(timer)
      }
    }
    
    // Execute all ready timers in parallel with error handling
    if (readyTimers.length > 0) {
      const promises = readyTimers.map(async (timer) => {
        try {
          await timer.callback()
        } catch (error) {
          console.error(`Timer ${timer.id} failed:`, error)
        }
      })
      
      await Promise.all(promises)
      
      // Reschedule or remove timers after execution
      for (const timer of readyTimers) {
        if (timer.interval) {
          // Reschedule repeating timer
          timer.targetFrame = this.currentFrame + timer.interval
        } else {
          // Remove one-time timer
          this.timers.delete(timer.id)
        }
      }
    }
  }
  
  // Reset timer system
  reset(): void {
    this.timers.clear()
    this.currentFrame = 0
  }
}
```

### GameState Enhancement

Add ENDED state to the GameState enum:

```typescript
export enum GameState {
  READY = "READY",
  PLAYING = "PLAYING",  
  PAUSED = "PAUSED",
  ENDED = "ENDED"
}
```

### GameEngine Integration

Update GameEngine to include Timer system:

```typescript
abstract class GameEngine implements IGameLoop {
  private timer: Timer = new Timer()
  
  async update(deltaFrames: number): Promise<void> {
    if (this.state !== GameState.PLAYING) return
    
    // 1. Process inputs first
    this.inputManager.update(deltaFrames)
    
    // 2. Update timer system (async)
    await this.timer.update(deltaFrames)
    
    // 3. Update all game objects by type
    for (const [type, group] of this.gameObjectGroups) {
      group.update(deltaFrames)
    }
    
    // 4. Increment frame counter
    this.totalFrames += deltaFrames
  }
  
  reset(): void {
    // ... existing reset logic
    this.state = GameState.READY
    this.timer.reset()
  }
  
  // State management - defensive transitions
  start(): void {
    if (this.state !== GameState.READY) {
      throw new Error(`Cannot start game: expected READY state, got ${this.state}`)
    }
    this.state = GameState.PLAYING
  }
  
  pause(): void {
    if (this.state !== GameState.PLAYING) {
      throw new Error(`Cannot pause game: expected PLAYING state, got ${this.state}`)
    }
    this.state = GameState.PAUSED
  }
  
  resume(): void {
    if (this.state !== GameState.PAUSED) {
      throw new Error(`Cannot resume game: expected PAUSED state, got ${this.state}`)
    }
    this.state = GameState.PLAYING
  }
  
  end(): void {
    if (this.state !== GameState.PLAYING && this.state !== GameState.PAUSED) {
      throw new Error(`Cannot end game: expected PLAYING or PAUSED state, got ${this.state}`)
    }
    this.state = GameState.ENDED
  }
  
  // Timer access methods
  setTimeout(callback: () => Promise<void>, frames: number): string {
    return this.timer.setTimeout(callback, frames)
  }
  
  setInterval(callback: () => Promise<void>, frames: number): string {
    return this.timer.setInterval(callback, frames)
  }
  
  clearTimer(id: string): void {
    this.timer.clearTimer(id)
  }
}
```

## Demo Game Specification

### Overview

A snake game demonstration showcasing the engine's capabilities including collision detection, timer system, and replay functionality.

### Game Rules

1. **Snake**: Starts at length 2, grows by 1 when eating apples
2. **Apples**: Single apple on screen, respawns after eaten or timeout
3. **Walls**: 2-block obstacles spawn every 5 seconds randomly
4. **Win Condition**: Eat 50 apples
5. **Lose Condition**: Hit wall or self
6. **Movement**: 1 block every 0.2 seconds (matching spec.md)

### Project Structure

```
packages/engine/demo/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.ts                 # Entry point
│   ├── engine/
│   │   └── DemoGameEngine.ts   # Extends GameEngine
│   ├── gameObjects/
│   │   ├── Snake.ts            # Snake GameObject
│   │   ├── Apple.ts            # Apple GameObject
│   │   └── Wall.ts             # Wall GameObject
│   ├── components/
│   │   ├── GameCanvas.tsx      # PIXI.js rendering
│   │   ├── GameControls.tsx    # UI controls
│   │   └── ReplayControls.tsx  # Replay system UI
│   └── utils/
│       └── constants.ts        # Game configuration
```

### Key Implementation Details

#### DemoGameEngine

```typescript
class DemoGameEngine extends GameEngine {
  private collisionTree: CollisionBspTree
  private consumableTree: CollisionBspTree
  private spawnTree: CollisionBspTree
  
  setup(): void {
    // Initialize collision trees
    this.collisionTree = new CollisionBspTree()
    this.consumableTree = new CollisionBspTree()
    this.spawnTree = new CollisionBspTree()
    
    // Create initial snake (length 2)
    const snake = new Snake(this, "snake", new Vector2D(25, 25))
    
    // Spawn initial apple
    this.spawnApple()
    
    // Schedule wall spawning every 5 seconds (250 frames at 50fps)
    this.setInterval(async () => this.spawnWall(), 250)
    
    // Schedule snake movement every 0.2 seconds (10 frames at 50fps)
    this.setInterval(async () => this.moveSnake(), 10)
  }
  
  private spawnApple(): void {
    const position = this.findEmptyPosition()
    if (position) {
      new Apple(this, `apple_${Date.now()}`, position)
    }
  }
  
  private spawnWall(): void {
    const position = this.findEmptyPosition()
    if (position) {
      const isHorizontal = this.prng.random() > 0.5
      new Wall(this, `wall_${Date.now()}`, position, isHorizontal)
    }
  }
  
  private findEmptyPosition(): Vector2D | null {
    // Use spawnTree to find empty position
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = this.prng.randomInt(0, 49)
      const y = this.prng.randomInt(0, 49)
      const pos = new Vector2D(x, y)
      if (!this.spawnTree.containsPoint(pos).length) {
        return pos
      }
    }
    return null
  }
  
  private checkCollisions(): void {
    const snake = this.getGameObjectGroup("Snake")?.getById("snake") as Snake
    if (!snake) return
    
    const head = snake.getHead()
    
    // Check apple collision
    const apples = this.consumableTree.containsPoint(head)
    if (apples.length > 0) {
      snake.grow()
      // Remove eaten apple and spawn new one
      this.spawnApple()
    }
    
    // Check wall/self collision
    const collisions = this.collisionTree.containsPoint(head)
    if (collisions.length > 0) {
      this.state = GameState.ENDED
    }
    
    // Check win condition
    if (snake.getLength() >= 52) { // Started at 2, need 50 apples
      this.state = GameState.ENDED
    }
  }
}
```

### UI Implementation

#### Game Controls

- **Initial State**: Show 2-block snake and apple, wait for movement key
- **Playing State**: Game runs, show pause button
- **Ended State**: Show replay button and reset button
- **Replay Mode**: Show speed slider, disable input

#### Replay System

```typescript
interface ReplayControlsProps {
  onReplay: () => void
  onSpeedChange: (speed: number) => void
  speed: number
}

function ReplayControls({ onReplay, onSpeedChange, speed }: ReplayControlsProps) {
  return (
    <div>
      <button onClick={onReplay}>Replay</button>
      <input 
        type="range" 
        min="0.5" 
        max="4" 
        step="0.5" 
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
      />
      <span>Speed: {speed}x</span>
    </div>
  )
}
```

### Package Configuration

#### demo/package.json

```json
{
  "name": "@snake-plus-plus/demo",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@snake-plus-plus/engine": "workspace:*",
    "pixi.js": "^8.6.6",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.6.0",
    "typescript": "^5.8.3",
    "vite": "^7.0.4"
  }
}
```

#### Root package.json Addition

```json
{
  "scripts": {
    "demo": "cd packages/engine/demo && bun run dev"
  }
}
```

## Conclusion

This architecture provides a clean, deterministic game engine with comprehensive recording/replay capabilities. The design emphasizes simplicity, type safety, and clear separation of concerns while maintaining frame-perfect reproducibility. The demo game serves as both a showcase of the engine's capabilities and a reference implementation for future games built on this engine.