# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Clockwork is a TypeScript/PIXI.js game engine focused on deterministic, replayable games. It provides deterministic game loops, recording/replay functionality, spatial collision systems, and a complete 2D rendering system with GameCanvas, AbstractRenderer, and BaseRenderer classes.

## Build System & Commands
- **Package manager**: Bun
- **Build**: `bun run build` - Compiles TypeScript to dist/
- **Development**: `bun run dev` - Watch mode compilation
- **Testing**: `bun test` (watch with `bun test --watch`)
- **Linting**: `biome check .` (fix with `biome check --write .`)
- **Demo**: `bun run demo` - Runs Vite dev server in demo/ directory

## Architecture Overview

### Core Systems
- **GameEngine**: Abstract base class providing game state management (READY/PLAYING/PAUSED/ENDED), object registration, and deterministic updates
- **GameRecorder**: Captures user inputs and object updates for later replay (recording only - does not execute)
- **ReplayManager**: Handles playback of recorded game sessions with frame-accurate determinism
- **InputManager**: Abstracts input handling between live and recorded sources via InputSource interface
- **PRNG**: Seeded random number generator using 'alea' package for deterministic behavior
- **Timer**: Frame-based timer system with async callbacks (replaces setTimeout/setInterval)
- **Serializer**: Universal serialization with type registration for all parameter types

### Rendering System
The rendering system is built on PIXI.js and provides a complete 2D graphics solution with three main components:

- **GameCanvas**: Abstract PIXI.js-based canvas class that manages:
  - PIXI Application and viewport setup with pixi-viewport for camera/zoom controls
  - Game engine integration with automatic update loops
  - Event handling for user interactions
  - Viewport management (drag, zoom, pan) with configurable limits
  - Canvas resizing and responsive behavior
  - Game layer initialization through `initializeGameLayers()` method

- **AbstractRenderer<T>**: Generic base class for rendering game objects, providing:
  - Automatic PIXI container management (add/update/remove/setItems methods)
  - Generic typing for specific game object types (T extends GameObject)
  - Helper methods: `createRectangle()`, `createCircle()`, `addNamedChild()`, `getNamedChild()`
  - Abstract methods: `create()` for initial setup, `getId()` for object identification
  - Optional `updateContainer()` method for dynamic updates

- **BaseRenderer**: TypeScript interface defining the renderer contract:
  - Standard methods: `add()`, `update()`, `remove()`, `setItems()`
  - Ensures consistent renderer API across implementations

### Key Patterns
- Frame-based deterministic updates (not delta-time based)
- GameObject type registry: objects self-register by type string, engine manages groups automatically
- Manual recording requirement: developers must explicitly call recordObjectUpdate() for direct object changes
- Strict separation of recorded inputs vs live inputs via InputSource abstraction
- Event-driven architecture with GameEventType enum (USER_INPUT, OBJECT_UPDATE)
- Universal serialization supporting primitives, arrays, objects, and custom classes with serialize/deserialize methods

### Directory Structure
- `src/` - Main engine source code
- `src/geometry/` - Vector math, collision detection, spatial utilities
- `src/enums/` - Game state and event type definitions  
- `src/rendering/` - GameCanvas, AbstractRenderer, BaseRenderer classes
- `demo/` - Example implementation using SnakeGameCanvas and renderer classes
- `tests/` - Unit tests for core systems

### Dependencies
- **Runtime**: pixi.js (2D graphics engine), pixi-viewport (viewport/camera), alea (seeded PRNG)
- **Development**: TypeScript, Biome (linting/formatting), Bun (runtime/testing)

## Development Guidelines

### GameObject Implementation
- All game objects must extend abstract GameObject class and implement getId(), getType(), serialize()
- Objects self-register with engine in constructor: engine.registerGameObject(this)
- Custom classes need serialization support: serialize() method and static deserialize() method

### Rendering System Implementation

#### Creating Custom Game Canvases
Extend GameCanvas to create game-specific canvases:
```typescript
class MyGameCanvas extends GameCanvas {
  protected initializeGameLayers(): void {
    // Set up renderers for different game object types
    this.addRenderer("Snake", new SnakeRenderer(this.gameContainer))
    this.addRenderer("Apple", new AppleRenderer(this.gameContainer))
    this.addRenderer("Wall", new WallRenderer(this.gameContainer))
  }
}

// Initialize with PIXI.js application
const canvas = await MyGameCanvas.create(domElement, {
  width: 800, height: 600,
  worldWidth: 1000, worldHeight: 1000,
  backgroundColor: 0x1a1a2e,
  enableDrag: true, enableZoom: true
})
```

#### Creating Game Object Renderers
Extend AbstractRenderer<T> for specific game objects:
```typescript
class SnakeRenderer extends AbstractRenderer<Snake> {
  constructor(gameContainer: PIXI.Container) {
    super(gameContainer)
  }

  protected create(snake: Snake): PIXI.Container {
    const container = new PIXI.Container()
    // Create and position PIXI graphics for the snake
    return container
  }

  protected updateContainer(container: PIXI.Container, snake: Snake): void {
    // Update container when snake changes (optional)
  }

  public getId(snake: Snake): string {
    return snake.getId()
  }
}
```

#### Key Implementation Points
- Use GameCanvas.create() factory method for proper PIXI.js initialization
- GameCanvas automatically handles update loops, viewport management, and events
- Renderers are registered by game object type string in initializeGameLayers()
- AbstractRenderer provides helper methods for common PIXI graphics operations
- All renderers should implement proper positioning using game coordinates

### Deterministic Behavior
- Use engine.getPRNG() for all randomization to maintain determinism
- Frame counts are integers; avoid floating-point delta times for determinism
- Use engine.setTimeout()/setInterval() for frame-based timing instead of native timers

### Recording System
- GameRecorder only records events - it does not execute commands
- Must manually call recorder.recordObjectUpdate() for direct object modifications outside input flow
- All parameters are automatically serialized before recording
- Serializer requires type registration using the singleton: `import { serializer } from './src/Serializer'; serializer.registerType('ClassName', ClassName)`

### State Management
- Engine enforces strict state transitions with error checking
- READY → PLAYING (start), PLAYING → PAUSED (pause), PAUSED → PLAYING (resume), PLAYING/PAUSED → ENDED (end)
- Only PLAYING state processes updates in the game loop

## Game Loop Update Order
The engine processes updates in this specific order each frame:
1. Process inputs first (InputManager.update)
2. Update timer system with async callbacks (Timer.update) 
3. Update all game object groups by type (GameObjectGroup.update)
4. Increment frame counter (totalFrames += deltaFrames)

## Usage Examples

### Recording Example
```typescript
import { serializer } from './src/Serializer'

const recorder = new GameRecorder()
serializer.registerType('Vector2D', Vector2D)

engine.reset("seed123")
recorder.startRecording(engine)

// Manual object updates must be recorded explicitly
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
```

### Replay Example
```typescript
const replayManager = new ReplayManager(engine, inputManager, serializer)
replayManager.replay(recording) // Deterministic playback
```

## Testing
Tests use Bun's built-in test runner. Run specific test files with `bun test path/to/file.test.ts`. Key test areas:
- Deterministic behavior with fixed seeds
- Serialization/deserialization for all custom types  
- Record/replay produces identical outcomes
- State transition enforcement


## Library docs
- Pixi.js - .devdocs/pixi.txt
- Always use bun as the package maanger
- don't auto-run demo and/or engine dev server
- never bypass pre-commit hooks when doing a git commit
- always check for package.json for lint and format commands and use the commands defined in there
- don't ever run the demo server
- use "bun run lint" to lint, "bun run lint:fix" to fix lint errors, and "bun run format" to format code, look in package.json for other scripts