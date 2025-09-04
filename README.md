# Clockwork Game Engine

A TypeScript game engine for deterministic, replayable games with built-in recording and replay capabilities.

## Overview

This package provides the core foundation for building games, including game objects, event systems, game loops, and geometry utilities.

## Features

### Geometry Utilities
- **Vector2D**: 2D vector math operations
- **GeometryUtils**: Line intersection, angle calculations, collision detection
- **CollisionUtils**: Efficient spatial partitioning for collision detection
- **IPositionable**: Interface for objects with position and size

### Game Objects
- **GameObject**: Abstract base class for game entities with position, health, and movement
- **SerializedGameObject**: Interface for object serialization

### Core Systems
- **GameLoop**: Main game loop implementation
- **Events**: Event system for game communication

## Usage

### Creating Game Objects

```typescript
import { GameObject, Vector2D } from 'clockwork'

class MyGameObject extends GameObject {
  constructor(position: Vector2D, size: Vector2D) {
    super(position, size, 100) // 100 health
  }

  getId(): string {
    return this.id
  }

  getType(): string {
    return 'MyGameObject'
  }

  serialize() {
    return {
      position: { x: this.position.x, y: this.position.y },
      size: { x: this.size.x, y: this.size.y },
      velocity: { x: this.velocity.x, y: this.velocity.y },
      rotation: this.rotation,
      health: this.health,
      maxHealth: this.maxHealth,
      isDestroyed: this.destroyed,
    }
  }
}
```

## API Reference

### Geometry
- `Vector2D`: 2D vector operations
- `GeometryUtils`: Static utility methods for geometric calculations
- `CollisionUtils`: Spatial partitioning for efficient collision detection
- `IPositionable`: Interface for objects with position and size

### Game Objects
- `GameObject`: Abstract base class for game entities
- `SerializedGameObject`: Serialization interface

### Core Systems
- `GameLoop`: Main game loop
- `Events`: Event system

## Dependencies

- **pixi.js**: ^8.6.6 - 2D rendering library
- **pixi-viewport**: ^6.0.3 - Viewport management for Pixi.js

## Development

```bash
# Build the package
bun run build

# Watch for changes
bun run dev

# Clean build artifacts
bun run clean
```