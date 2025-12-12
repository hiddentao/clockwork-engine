<div align="center">

# Clockwork Game Engine

[![Build Status](https://img.shields.io/github/actions/workflow/status/hiddentao/clockwork-engine/ci.yml?branch=main)](https://github.com/hiddentao/clockwork-engine/actions)
[![Coverage Status](https://coveralls.io/repos/github/hiddentao/clockwork-engine/badge.svg?branch=main)](https://coveralls.io/github/hiddentao/clockwork-engine?branch=main)
[![NPM Version](https://img.shields.io/npm/v/@clockwork-engine/core.svg)](https://www.npmjs.com/package/@clockwork-engine/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)

**A TypeScript game engine for deterministic, replayable games with platform-agnostic rendering.**

[Documentation](./packages/core/docs)

</div>

---

## Live Demo

**[Try the Interactive Demo →](https://hiddentao.github.io/clockwork-engine)**

## Features

- **Deterministic Gameplay** - Frame-based updates with seeded PRNG for perfect reproducibility
- **Record & Replay** - Built-in recording system for gameplay sessions with frame-accurate playback
- **Game Object System** - Type-safe game entities with automatic grouping and lifecycle management
- **Platform-Agnostic Rendering** - Separate rendering implementations (PIXI.js for web, headless for testing)
- **High-Performance Collision Detection** - Spatial partitioning with BSP trees for efficient collision queries
- **Event-Driven Architecture** - Flexible event system with custom event sources and managers
- **Universal Serialization** - Automatic serialization for all game data with custom type support
- **Frame-Based Timers** - Deterministic timing system replacing JavaScript's native timers
- **TypeScript First** - Full type safety with comprehensive interfaces and generics

## Packages

This monorepo contains the following packages:

| Package | Description |
|---------|-------------|
| [`@clockwork-engine/core`](./packages/core) | Core engine with game objects, recording/replay, serialization, and platform abstraction |
| [`@clockwork-engine/platform-web-pixi`](./packages/platform-web-pixi) | Web platform with PIXI.js 2D rendering |
| [`@clockwork-engine/platform-memory`](./packages/platform-memory) | Headless platform for testing and replay validation |

## Quick Start

### Installation

```bash
# Install core engine and web platform
bun add @clockwork-engine/core @clockwork-engine/platform-web-pixi

# For testing/headless use
bun add @clockwork-engine/platform-memory
```

### Basic Usage

```typescript
import { GameEngine, GameObject, Vector2D, GameCanvas } from '@clockwork-engine/core'
import { WebPlatformLayer } from '@clockwork-engine/platform-web-pixi'

// 1. Define your game engine
class MyGame extends GameEngine {
  setup() {
    const player = new Player(new Vector2D(100, 100))
    this.registerGameObject(player)
  }
}

// 2. Define your game canvas
class MyGameCanvas extends GameCanvas {
  protected setupRenderers(): void {
    // Set up your game rendering layers
  }

  protected render(deltaFrames: number): void {
    // Custom rendering logic
  }
}

// 3. Initialize the platform and canvas
const container = document.getElementById('game-container')!
const platform = new WebPlatformLayer(container, {
  screenWidth: 800,
  screenHeight: 600,
  worldWidth: 800,
  worldHeight: 600,
})
await platform.init()

// 4. Create and initialize the canvas
const canvas = new MyGameCanvas(
  { width: 800, height: 600, worldWidth: 800, worldHeight: 600 },
  platform
)
await canvas.initialize()

// 5. Create game engine and connect to canvas
const game = new MyGame()
await game.reset({ seed: 'my-seed' })
canvas.setGameEngine(game)
game.start()
```

## Documentation

Comprehensive documentation is available in the [docs](./packages/core/docs) directory.

## Development

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- Node.js >= 22.0

### Local Development

```bash
# Clone the repository
git clone https://github.com/hiddentao/clockwork-engine.git
cd clockwork-engine

# Install dependencies
bun install

# Build all packages
bun run build

# Run in watch mode
bun run dev
```

### Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch
```

### Code Quality

```bash
# Lint and type check
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format
```

### Demo Application

```bash
# Run the demo
cd demo
bun i
bun run dev
```

### Creating a new release

This project uses [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for automated releases based on conventional commits.

**Automatic version bumping (recommended):**
```bash
bun run release
```
This analyzes your commits since the last release and automatically determines the appropriate version bump (patch/minor/major), updates the changelog, and publishes to npm.

**Test a release without publishing:**
```bash
bun run release:dry-run
```

**Force specific version bumps:**
```bash
bun run release:patch   # 1.1.1 → 1.1.2 (bug fixes)
bun run release:minor   # 1.1.1 → 1.2.0 (new features)
bun run release:major   # 1.1.1 → 2.0.0 (breaking changes)
```

The release process will:
1. Run linting, tests, and build to ensure everything works
2. Bump the version in package.json
3. Generate/update CHANGELOG.md
4. Commit changes and create a git tag
5. Push to main with tags
6. Publish to npm
7. Automatically create a GitHub release

## Changelog

See [CHANGELOG.md](./CHANGELOG.md)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
