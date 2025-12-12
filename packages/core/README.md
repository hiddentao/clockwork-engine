# @clockwork-engine/core

[![NPM Version](https://img.shields.io/npm/v/@clockwork-engine/core.svg)](https://www.npmjs.com/package/@clockwork-engine/core)

Core game engine for deterministic, replayable games with platform-agnostic rendering.

## What's Included

- **GameEngine** - Game state management and deterministic update loop
- **GameObject** - Base class for game entities with automatic grouping
- **GameCanvas** - Abstract canvas for rendering integration
- **GameRecorder / ReplayManager** - Record and replay gameplay with frame-accurate playback
- **Serializer** - Universal serialization for game state
- **Timer / PRNG** - Deterministic timing and random number generation
- **Vector2D / CollisionGrid** - Spatial math and collision detection
- **Platform abstraction** - Interfaces for rendering, audio, and input

## Installation

```bash
bun add @clockwork-engine/core
```

**Note:** This package requires a platform implementation for actual rendering:
- [`@clockwork-engine/platform-web-pixi`](../platform-web-pixi) - Web/browser with PIXI.js
- [`@clockwork-engine/platform-memory`](../platform-memory) - Headless for testing

## Usage

```typescript
import { GameEngine, GameObject, Vector2D, GameCanvas } from '@clockwork-engine/core'

class MyGame extends GameEngine {
  setup() {
    this.registerGameObject(new Player(new Vector2D(100, 100)))
  }
}
```

See the [main README](../../README.md) for full documentation and examples.
