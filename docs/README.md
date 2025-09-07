# 📖 Clockwork Engine Documentation

Welcome to the comprehensive documentation for Clockwork Engine, a TypeScript game engine designed for deterministic, replayable games.

🎮 **[Live Demo](https://hiddentao.github.io/clockwork-engine)** - See Clockwork Engine in action with our interactive Snake game demo!

## 🗺️ Documentation Overview

This documentation is organized into focused topics that cover all aspects of the Clockwork Engine. Each document provides deep technical insights, practical examples, and best practices.

## 📚 Core Documentation

### Getting Started
- **[Live Demo](https://hiddentao.github.io/clockwork-engine)** - Interactive Snake game showcasing all engine features
- **[Demo Source Code](../demo/)** - Complete source code for the Snake game demo with professional implementation patterns

### API & Architecture
- **[API Reference](./api.md)** - Complete API documentation with mini-examples for all public interfaces
- **[Architecture Overview](./architecture.md)** - High-level system design and architectural patterns

### Core Systems

#### Game Management
- **[Game Loop](./game-loop.md)** - GameEngine update cycle, IGameLoop interface, and frame processing
- **[Game States](./game-states.md)** - State machine transitions (READY/PLAYING/PAUSED/ENDED)
- **[Game Objects](./game-objects.md)** - GameObject system, GameObjectGroups, and lifecycle management

#### Recording & Playback
- **[Recording and Replaying](./recording-and-replaying.md)** - Deep dive into the deterministic record/replay system
- **[Serialization](./serialization.md)** - Universal serialization system, type registration, and edge cases

#### Event & Input Systems
- **[Event System](./event-system.md)** - EventEmitter, GameEventManager, and custom event sources

#### Utilities & Performance
- **[Collision Detection](./collision-detection.md)** - CollisionBspTree, spatial partitioning, and performance optimization
- **[Geometry](./geometry.md)** - Vector2D, GeometryUtils, and IPositionable interface
- **[Timers](./timers.md)** - Frame-based timer system replacing JavaScript's native timers
- **[PRNG](./prng.md)** - Deterministic pseudo-random number generation using the alea algorithm


## 🚀 Quick Navigation

### I want to...

**Build my first game**
→ Try the [Live Demo](https://hiddentao.github.io/clockwork-engine) and explore the [Demo Source Code](../demo/)

**Understand the core architecture**
→ Read [Architecture Overview](./architecture.md) and [Game Loop](./game-loop.md)

**Implement recording and replay**
→ Check out [Recording and Replaying](./recording-and-replaying.md)

**Work with game objects**
→ See [Game Objects](./game-objects.md)

**Handle collisions efficiently**
→ Learn about [Collision Detection](./collision-detection.md)

**Create custom events**
→ Explore [Event System](./event-system.md)

**Serialize custom data types**
→ Study [Serialization](./serialization.md)

**Find a specific API method**
→ Use the [API Reference](./api.md)

