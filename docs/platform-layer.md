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
const assetLoader = new AssetLoader(loader, platform.rendering, platform.audio)

// Register assets for preloading
assetLoader.register('sprites/player.png', 'spritesheet')
assetLoader.register('sounds/jump.mp3', 'sound')

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
    return 1
  }
}
```

See [MemoryPlatformLayer](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/memory/MemoryPlatformLayer.ts) for a minimal reference implementation.

### Custom Asset Loader

Extend `AssetLoader` to customize asset path resolution:

```typescript
class GameAssetLoader extends AssetLoader {
  async loadSpritesheet(id: string): Promise<Spritesheet> {
    const spritesheet = await Spritesheet.load(
      this.loader,
      this.rendering,
      `game-assets/spritesheets/${id}.png`
    )
    this.spritesheets.set(id, spritesheet)
    return spritesheet
  }
}
```

Register with short IDs and let the loader add path prefixes:

```typescript
assetLoader.register('player', 'spritesheet') // Becomes 'game-assets/spritesheets/player.png'
```

## Error Handling

**Missing textures**: Return pink/magenta checkerboard error texture, game continues

**Missing sounds**: No-op, game continues

**Platform errors**: Check console logs for rendering/audio initialization failures

## Testing with Platforms

**Unit tests**: Use `MemoryPlatformLayer` for fast, deterministic testing

```typescript
const platform = new MemoryPlatformLayer()
const engine = new TestGameEngine({ loader, platform })
```

**Browser tests**: Use Playwright with real WebGL rendering

See [tests/browser/](https://github.com/hiddentao/clockwork-engine/tree/main/tests/browser) for examples.

**Integration tests**: Test platform switching and state independence

See [tests/integration/PlatformSwitching.test.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/integration/PlatformSwitching.test.ts).

## Performance Considerations

Platform abstraction adds minimal overhead (<5% measured):

* DisplayNode wrapper: Negligible memory cost
* Method dispatch: Inlined by modern JIT compilers
* State tracking (Memory): No rendering cost

See [tests/benchmarks/](https://github.com/hiddentao/clockwork-engine/tree/main/tests/benchmarks) for performance measurements.

## Common Patterns

**Multi-platform initialization**:

```typescript
// Browser
const platform = new WebPlatformLayer(container, width, height)

// Headless
const platform = new MemoryPlatformLayer()

// Same engine code for both!
const engine = new GameEngine({ loader, platform })
```

**Accessing platform layers**:

```typescript
class MyGameCanvas extends GameCanvas {
  constructor(options, engine) {
    super(options, engine)
    this.rendering = engine.platform.rendering
    this.audio = engine.platform.audio
    this.input = engine.platform.input
  }
}
```

**Platform-agnostic rendering**:

```typescript
// Works identically on Web and Memory platforms
const sprite = rendering.createNode()
  .setSprite(textureId)
  .setPosition(x, y)
  .setScale(2)

container.addChild(sprite)
```

## Migration from Direct PIXI.js

Old code using PIXI.js directly:

```typescript
import * as PIXI from 'pixi.js'

const sprite = new PIXI.Sprite(texture)
sprite.position.set(100, 200)
container.addChild(sprite)
```

New platform-agnostic code:

```typescript
const node = rendering.createNode()
  .setSprite(textureId)
  .setPosition(100, 200)

containerNode.addChild(node)
```

Renderers automatically receive the platform's RenderingLayer - see [AbstractRenderer](https://github.com/hiddentao/clockwork-engine/blob/main/src/rendering/AbstractRenderer.ts).
