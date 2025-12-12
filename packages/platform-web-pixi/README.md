# @clockwork-engine/platform-web-pixi

[![NPM Version](https://img.shields.io/npm/v/@clockwork-engine/platform-web-pixi.svg)](https://www.npmjs.com/package/@clockwork-engine/platform-web-pixi)

Web platform layer with PIXI.js 2D rendering for Clockwork Engine.

## What's Included

- **WebPlatformLayer** - Main platform facade for web browsers
- **PixiRenderingLayer** - PIXI.js-based 2D rendering with viewport support
- **WebAudioLayer** - Web Audio API implementation
- **WebInputLayer** - Browser input handling (mouse, keyboard, touch)

## Installation

```bash
bun add @clockwork-engine/core @clockwork-engine/platform-web-pixi
```

## Usage

```typescript
import { GameCanvas } from '@clockwork-engine/core'
import { WebPlatformLayer } from '@clockwork-engine/platform-web-pixi'

// Create platform with container element
const container = document.getElementById('game-container')!
const platform = new WebPlatformLayer(container, {
  screenWidth: 800,
  screenHeight: 600,
  worldWidth: 800,
  worldHeight: 600,
})
await platform.init()

// Create your canvas with the platform
const canvas = new MyGameCanvas(options, platform)
await canvas.initialize()
```

## Peer Dependencies

See the [main README](../../README.md) for full documentation.
