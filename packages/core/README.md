<div align="center">

# Clockwork Game Engine

[![Build Status](https://img.shields.io/github/actions/workflow/status/hiddentao/clockwork-engine/ci.yml?branch=main)](https://github.com/hiddentao/clockwork-engine/actions)
[![Coverage Status](https://coveralls.io/repos/github/hiddentao/clockwork-engine/badge.svg?branch=main)](https://coveralls.io/github/hiddentao/clockwork-engine?branch=main)
[![NPM Version](https://img.shields.io/npm/v/@hiddentao/clockwork-engine.svg)](https://www.npmjs.com/package/@hiddentao/clockwork-engine)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)

**A TypeScript game engine for deterministic, replayable games with built-in recording, replay, and rendering capabilities.**

[Documentation](./docs)

</div>

---

## 🎮 Live Demo

**[Try the Interactive Demo →](https://hiddentao.github.io/clockwork-engine)**

## ✨ Features

- 🎯 **Deterministic Gameplay** - Frame-based updates with seeded PRNG for perfect reproducibility
- 📹 **Record & Replay** - Built-in recording system for gameplay sessions with frame-accurate playback
- 🎮 **Game Object System** - Type-safe game entities with automatic grouping and lifecycle management
- 🎨 **Built-in PIXI.js Renderer** - Built-in [pixi.js](https://pixijs.com/) integration with viewport management, event handling, and rendering abstractions
- 🏃‍♂️ **High-Performance Collision Detection** - Spatial partitioning with BSP trees for efficient collision queries
- ⚡ **Event-Driven Architecture** - Flexible event system with custom event sources and managers
- 🔄 **Universal Serialization** - Automatic serialization for all game data with custom type support
- ⏱️ **Frame-Based Timers** - Deterministic timing system replacing JavaScript's native timers
- 🔧 **TypeScript First** - Full type safety with comprehensive interfaces and generics

## 🚀 Quick Start

### Installation

```bash
npm install @hiddentao/clockwork-engine
# or
bun add @hiddentao/clockwork-engine
```

### Basic Usage

```typescript
import { GameEngine, GameObject, Vector2D, GameCanvas } from '@hiddentao/clockwork-engine'

class MyGame extends GameEngine {
  setup() {
    // Initialize your game world
    const player = new Player(new Vector2D(100, 100))
    this.registerGameObject(player)
  }
}

class MyGameCanvas extends GameCanvas {
  protected initializeGameLayers(): void {
    // Set up your game rendering layers
  }

  protected render(deltaFrames: number): void {
    // Custom rendering logic (optional)
  }
}

const game = new MyGame()
game.reset("my-seed")

// Create canvas with built-in PIXI.js integration
const container = document.getElementById('game-container')
const canvas = await MyGameCanvas.create(container, {
  width: 800,
  height: 600,
  worldWidth: 800,
  worldHeight: 600
})

canvas.setGameEngine(game)
game.start()
```

## 📚 Documentation

Comprehensive documentation is available in the [docs](./docs) directory:

## 🛠️ Development

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

# Build the project
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
# Run the demo (from project root)
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

See [CHANGELOG.md](CHANGELOG.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

