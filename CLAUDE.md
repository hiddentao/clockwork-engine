# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This project is a browser-based game engine focused on deterministic, replayable games. The `./packages/core/docs/engine.md` file contains a high-level overview of the engine and coding guidelines that should be adhered to for anyone building games with this engine.

## Project Overview

Clockwork is a TypeScript game engine focused on deterministic, replayable games with platform-agnostic rendering. It provides deterministic game loops, recording/replay functionality, spatial collision systems, and a complete 2D rendering system with GameCanvas, AbstractRenderer, and BaseRenderer classes.

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

The rendering system uses a platform-agnostic rendering layer that abstracts the underlying graphics implementation. The current implementation uses PIXI.js through the WebPlatformLayer, but the design supports alternative rendering backends. The system provides three main components:

- **GameCanvas**: Abstract canvas class that manages:
  - Platform layer integration for rendering, audio, and input
  - Game engine integration with automatic update loops
  - Event handling for user interactions
  - Viewport management (drag, zoom, pan) with configurable limits
  - Canvas resizing and responsive behavior
  - Game layer initialization through `setupRenderers()` method

- **AbstractRenderer<T>**: Generic base class for rendering game objects, providing:
  - Platform-agnostic DisplayNode management (add/update/remove/setItems methods)
  - Generic typing for specific game object types (T extends GameObject)
  - Helper methods: `createRectangle()`, `createCircle()`, `createPolygon()`, `createBorderRectangle()`, `createStandardNode()`
  - Abstract methods: `create()` for initial setup, `getId()` for object identification
  - Optional `repaintNode()` method for dynamic updates with needsRepaint optimization

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

### Monorepo Structure

This is a Bun-based monorepo with three publishable packages:

| Package | Description |
|---------|-------------|
| `@clockwork-engine/core` | Core engine with game objects, recording/replay, serialization, and platform abstraction interfaces |
| `@clockwork-engine/platform-web-pixi` | Web platform implementation with PIXI.js 2D rendering |
| `@clockwork-engine/platform-memory` | Headless memory platform for testing and replay validation |

### Directory Structure
- `packages/core/src/` - Core engine source code
- `packages/core/src/geometry/` - Vector math, collision detection, spatial utilities
- `packages/core/src/platform/` - Platform abstraction interfaces (PlatformLayer, RenderingLayer, AudioLayer, InputLayer)
- `packages/core/src/rendering/` - AbstractRenderer, BaseRenderer classes
- `packages/platform-web-pixi/src/` - Web platform with PIXI.js rendering
- `packages/platform-memory/src/` - Headless memory platform for testing
- `demo/` - Example Snake game implementation
- `packages/core/tests/` - Unit tests for core systems

### Dependencies

- **Core runtime** (`@clockwork-engine/core`): alea (seeded PRNG)
- **Web platform** (`@clockwork-engine/platform-web-pixi`): pixi.js (2D rendering), pixi-viewport (viewport/camera)
- **Development**: TypeScript, Biome (linting/formatting), Bun (runtime/testing)

## Development Guidelines

- All game objects must extend abstract GameObject class and implement getId(), getType(), serialize()
- Objects self-register with engine in constructor: engine.registerGameObject(this)
- Custom classes need serialization support: serialize() method and static deserialize() method
- Tests use Bun's built-in test runner. Run specific test files with `bun test path/to/file.test.ts`.
- Pixi.js - .devdocs/pixi.txt
- Always use bun as the package maanger
- don't auto-run demo and/or engine dev server
- never bypass pre-commit hooks when doing a git commit
- always check for package.json for lint and format commands and use the commands defined in there
- use "bun run lint" to lint, "bun run lint:fix" to fix lint errors, and "bun run format" to format code, look in package.json for other scripts