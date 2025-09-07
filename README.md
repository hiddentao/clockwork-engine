<div align="center">

# Clockwork Game Engine

[![Build Status](https://img.shields.io/github/actions/workflow/status/hiddentao/clockwork-engine/ci.yml?branch=main)](https://github.com/hiddentao/clockwork-engine/actions)
[![NPM Version](https://img.shields.io/npm/v/@hiddentao/clockwork-engine.svg)](https://www.npmjs.com/package/@hiddentao/clockwork-engine)
[![License](https://img.shields.io/npm/l/@hiddentao/clockwork-engine.svg)](https://github.com/hiddentao/clockwork/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)

**A TypeScript game engine for deterministic, replayable games with built-in recording and replay capabilities.**

[Documentation](./docs) • [API Reference](./docs/api.md)

</div>

---

## 🎮 Live Demo

**[Try the Interactive Demo →](https://hiddentao.github.io/clockwork)**

## ✨ Features

- 🎯 **Deterministic Gameplay** - Frame-based updates with seeded PRNG for perfect reproducibility
- 📹 **Record & Replay** - Built-in recording system for gameplay sessions with frame-accurate playback
- 🎮 **Game Object System** - Type-safe game entities with automatic grouping and lifecycle management
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
import { GameEngine, GameObject, Vector2D } from '@hiddentao/clockwork-engine'
import * as PIXI from 'pixi.js'

class MyGame extends GameEngine {
  setup() {
    // Initialize your game world
    const player = new Player(new Vector2D(100, 100))
    this.registerGameObject(player)
  }
}

const game = new MyGame()
game.reset("my-seed")
game.start()

// Perfect integration with Pixi.js ticker
const ticker = PIXI.Ticker.shared
ticker.add((deltaTime) => {
  game.update(deltaTime) // deltaTime maps directly to deltaFrames
})
ticker.start()
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
git clone https://github.com/hiddentao/clockwork.git
cd clockwork

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

