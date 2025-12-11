# Platform Abstraction Layer

The platform abstraction layer decouples Clockwork from web-specific dependencies, enabling headless replay validation, testing, and future platform support.

## Architecture Overview

The platform layer consists of four main interfaces:

* [`PlatformLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/PlatformLayer.ts) - Top-level container providing `rendering`, `audio`, and `input` properties
* [`RenderingLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/RenderingLayer.ts) - Graphics operations, scene graph management, texture loading
* [`AudioLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/AudioLayer.ts) - Sound loading and playback
* [`InputLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/InputLayer.ts) - Pointer and keyboard event handling

Platform implementations provide concrete behavior for these interfaces.

## Available Platforms

### WebPlatformLayer

**Purpose**: Browser-based games with full rendering and audio

**Implementation**: [src/platform/web/WebPlatformLayer.ts](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/web/WebPlatformLayer.ts)

Uses PIXI.js for rendering, Web Audio API for sound, and DOM events for input. Requires an HTML container element.

```typescript
const container = document.getElementById('game') as HTMLDivElement
const platform = new WebPlatformLayer(container, 800, 600)

const engine = new GameEngine({ loader, platform })
```

### MemoryPlatformLayer

**Purpose**: Headless replay validation and testing without rendering

**Implementation**: [src/platform/memory/MemoryPlatformLayer.ts](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/memory/MemoryPlatformLayer.ts)

Tracks rendering state internally but produces no visual output. Audio and input layers are no-ops. Perfect for server-side replay validation.

```typescript
const platform = new MemoryPlatformLayer()
const engine = new GameEngine({ loader, platform })
```

See [Headless Replay Guide](./headless-replay.md) for usage patterns.

## DisplayNode

The [`DisplayNode`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/DisplayNode.ts) class provides a platform-agnostic scene graph node with fluent API:

```typescript
const node = rendering.createNode()
  .setPosition(100, 200)
  .setScale(2)
  .setAlpha(0.8)
  .drawCircle(0, 0, 50, 0xff0000)
```

DisplayNode wraps platform-specific rendering primitives, enabling the same code to work across Web and Memory platforms.

## Rendering Operations

The RenderingLayer supports common operations:

* **Primitives**: `drawRectangle()`, `drawCircle()`, `drawPolygon()`, `drawLine()`, `drawPolyline()`
* **Sprites**: `setSprite()`, `setAnimatedSprite()`, `playAnimation()`
* **Transforms**: `setPosition()`, `setRotation()`, `setScale()`, `setAnchor()`
* **Visual effects**: `setAlpha()`, `setTint()`, `setBlendMode()`, `setTextureFiltering()`
* **Hierarchy**: `addChild()`, `removeChild()`, scene graph management
* **Viewport**: `setViewportPosition()`, `setViewportZoom()`, `screenToWorld()`, `worldToScreen()`

Full API: [RenderingLayer.ts](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/RenderingLayer.ts)

## Asset Loading

The platform layer integrates with asset loading through [`AssetLoader`](https://github.com/hiddentao/clockwork-engine/blob/main/src/assets/AssetLoader.ts):

```typescript
import { AssetLoader, AssetType } from 'clockwork-engine'

const assetLoader = new AssetLoader(loader, platform.rendering, platform.audio)

// Register assets for preloading
assetLoader.register('sprites/player.png', AssetType.SPRITESHEET)
assetLoader.register('sounds/jump.mp3', AssetType.SOUND)

const engine = new GameEngine({ loader, platform, assetLoader })

// Assets automatically preload during reset()
await engine.reset(config)

// Access loaded assets
const playerSheet = assetLoader.getSpritesheet('sprites/player.png')
```

Assets are preloaded automatically before `GameEngine.setup()` is called.

## Extending the Platform Layer

### Custom Platform

Implement the four core interfaces to add platform support:

```typescript
class MyPlatformLayer implements PlatformLayer {
  rendering: MyRenderingLayer
  audio: MyAudioLayer
  input: MyInputLayer

  constructor() {
    this.rendering = new MyRenderingLayer()
    this.audio = new MyAudioLayer()
    this.input = new MyInputLayer()
  }

  getDevicePixelRatio(): number {
    return 1 // or the correct value for your platform
  }
}
```

See [MemoryPlatformLayer](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/memory/MemoryPlatformLayer.ts) for a minimal reference implementation.


## Error Handling

* In the Web platform layer, if an image file (spritesheet or static image) fails to load then a default pink checkerboard texture is used in its place to indicate this error.




