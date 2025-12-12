# @clockwork-engine/platform-memory

[![NPM Version](https://img.shields.io/npm/v/@clockwork-engine/platform-memory.svg)](https://www.npmjs.com/package/@clockwork-engine/platform-memory)

Headless memory platform layer for Clockwork Engine - ideal for testing and replay validation.

## What's Included

- **MemoryPlatformLayer** - Headless platform implementation
- **MemoryRenderingLayer** - In-memory rendering (stores node state without visual output)
- **MemoryAudioLayer** - Mock audio layer
- **MemoryInputLayer** - Programmatic input simulation

## Use Cases

- Unit and integration testing
- CI/CD pipelines (no browser required)
- Replay validation and determinism verification
- Server-side game state processing

## Installation

```bash
bun add @clockwork-engine/core @clockwork-engine/platform-memory
```

## Usage

```typescript
import { GameCanvas } from '@clockwork-engine/core'
import { MemoryPlatformLayer } from '@clockwork-engine/platform-memory'

// Create headless platform
const platform = new MemoryPlatformLayer({
  screenWidth: 800,
  screenHeight: 600,
  worldWidth: 800,
  worldHeight: 600,
})
await platform.init()

// Create canvas for testing
const canvas = new MyGameCanvas(options, platform)
await canvas.initialize()

// Run game logic without visual rendering
game.start()
```

## Peer Dependencies

See the [main README](../../README.md) for full documentation.
