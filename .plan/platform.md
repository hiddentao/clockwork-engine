# Platform Abstraction Architecture Plan

**Status**: Implementation Started
**Created**: 2025-11-19
**Updated**: 2025-11-21 (implementation plan finalized)
**Goal**: Abstract clockwork-engine from web-specific dependencies to support multiple platforms

## Implementation Approach

**Strategy**: Original 10 phases with TDD, accepting breaking changes (clean break)
**Testing**: Headless browser (puppeteer/playwright) for Web platform
**First Milestone**: Phases 1-6 complete (core abstractions through renderer refactor)
**Package Structure**: Main clockwork package (src/platform/)
**Progress Tracking**: Updated in this document after each phase

## Executive Summary

This plan outlines the re-architecture of clockwork-engine to remove dependencies on web-specific APIs (PIXI.js, DOM, Web Audio API) and create a platform abstraction layer. This will enable:

1. **Web Platform**: Browser-based games using PIXI.js and Web Audio API
2. **Memory Platform**: Headless replay verification and testing without rendering/audio
3. **Future Platforms**: Native engines (Unity, Godot), server-authoritative gameplay, Canvas2D fallback

## Gaps Analysis Summary

After comprehensive analysis of clockwork, game-base, arcade2, tiki-kong, and snakes-on-a-chain codebases, identified and resolved **21 platform-specific gaps**:

### Platform-Level Additions
1. ✅ **Device Pixel Ratio**: `getDevicePixelRatio()` method on PlatformLayer

### Audio Layer Enhancements
2. ✅ **Procedural Audio**: `createBuffer()` and `loadSoundFromBuffer()` for programmatic audio generation (eliminates isomorphic-web-audio-api dependency)
3. ✅ **Sound Loading Consolidation**: AudioLayer owns all sound loading (no separate HTML5 Audio API)

### Rendering Layer Enhancements
4. ✅ **Viewport Zoom Query**: `getViewportZoom()` method
5. ✅ **Error Handling**: `loadTexture()` returns pink/magenta checkerboard on error
6. ✅ **Resize Support**: `resize(width, height)` method (manual, frameworks handle events)
7. ✅ **Color Format**: Dual format support (hex `0xRRGGBB` and RGB object `{r, g, b}`)
8. ✅ **Blend Modes**: NORMAL, ADD, MULTIPLY, SCREEN
9. ✅ **Texture Filtering**: NEAREST (pixel art) and LINEAR modes

### Display Node Enhancements
10. ✅ **Tinting**: `setTint(color)` with dual format support
11. ✅ **Blend Modes**: `setBlendMode(mode)`
12. ✅ **Bounds Query**: `getBounds()` for hit testing
13. ✅ **Texture Filtering**: `setTextureFiltering(mode)`
14. ✅ **Sprite Sizing**: `getSize()` and `setSize()` in addition to scale
15. ✅ **Line Drawing**: `drawLine()` and `drawPolyline()` methods
16. ✅ **Stroke Support**: All primitives support fill, stroke, and strokeWidth parameters

### Clarifications
17. ✅ **Animation Speed Units**: Ticks per frame (deterministic, tied to game loop)
18. ✅ **Node Interactivity**: Global InputLayer only (no per-node events)
19. ✅ **Resource Cleanup**: Not needed - textures live for game lifetime
20. ✅ **Multi-Viewport**: One viewport per game is sufficient
21. ✅ **Future Extensions**: Text rendering, masking, fullscreen API, focus/blur handling

**Key Achievement**: Games will no longer need `isomorphic-web-audio-api` or any platform-specific shims!

## Architecture Decisions

### 1. Platform Layer Structure

```typescript
interface PlatformLayer {
  rendering: RenderingLayer
  audio: AudioLayer
  input: InputLayer

  // Device capabilities
  getDevicePixelRatio(): number
}
```

**Key Decisions**:
- ✅ **Properties over factory methods**: PlatformLayer uses direct properties (`rendering`, `audio`, `input`) instead of factory methods (`getRenderingLayer()`). Simpler API, single instance per platform, no lazy initialization needed. The "factory" aspect is in the PlatformLayer constructor itself.
- ✅ **Separate InputLayer**: Input handling abstracted from rendering (clean separation, easier mocking)
- ✅ **Loader stays separate**: Asset loading remains independent of PlatformLayer (already abstract, fetch-based)
- ✅ **State tracking in Memory**: MemoryPlatformLayer tracks render state (positions, visibility, hierarchy) for verification. Deviates from original prompt's "doesn't do anything" to enable replay verification and testing. No actual rendering occurs, but state is maintained.

### 2. Rendering Layer Design: OOP-Style Unified Node System

**Chosen Approach**: Unified node system with OOP wrapper (`DisplayNode`)

**Why this approach**:
- Simple migration from current PIXI.Container usage
- Clean OOP API familiar to developers
- ID-based internally for platform flexibility
- Method chaining for concise code
- Works well for PIXI.js, Canvas2D, and memory platforms
- Less complex than component-based or container/sprite split

**Rejected Alternatives**:
- ❌ Container/Sprite Split: More type safety but added complexity without clear benefit
- ❌ Pure Component-Based: Too complex for current needs, better suited for ECS patterns

## Original Requirements Coverage

This plan addresses all requirements from the original prompt:

✅ **PlatformLayer Interface**: Defined with `rendering`, `audio`, `input` properties (using properties instead of factory methods for simplicity)

✅ **RenderingLayer**: Complete abstraction covering:
- PIXI.js-like container architecture (DisplayNode hierarchy)
- Game loop ticker (onTick, setTickerSpeed)
- Sprite management (setSprite, setAnimatedSprite)
- Animation management (playAnimation, stopAnimation)
- Primitives rendering (drawRectangle, drawCircle, drawPolygon)

✅ **AudioLayer**: Complete abstraction replacing direct AudioContext usage:
- Replaces `new AudioContext()` with `initialize()`
- Replaces `decodeAudioData()` with `loadSound()`
- Replaces manual node graph creation with `playSound()`
- Handles browser autoplay policies with `resumeContext()`
- Full Web Audio API abstraction documented with implementation

✅ **WebPlatformLayer**: Concrete implementation using:
- PIXI.js (via PixiRenderingLayer)
- DOM AudioContext and Web Audio API (via WebAudioLayer)
- DOM events (via WebInputLayer)

✅ **MemoryPlatformLayer**: Headless implementation:
- State-tracking rendering layer (for verification)
- No-op audio layer
- No-op input layer

✅ **GameEngine.GameEngineOptions**: Replaces constructor parameter, contains `loader` and `platform`

✅ **GameCanvas Integration**:
- Platform layers accessed via `engine.platform` (Option C)
- `initialize()` takes no parameters (platform-agnostic)
- HTMLDivElement passed to WebPlatformLayer constructor
- Abstracted from web platform

✅ **Asset Loading Integration**: Spritesheet and BaseAssetLoader from game-base integrated with platform layers

## Detailed Design Specifications

### RenderingLayer Interface

```typescript
// Color type supporting both hex and RGB object formats
type Color = number | { r: number; g: number; b: number }

// Blend mode enum - basic set supported across all platforms
enum BlendMode {
  NORMAL = 'normal',
  ADD = 'add',
  MULTIPLY = 'multiply',
  SCREEN = 'screen'
}

// Texture filtering modes
enum TextureFiltering {
  LINEAR = 'linear',    // Smooth scaling (default)
  NEAREST = 'nearest'   // Pixel-perfect scaling (for pixel art)
}

interface RenderingLayer {
  // Node lifecycle
  createNode(): DisplayNode
  destroyNode(id: NodeId): void

  // Hierarchy
  addChild(parent: NodeId, child: NodeId): void
  removeChild(parent: NodeId, child: NodeId): void

  // Transform
  setPosition(id: NodeId, x: number, y: number): void
  setRotation(id: NodeId, radians: number): void
  setScale(id: NodeId, scaleX: number, scaleY: number): void
  setAnchor(id: NodeId, anchorX: number, anchorY: number): void
  setAlpha(id: NodeId, alpha: number): void
  setVisible(id: NodeId, visible: boolean): void
  setZIndex(id: NodeId, z: number): void

  // Size (in addition to scale)
  setSize(id: NodeId, width: number, height: number): void
  getSize(id: NodeId): { width: number; height: number }

  // Visual effects
  setTint(id: NodeId, color: Color): void
  setBlendMode(id: NodeId, mode: BlendMode): void
  setTextureFiltering(id: NodeId, filtering: TextureFiltering): void

  // Bounds query (for hit testing, UI layout, etc.)
  getBounds(id: NodeId): { x: number; y: number; width: number; height: number }

  // Visual content
  setSprite(id: NodeId, textureId: TextureId): void
  setAnimatedSprite(id: NodeId, textureIds: TextureId[], ticksPerFrame: number): void // Speed in ticks per frame (deterministic)
  playAnimation(id: NodeId, loop: boolean): void
  stopAnimation(id: NodeId): void

  // Primitives (with stroke support)
  drawRectangle(id: NodeId, x: number, y: number, w: number, h: number, fill?: Color, stroke?: Color, strokeWidth?: number): void
  drawCircle(id: NodeId, x: number, y: number, radius: number, fill?: Color, stroke?: Color, strokeWidth?: number): void
  drawPolygon(id: NodeId, points: number[], fill?: Color, stroke?: Color, strokeWidth?: number): void

  // Line drawing
  drawLine(id: NodeId, x1: number, y1: number, x2: number, y2: number, color: Color, width?: number): void
  drawPolyline(id: NodeId, points: number[], color: Color, width?: number): void

  clearGraphics(id: NodeId): void

  // Textures (returns pink checkerboard error texture on load failure)
  loadTexture(url: string): Promise<TextureId>
  loadSpritesheet(imageUrl: string, jsonData: any): Promise<SpritesheetId>
  getTexture(spritesheet: SpritesheetId, frameName: string): TextureId | null

  // Viewport
  setViewport(id: NodeId, options: ViewportOptions): void
  getViewportPosition(id: NodeId): { x: number, y: number }
  setViewportPosition(id: NodeId, x: number, y: number): void
  setViewportZoom(id: NodeId, zoom: number): void
  getViewportZoom(id: NodeId): number
  worldToScreen(id: NodeId, x: number, y: number): { x: number, y: number }
  screenToWorld(id: NodeId, x: number, y: number): { x: number, y: number }

  // Game loop
  onTick(callback: (deltaTicks: number) => void): void
  setTickerSpeed(speed: number): void

  // Canvas resize (called manually by frameworks like game-base/arcade2)
  resize(width: number, height: number): void
}
```

### DisplayNode Wrapper (OOP Interface)

```typescript
class DisplayNode {
  private readonly id: NodeId
  private readonly rendering: RenderingLayer

  // Hierarchy (fluent interface)
  addChild(child: DisplayNode): this
  removeChild(child: DisplayNode): this
  destroy(): void

  // Transform (fluent interface)
  setPosition(x: number, y: number): this
  setRotation(radians: number): this
  setScale(scaleX: number, scaleY?: number): this
  setAnchor(anchorX: number, anchorY: number): this
  setAlpha(alpha: number): this
  setVisible(visible: boolean): this
  setZIndex(z: number): this

  // Size (fluent interface)
  setSize(width: number, height: number): this
  getSize(): { width: number; height: number }

  // Visual effects (fluent interface)
  setTint(color: Color): this
  setBlendMode(mode: BlendMode): this
  setTextureFiltering(filtering: TextureFiltering): this

  // Bounds query
  getBounds(): { x: number; y: number; width: number; height: number }

  // Visual content (fluent interface)
  setSprite(textureId: TextureId): this
  setAnimatedSprite(textureIds: TextureId[], ticksPerFrame: number): this
  playAnimation(loop?: boolean): this
  stopAnimation(): this

  // Primitives (fluent interface) - with stroke support
  drawRectangle(x: number, y: number, width: number, height: number, fill?: Color, stroke?: Color, strokeWidth?: number): this
  drawCircle(x: number, y: number, radius: number, fill?: Color, stroke?: Color, strokeWidth?: number): this
  drawPolygon(points: number[], fill?: Color, stroke?: Color, strokeWidth?: number): this

  // Line drawing (fluent interface)
  drawLine(x1: number, y1: number, x2: number, y2: number, color: Color, width?: number): this
  drawPolyline(points: number[], color: Color, width?: number): this

  clearGraphics(): this

  // Access
  getId(): NodeId
}
```

**Usage Examples**:
```typescript
// Clean OOP API with method chaining
const player = rendering.createNode()
  .setSprite(playerTexture)
  .setAnchor(0.5, 1)
  .setPosition(100, 200)
  .setZIndex(10)
  .setTint(0xFF0000)  // Red tint
  .setBlendMode(BlendMode.ADD)  // Additive blending
  .playAnimation(true)

container.addChild(player)

// Pixel art sprite with nearest-neighbor filtering
const pixelSprite = rendering.createNode()
  .setSprite(pixelArtTexture)
  .setTextureFiltering(TextureFiltering.NEAREST)
  .setScale(4)  // Scale up without blur

// Shape with stroke
const box = rendering.createNode()
  .drawRectangle(0, 0, 100, 50, 0x0000FF, 0xFFFFFF, 2)  // Blue fill, white stroke, 2px width

// Line drawing for debug visualization
const debugLine = rendering.createNode()
  .drawLine(0, 0, 100, 100, 0xFF0000, 2)  // Red line, 2px width
```

### AudioLayer Interface

```typescript
interface AudioLayer {
  // Lifecycle
  initialize(): Promise<void>
  destroy(): void

  // Loading (AudioLayer owns all sound loading)
  loadSound(id: string, data: string | ArrayBuffer): Promise<void>

  // Procedural audio generation (eliminates need for isomorphic-web-audio-api)
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer
  loadSoundFromBuffer(id: string, buffer: AudioBuffer): void

  // Playback
  playSound(id: string, volume?: number, loop?: boolean): void
  stopSound(id: string): void
  stopAll(): void

  // Context management (browser autoplay policies)
  resumeContext(): Promise<void>
  getState(): AudioContextState
}
```

**Based on**: `RealAudioManager` and `DummyAudioManager` from game-base

#### WebAudioLayer Implementation - Replacing Direct AudioContext Usage

**Migration from Direct Web Audio API**:

| Current Game Code (Direct Web Audio API) | New AudioLayer API |
|------------------------------------------|-------------------|
| `const ctx = new AudioContext()` | `await audioLayer.initialize()` |
| `const buffer = await ctx.decodeAudioData(arrayBuffer)` | `await audioLayer.loadSound(id, arrayBuffer)` |
| `const source = ctx.createBufferSource()`<br>`const gain = ctx.createGain()`<br>`source.buffer = buffer`<br>`source.loop = true`<br>`gain.gain.value = 0.5`<br>`source.connect(gain)`<br>`gain.connect(ctx.destination)`<br>`source.start()` | `audioLayer.playSound(id, 0.5, true)` |
| `source.stop()` | `audioLayer.stopSound(id)` |
| `await ctx.resume()` | `await audioLayer.resumeContext()` |

**Concrete Implementation**:
```typescript
class WebAudioLayer implements AudioLayer {
  private audioContext: AudioContext
  private sounds: Map<string, AudioBuffer> = new Map()
  private activeSources: Set<AudioBufferSourceNode> = new Set()
  private loopingSources: Map<string, AudioBufferSourceNode> = new Map()

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext()
  }

  async loadSound(id: string, data: string | ArrayBuffer): Promise<void> {
    let arrayBuffer: ArrayBuffer
    if (typeof data === 'string') {
      // Convert data URI to ArrayBuffer
      arrayBuffer = this.dataUriToArrayBuffer(data)
    } else {
      arrayBuffer = data
    }
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    this.sounds.set(id, audioBuffer)
  }

  playSound(id: string, volume = 1.0, loop = false): void {
    const audioBuffer = this.sounds.get(id)
    if (!audioBuffer) return

    // Create Web Audio API node graph
    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()

    source.buffer = audioBuffer
    source.loop = loop
    gainNode.gain.value = volume

    // Connect: source -> gain -> destination
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    // Cleanup on end
    source.onended = () => {
      this.activeSources.delete(source)
      if (loop) this.loopingSources.delete(id)
    }

    // Track sources for stopAll()
    this.activeSources.add(source)
    if (loop) this.loopingSources.set(id, source)

    source.start()
  }

  stopSound(id: string): void {
    const source = this.loopingSources.get(id)
    if (source) {
      source.stop()
      this.loopingSources.delete(id)
    }
  }

  stopAll(): void {
    for (const source of this.activeSources) {
      source.stop()
    }
    this.activeSources.clear()
    this.loopingSources.clear()
  }

  async resumeContext(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  getState(): AudioContextState {
    return this.audioContext.state
  }

  destroy(): void {
    this.stopAll()
    this.audioContext.close()
  }
}
```

**Key Abstractions**:
- `AudioContext` creation/management hidden behind `initialize()`
- `decodeAudioData()` encapsulated in `loadSound()`
- Node graph (`createBufferSource`, `createGain`, `connect`) encapsulated in `playSound()`
- Source lifecycle management handled internally
- Browser autoplay policies handled via `resumeContext()`
- Procedural audio generation via `createBuffer()` - eliminates need for `isomorphic-web-audio-api` package

**Procedural Audio Migration Example** (Snakes-on-a-Chain):
```typescript
// OLD (with isomorphic shim):
import { AudioContext } from "isomorphic-web-audio-api"
const audioContext = new AudioContext()
const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
const channelData = buffer.getChannelData(0)
// ... fill channelData with procedurally generated audio ...
audioManager.loadSoundFromBuffer('beep', buffer)

// NEW (platform abstraction - no shim needed):
const buffer = audioLayer.createBuffer(1, sampleRate * duration, sampleRate)
const channelData = buffer.getChannelData(0)
// ... fill channelData with procedurally generated audio ...
audioLayer.loadSoundFromBuffer('beep', buffer)
```

### InputLayer Interface

```typescript
interface InputLayer {
  // Event subscription
  onPointerDown(callback: (event: InputEvent) => void): void
  onPointerUp(callback: (event: InputEvent) => void): void
  onPointerMove(callback: (event: InputEvent) => void): void
  onClick(callback: (event: InputEvent) => void): void
  onKeyDown(callback: (event: KeyboardInputEvent) => void): void
  onKeyUp(callback: (event: KeyboardInputEvent) => void): void

  // Cleanup
  removeAllListeners(): void
}

interface InputEvent {
  x: number
  y: number
  button?: number
  timestamp: number
}

interface KeyboardInputEvent {
  key: string
  code: string
  timestamp: number
}

### Type Safety: Branded IDs

To prevent mixing up different types of IDs (e.g. passing a TextureId where a NodeId is expected), we will use TypeScript "branded types".

```typescript
// Utility for creating branded types
type Brand<K, T> = K & { __brand: T }

export type NodeId = Brand<number, 'NodeId'>
export type TextureId = Brand<number, 'TextureId'>
export type SpritesheetId = Brand<number, 'SpritesheetId'>
export type SoundId = Brand<string, 'SoundId'>

// Helper to cast raw values (use carefully, mostly inside the platform layer)
export function asNodeId(id: number): NodeId { return id as NodeId }
```
```

**Coordinate System**:
- ✅ **Screen-space coordinates**: InputLayer always provides coordinates in screen-space (pixels relative to canvas element)
- ✅ **Transformation responsibility**: Game code uses `RenderingLayer.screenToWorld()` to convert to world coordinates when needed
- ✅ **Viewport independence**: InputLayer has no knowledge of viewport transformations

**Usage Pattern**:
```typescript
// Subscribe to input events
inputLayer.onPointerDown((event) => {
  // event.x, event.y are screen-space coordinates
  const screenX = event.x
  const screenY = event.y

  // Transform to world coordinates using viewport
  const worldPos = rendering.screenToWorld(viewportNode.getId(), screenX, screenY)

  // Use world coordinates for game logic
  handleClick(worldPos.x, worldPos.y)
})
```

## Concrete Implementations

### WebPlatformLayer

```typescript
class WebPlatformLayer implements PlatformLayer {
  rendering: PixiRenderingLayer
  audio: WebAudioLayer
  input: WebInputLayer

  constructor(container: HTMLDivElement, options: WebPlatformOptions) {
    this.rendering = new PixiRenderingLayer(container, options)
    this.audio = new WebAudioLayer()
    this.input = new WebInputLayer(container)
  }

  getDevicePixelRatio(): number {
    return window.devicePixelRatio || 1
  }
}
```

**Implementation Notes**:

#### Error Texture (Pink Checkerboard)
```typescript
// In PixiRenderingLayer
async loadTexture(url: string): Promise<TextureId> {
  try {
    const texture = await PIXI.Assets.load(url)
    return this.registerTexture(texture)
  } catch (error) {
    console.error(`Failed to load texture: ${url}`, error)
    return this.getErrorTexture()
  }
}

private getErrorTexture(): TextureId {
  if (!this.errorTexture) {
    // Create 32x32 pink/magenta checkerboard
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = ((x + y) % 2 === 0) ? '#FF00FF' : '#000000'
        ctx.fillRect(x * 8, y * 8, 8, 8)
      }
    }

    this.errorTexture = this.registerTexture(PIXI.Texture.from(canvas))
  }
  return this.errorTexture
}
```

#### Resize Handling
```typescript
// In PixiRenderingLayer
resize(width: number, height: number): void {
  this.app.renderer.resize(width, height)
  if (this.viewport) {
    this.viewport.resize(width, height)
  }
}
```

**Resize Pattern** (matches game-base and arcade2):
- Frameworks listen to `window.addEventListener('resize')` with 100ms debounce
- Frameworks call `rendering.resize(width, height)` on resize events
- Engine/platform does NOT auto-listen to resize - keeps separation of concerns

**PixiRenderingLayer**: Wraps PIXI.js Application, Viewport, Container hierarchy
**WebAudioLayer**: Wraps Web Audio API (AudioContext, AudioBuffer, etc.)
**WebInputLayer**: Wraps DOM pointer/keyboard events

### MemoryPlatformLayer

```typescript
class MemoryPlatformLayer implements PlatformLayer {
  rendering: MemoryRenderingLayer
  audio: MemoryAudioLayer
  input: MemoryInputLayer

  constructor() {
    this.rendering = new MemoryRenderingLayer()
    this.audio = new MemoryAudioLayer()
    this.input = new MemoryInputLayer()
  }

  getDevicePixelRatio(): number {
    return 1  // Always 1 for headless
  }
}
```

**MemoryRenderingLayer**: Tracks node state (position, rotation, etc.) without rendering
- Tracks bounds for `getBounds()` queries
- Mocks all visual effects (tint, blend mode, filtering)
- Validates calls but performs no actual rendering

**MemoryAudioLayer**: No-op implementation for headless replay
- `createBuffer()` returns mock AudioBuffer object
- All playback methods are no-ops

**MemoryInputLayer**: No-op implementation (input comes from recordings)

## Integration Points

### GameEngine Changes

```typescript
// Current
class GameEngine {
  constructor(loader: Loader) {
    // ...
  }
}

// New
class GameEngine {
  constructor(options: GameEngineOptions) {
    this.loader = options.loader
    this.platform = options.platform
  }

  protected setupUpdateLoop(): void {
    // Use platform rendering layer for tick
    this.platform.rendering.onTick((deltaTicks) => {
      this.update(deltaTicks)
    })
  }
}

interface GameEngineOptions {
  loader: Loader
  platform: PlatformLayer
}
```

### GameCanvas Changes

```typescript
// Current
abstract class GameCanvas {
  constructor(options: GameCanvasOptions, engine: GameEngine) {
    // Creates PIXI.Application directly
  }

  async initialize(container: HTMLDivElement): Promise<void> {
    // ...
  }
}

// New
abstract class GameCanvas {
  protected rendering: RenderingLayer
  protected audio: AudioLayer
  protected input: InputLayer
  protected worldNode: DisplayNode
  protected hudNode: DisplayNode

  constructor(options: GameCanvasOptions, engine: GameEngine) {
    // Get platform layers from engine (Option C)
    this.rendering = engine.platform.rendering
    this.audio = engine.platform.audio
    this.input = engine.platform.input
  }

  async initialize(): Promise<void> {
    // No parameters - platform already initialized via engine
    // Create nodes instead of PIXI containers
    this.worldNode = this.rendering.createNode()
    this.hudNode = this.rendering.createNode()

    // Setup viewport on worldNode
    this.rendering.setViewport(this.worldNode.getId(), {
      screenWidth: options.width,
      screenHeight: options.height,
      worldWidth: options.worldWidth,
      worldHeight: options.worldHeight,
      enableDrag: true,
      enableZoom: true
    })

    // Setup input handlers
    this.input.onPointerDown((event) => this.handlePointerDown(event))
    // ... other input subscriptions
  }

  protected abstract handlePointerDown(event: InputEvent): void
}
```

**Initialization Flow** (HTMLDivElement handling):

```typescript
// Web Platform - container passed to platform constructor
const container = document.getElementById('game') as HTMLDivElement
const webPlatform = new WebPlatformLayer(container, {
  width: 800,
  height: 600,
  backgroundColor: 0x1a1a2e
})

// Engine receives platform
const engine = new GameEngine({
  loader: myLoader,
  platform: webPlatform
})

// Canvas receives engine (gets platform from engine.platform)
const canvas = new MyGameCanvas({
  width: 800,
  height: 600,
  worldWidth: 2000,
  worldHeight: 1500
}, engine)

// Initialize canvas (no parameters needed)
await canvas.initialize()

// Memory Platform - no container needed
const memoryPlatform = new MemoryPlatformLayer()
const engine = new GameEngine({
  loader: myLoader,
  platform: memoryPlatform
})
const canvas = new MyGameCanvas(options, engine)
await canvas.initialize() // Same API!
```

**Key Points**:
- ✅ HTMLDivElement passed to `WebPlatformLayer` constructor (platform-specific)
- ✅ `GameCanvas.initialize()` takes no parameters (platform-agnostic)
- ✅ Platform layers accessed via `engine.platform` (single source of truth)
- ✅ Same initialization flow for web and memory platforms
- ✅ GameCanvas never directly references web-specific APIs
```

### AbstractRenderer Changes

```typescript
// Current
abstract class AbstractRenderer<T extends GameObject> {
  constructor(protected containerParent: PIXI.Container) {
    // ...
  }

  protected createCircle(radius: number, color: number): PIXI.Graphics {
    // Uses PIXI.Graphics directly
  }
}

// New
abstract class AbstractRenderer<T extends GameObject> {
  protected rendering: RenderingLayer

  constructor(protected containerParent: DisplayNode, rendering: RenderingLayer) {
    this.rendering = rendering
  }

  protected createCircle(radius: number, fill: Color, stroke?: Color, strokeWidth?: number): DisplayNode {
    return this.rendering.createNode()
      .drawCircle(0, 0, radius, fill, stroke, strokeWidth)
  }

  // create() now returns DisplayNode instead of PIXI.Container
  abstract create(object: T): Promise<DisplayNode>
  abstract updateContainer(node: DisplayNode, object: T): void
}
```

## Asset Loading Integration

From game-base, integrate:

### Spritesheet Class

```typescript
class Spritesheet {
  static async load(
    loader: Loader,
    rendering: RenderingLayer,
    imageFile: string,
    jsonFile?: string
  ): Promise<Spritesheet>

  getTexture(name: string): TextureId | undefined
  getAnimationFrames(prefix: string): TextureId[]
}
```

### AssetLoader Class

```typescript
class AssetLoader {
  constructor(
    protected loader: Loader,
    protected rendering: RenderingLayer,
    protected audio: AudioLayer
  )

  register(id: string, type: AssetType): void
  async loadSpritesheet(id: string): Promise<Spritesheet>
  async loadStaticImage(id: string): Promise<TextureId>
  async loadSound(id: string): Promise<void>
  async preloadAssets(onProgress?: ProgressCallback): Promise<void>
  getSpritesheet(id: string): Spritesheet | undefined
  getStaticImage(id: string): TextureId | undefined
}
```

Games can use `AssetLoader` directly or extend it for custom loading behavior.

## HeadlessLoader for In-Memory Replay

### Purpose
Enable server-side replay validation with minimal overhead. HeadlessLoader returns empty strings for all assets since MemoryPlatformLayer doesn't need actual asset data for replay validation.

### Implementation

```typescript
/**
 * Minimal loader for headless in-memory replay.
 * Returns empty strings for all assets since MemoryPlatformLayer
 * doesn't need actual asset data.
 */
export class HeadlessLoader extends Loader {
  async fetchData(id: string, meta?: Record<string, any>): Promise<string | ArrayBuffer> {
    // Return empty string - MemoryPlatformLayer handles this
    return ''
  }
}
```

**Key Points**:
- Ultra-simple implementation
- No caching needed (returns instantly)
- No asset pre-loading required
- Works with MemoryPlatformLayer which handles empty strings gracefully

### Usage Pattern

```typescript
// Headless replay setup
const loader = new HeadlessLoader()
const platform = new MemoryPlatformLayer()
const engine = new TestGameEngine({ loader, platform })

await engine.reset(recording.gameConfig)

const replayManager = new ReplayManager(engine)
await replayManager.replay(recording)

// Process replay...
```

## Asset Preloading System

### Purpose
Allow games to declare required assets that are automatically preloaded during `GameEngine.reset()` before `setup()` is called. This ensures all assets are loaded before game initialization.

### AssetLoader Implementation

```typescript
export type AssetType = 'spritesheet' | 'staticImage' | 'sound'

/**
 * Concrete asset loader based on game-base and tiki-kong patterns.
 * Games can use directly or extend for custom behavior.
 */
export class AssetLoader {
  private spritesheets = new Map<string, Spritesheet>()
  private staticImages = new Map<string, TextureId>()
  private sounds = new Set<string>()

  // Asset registration
  private registeredSpritesheets: string[] = []
  private registeredStaticImages: string[] = []
  private registeredSounds: string[] = []

  constructor(
    protected loader: Loader,
    protected rendering: RenderingLayer,
    protected audio: AudioLayer
  ) {}

  /**
   * Register an asset to be preloaded.
   * Call this during game initialization for all required assets.
   */
  register(id: string, type: AssetType): void {
    switch (type) {
      case 'spritesheet':
        if (!this.registeredSpritesheets.includes(id)) {
          this.registeredSpritesheets.push(id)
        }
        break
      case 'staticImage':
        if (!this.registeredStaticImages.includes(id)) {
          this.registeredStaticImages.push(id)
        }
        break
      case 'sound':
        if (!this.registeredSounds.has(id)) {
          this.registeredSounds.add(id)
        }
        break
    }
  }

  /**
   * Preload all registered assets.
   * Called by GameEngine.reset() before setup().
   */
  async preloadAssets(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const tasks: Promise<void>[] = []
    let loaded = 0
    const total = this.registeredSpritesheets.length +
                  this.registeredStaticImages.length +
                  this.registeredSounds.size

    const trackProgress = () => {
      loaded++
      onProgress?.(loaded, total)
    }

    // Load spritesheets
    for (const id of this.registeredSpritesheets) {
      tasks.push(this.loadSpritesheet(id).then(trackProgress))
    }

    // Load static images
    for (const id of this.registeredStaticImages) {
      tasks.push(this.loadStaticImage(id).then(trackProgress))
    }

    // Load sounds
    for (const id of this.registeredSounds) {
      tasks.push(this.loadSound(id).then(trackProgress))
    }

    await Promise.all(tasks)
  }

  // Asset loading (virtual methods - games can override in subclass)
  async loadSpritesheet(id: string): Promise<Spritesheet> {
    // Load image data
    const imageData = await this.loader.fetchData(`sprites/${id}.png`)
    const imageUrl = this.createUrlFromData(imageData, 'image/png')
    
    // Load JSON data (always string)
    const jsonContent = await this.loader.fetchData(`sprites/${id}.json`)
    const jsonData = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent

    const spritesheet = await Spritesheet.load(
      this.loader,
      this.rendering,
      imageUrl,
      jsonData
    )
    this.spritesheets.set(id, spritesheet)
    return spritesheet
  }

  async loadStaticImage(id: string): Promise<TextureId> {
    const data = await this.loader.fetchData(`images/${id}.png`)
    const url = this.createUrlFromData(data, 'image/png')
    
    const textureId = await this.rendering.loadTexture(url)
    this.staticImages.set(id, textureId)
    return textureId
  }

  async loadSound(id: string): Promise<void> {
    const data = await this.loader.fetchData(`sounds/${id}.wav`)
    await this.audio.loadSound(id, data)
  }

  /**
   * Helper to convert Loader data (String/ArrayBuffer) to a usable URL.
   * - Strings are returned as-is (assumed to be URLs or Data URIs)
   * - ArrayBuffers are converted to Blob URLs
   */
  protected createUrlFromData(data: string | ArrayBuffer, mimeType: string): string {
    if (typeof data === 'string') {
      return data
    }
    
    // Convert ArrayBuffer to Blob URL
    const blob = new Blob([data], { type: mimeType })
    return URL.createObjectURL(blob)
  }

  // Getters (from game-base pattern)
  getSpritesheet(id: string): Spritesheet | undefined {
    return this.spritesheets.get(id)
  }

  getStaticImage(id: string): TextureId | undefined {
    return this.staticImages.get(id)
  }
}
```

### Game Usage Examples

**Direct Usage (Simple Games)**:
```typescript
// Use AssetLoader directly without extending
const loader = new DemoLoader()
const platform = new WebPlatformLayer(container, options)
const assetLoader = new AssetLoader(loader, platform.rendering, platform.audio)

// Register assets
assetLoader.register('player', 'spritesheet')
assetLoader.register('enemy', 'spritesheet')
assetLoader.register('tileset', 'spritesheet')
assetLoader.register('logo', 'staticImage')
assetLoader.register('background', 'staticImage')
assetLoader.register('jump', 'sound')
assetLoader.register('hit', 'sound')

// Create engine
const engine = new MyGameEngine({ loader, platform, assetLoader })
await engine.reset(config)

// Use loaded assets
const playerSheet = assetLoader.getSpritesheet('player')
const logoTexture = assetLoader.getStaticImage('logo')
```

**Custom Subclass (Complex Games)**:
```typescript
// Extend AssetLoader for custom path logic
class TikiKongAssetLoader extends AssetLoader {
  async loadSpritesheet(id: string): Promise<Spritesheet> {
    // Custom path convention
    const spritesheet = await Spritesheet.load(
      this.loader,
      this.rendering,
      `game-assets/spritesheets/${id}.png`
    )
    this.spritesheets.set(id, spritesheet)
    return spritesheet
  }

  async loadSound(id: string): Promise<void> {
    // Try mp3 first, fallback to wav
    let data: string
    try {
      data = await this.loader.fetchData(`sounds/${id}.mp3`)
    } catch {
      data = await this.loader.fetchData(`sounds/${id}.wav`)
    }
    await this.audio.loadSound(id, data)
  }
}

// Usage
const assetLoader = new TikiKongAssetLoader(loader, platform.rendering, platform.audio)
assetLoader.register('kong', 'spritesheet')
assetLoader.register('barrel', 'spritesheet')
assetLoader.register('roar', 'sound')

const engine = new TikiKongEngine({ loader, platform, assetLoader })
```

### GameEngine Integration

```typescript
export interface GameEngineOptions {
  loader: Loader
  platform: PlatformLayer
  assetLoader?: AssetLoader  // Optional - games provide if needed
}

export abstract class GameEngine {
  protected loader: Loader
  protected platform: PlatformLayer
  protected assetLoader?: AssetLoader

  constructor(options: GameEngineOptions) {
    this.loader = options.loader
    this.platform = options.platform
    this.assetLoader = options.assetLoader
  }

  /**
   * Reset the game to initial state.
   * Preloads assets before calling setup() if assetLoader is provided.
   */
  async reset(config: GameConfig): Promise<void> {
    this.state = GameState.READY

    // Preload assets before setup (if asset loader provided)
    if (this.assetLoader?.preloadAssets) {
      await this.assetLoader.preloadAssets()
    }

    // Now setup can assume all assets are loaded
    await this.setup(config)
  }
}
```

### MemoryPlatformLayer Empty String Handling

**MemoryRenderingLayer**:
```typescript
class MemoryRenderingLayer implements RenderingLayer {
  async loadTexture(url: string): Promise<TextureId> {
    // Empty string from HeadlessLoader - just return mock ID
    const id = this.nextTextureId++
    this.textures.set(id, { url, width: 0, height: 0 })
    return id
  }

  async loadSpritesheet(imageUrl: string, jsonData: any): Promise<SpritesheetId> {
    // Empty imageUrl and empty jsonData from HeadlessLoader
    // Just return mock spritesheet with no frames
    const id = this.nextSpritesheetId++
    this.spritesheets.set(id, { frames: new Map() })
    return id
  }

  getTexture(spritesheet: SpritesheetId, frameName: string): TextureId | null {
    // Return null or mock texture - doesn't matter for replay
    return null
  }
}
```

**MemoryAudioLayer**:
```typescript
class MemoryAudioLayer implements AudioLayer {
  async loadSound(id: string, data: string | ArrayBuffer): Promise<void> {
    // Empty string from HeadlessLoader - no-op
  }

  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    // Return minimal mock
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length)
    } as AudioBuffer
  }
}
```

## Headless Replay Testing

### Comprehensive Test Coverage

```typescript
describe('Headless In-Memory Replay', () => {
  it('should replay recording with HeadlessLoader + MemoryPlatformLayer', async () => {
    // 1. Create headless components
    const loader = new HeadlessLoader()
    const platform = new MemoryPlatformLayer()

    // 2. Create asset loader (optional for headless - can be omitted)
    const assetLoader = new AssetLoader(loader, platform.rendering, platform.audio)
    assetLoader.register('player', 'spritesheet')
    assetLoader.register('enemy', 'spritesheet')

    // 3. Create engine with asset loader
    const engine = new TestGameEngine({ loader, platform, assetLoader })

    // 4. Reset (will call preloadAssets automatically)
    await engine.reset(recording.gameConfig)

    // 5. Replay
    const replayManager = new ReplayManager(engine)
    await replayManager.replay(recording)

    // 6. Process replay with timeout protection
    const startTime = Date.now()
    const TIMEOUT_MS = 10000
    let progress = replayManager.getReplayProgress()

    while (progress.progress < 1.0) {
      expect(Date.now() - startTime).toBeLessThan(TIMEOUT_MS)

      engine.update(recording.totalTicks)
      await new Promise(resolve => setTimeout(resolve, 100))

      progress = replayManager.getReplayProgress()
    }

    // 7. Validate final state
    const snapshot = engine.getGameSnapshot()
    expect(snapshot).toMatchObject(recording.expectedSnapshot)
  })

  it('should handle asset loading with empty strings', async () => {
    const loader = new HeadlessLoader()
    const platform = new MemoryPlatformLayer()

    // Verify empty strings don't break anything
    const textureId = await platform.rendering.loadTexture('')
    expect(textureId).toBeDefined()

    const spritesheetId = await platform.rendering.loadSpritesheet('', {})
    expect(spritesheetId).toBeDefined()

    await platform.audio.loadSound('test', '')
    // Should not throw
  })

  it('should complete deterministic replay', async () => {
    const loader = new HeadlessLoader()
    const platform = new MemoryPlatformLayer()

    // Run same recording twice
    const results = []
    for (let i = 0; i < 2; i++) {
      const engine = new TestGameEngine({ loader, platform })
      await engine.reset(recording.gameConfig)

      const replayManager = new ReplayManager(engine)
      await replayManager.replay(recording)

      let progress = replayManager.getReplayProgress()
      while (progress.progress < 1.0) {
        engine.update(recording.totalTicks)
        await new Promise(resolve => setTimeout(resolve, 100))
        progress = replayManager.getReplayProgress()
      }

      results.push(engine.getGameSnapshot())
    }

    // Both replays should produce identical results
    expect(results[0]).toEqual(results[1])
  })
})
```

**Test Pattern** (based on arcade2):
1. **Timeout Protection**: Always use timeout guards for replay loops
2. **Progress Polling**: Sleep between update() calls to allow async operations
3. **Determinism Verification**: Run same replay multiple times, verify identical results
4. **Empty String Handling**: Verify MemoryPlatformLayer handles empty asset data
5. **Final State Validation**: Extract and verify game snapshot matches expected state

## Implementation Progress

**Current Status**: Phases 1A, 1B, and 3 complete, ready for Phase 2 (Web Platform)
**Milestone Target**: Phases 1-6 complete

### Phase 1A: Core Abstractions - Interfaces & Types
- [x] Create `src/platform/types.ts` (branded IDs)
- [x] Create `src/platform/PlatformLayer.ts`
- [x] Create `src/platform/RenderingLayer.ts`
- [x] Create `src/platform/AudioLayer.ts`
- [x] Create `src/platform/InputLayer.ts`
- [x] Create `src/platform/index.ts`
- [x] Write tests: `tests/platform/types.test.ts`
- [x] Write tests: `tests/platform/interfaces.test.ts`
- Status: ✅ Complete (2025-11-21)
- Tests: 27/27 passing
- Issues: None

### Phase 1B: DisplayNode Wrapper
- [x] Create `src/platform/DisplayNode.ts`
- [x] Write tests: `tests/platform/DisplayNode.test.ts`
- [x] Export from `src/platform/index.ts`
- Status: ✅ Complete (2025-11-21)
- Tests: 38/38 passing
- Issues: None

### Phase 2: Web Implementations
**Setup:**
- [ ] Configure puppeteer/playwright for headless browser testing
- [ ] Create `tests/setup/browser.setup.ts`
- [ ] Create `tests/fixtures/dom.fixtures.ts`

**2A: PixiRenderingLayer**
- [ ] Create `src/platform/web/PixiRenderingLayer.ts`
- [ ] Write tests (40+ test cases for all RenderingLayer methods)
- [ ] Implement error texture (pink checkerboard)
- [ ] Implement viewport integration
- [ ] Implement ticker integration

**2B: WebAudioLayer**
- [ ] Create `src/platform/web/WebAudioLayer.ts`
- [ ] Write tests (procedural audio, context management)
- [ ] Implement sound loading and playback
- [ ] Implement createBuffer for procedural audio

**2C: WebInputLayer**
- [ ] Create `src/platform/web/WebInputLayer.ts`
- [ ] Write tests (DOM event wrapping)
- [ ] Implement event subscription
- [ ] Implement coordinate normalization

**2D: WebPlatformLayer**
- [ ] Create `src/platform/web/WebPlatformLayer.ts`
- [ ] Create `src/platform/web/index.ts`
- [ ] Write integration tests
- Status: ⏸️ Not started
- Tests: 0/0 passing
- Issues: None

### Phase 3: Memory Implementations & Testing Infra
**3A: MemoryRenderingLayer**
- [x] Create `src/platform/memory/MemoryRenderingLayer.ts`
- [x] Write tests (state tracking, bounds calculation)
- [x] Implement state tracking for all methods
- [x] Implement bounds calculation

**3B: MemoryAudioLayer & MemoryInputLayer**
- [x] Create `src/platform/memory/MemoryAudioLayer.ts`
- [x] Create `src/platform/memory/MemoryInputLayer.ts`
- [x] Write tests (no-op validation)

**3C: MemoryPlatformLayer**
- [x] Create `src/platform/memory/MemoryPlatformLayer.ts`
- [x] Create `src/platform/memory/index.ts`
- [x] Write integration tests
- Status: ✅ Complete (2025-11-21)
- Tests: 93/93 passing (44 rendering + 22 audio + 16 input + 11 platform)
- Issues: None

### Phase 4: Engine Integration ⚠️ BREAKING CHANGE
- [ ] Update `src/GameEngine.ts` constructor signature
- [ ] Create `GameEngineOptions` interface
- [ ] Update setupUpdateLoop to use platform.rendering.onTick()
- [ ] Write tests: `tests/GameEngine.platform.test.ts`
- [ ] Update all existing GameEngine tests
- Status: ⏸️ Not started
- Tests: 0/0 passing
- Breaking Changes: Yes - constructor signature changes
- Issues: None

### Phase 5: Canvas Refactor ⚠️ BREAKING CHANGE
- [ ] Update `src/GameCanvas.ts` to use platform layers
- [ ] Remove PIXI.js direct usage
- [ ] Replace PIXI.Container with DisplayNode
- [ ] Update initialize() to remove container parameter
- [ ] Write tests: `tests/GameCanvas.platform.test.ts`
- [ ] Update all existing GameCanvas tests
- Status: ⏸️ Not started
- Tests: 0/0 passing
- Breaking Changes: Yes - initialize() signature changes
- Issues: None

### Phase 6: Renderer Refactor ⚠️ BREAKING CHANGE
- [ ] Update `src/rendering/AbstractRenderer.ts`
- [ ] Replace PIXI.Container with DisplayNode
- [ ] Update create() return type
- [ ] Update helper methods (createCircle, createRectangle, etc.)
- [ ] Write tests: `tests/rendering/AbstractRenderer.platform.test.ts`
- [ ] Update all existing AbstractRenderer tests
- Status: ⏸️ Not started
- Tests: 0/0 passing
- Breaking Changes: Yes - constructor and method signatures change
- Issues: None

### 🎉 Milestone 1: Phases 1-6 Complete
**Target Date**: TBD
**Status**: ⏸️ Not started

**Deliverables:**
- ✅ Complete platform abstraction layer
- ✅ Web platform (PIXI.js + Web Audio + DOM)
- ✅ Memory platform (headless testing)
- ✅ GameEngine uses platforms
- ✅ GameCanvas uses platforms
- ✅ AbstractRenderer uses platforms

**Known Breakages:**
- ❌ Demo app (Phase 8)
- ❌ Asset loading patterns (Phase 7)

---

### Phase 7: Asset Loading (Post-Milestone 1)
- [ ] Port Spritesheet class from game-base
- [ ] Create AssetLoader class
- [ ] Add to GameEngineOptions (optional)
- [ ] Integrate with GameEngine.reset()
- Status: ⏸️ Not started
- Tests: 0/0 passing

### Phase 8: Demo Updates (Post-Milestone 1)
- [ ] Update demo initialization
- [ ] Migrate all demo renderers
- [ ] Visual parity verification
- [ ] Performance benchmarks
- Status: ⏸️ Not started
- Tests: 0/0 passing

### Phase 9: Testing & Validation (Post-Milestone 1)
- [ ] Comprehensive unit tests
- [ ] Integration tests
- [ ] Performance benchmarks
- [ ] Visual regression tests
- Status: ⏸️ Not started
- Coverage: 0%

### Phase 10: Headless Replay Infrastructure (Post-Milestone 1)
- [ ] Implement HeadlessLoader
- [ ] Create replay test patterns
- [ ] Documentation
- Status: ⏸️ Not started
- Tests: 0/0 passing

---

## Migration Strategy

### Phase 1: Core Abstractions
1. Create `PlatformLayer` interface
2. Create `RenderingLayer` interface and `DisplayNode` wrapper
3. Create `AudioLayer` interface
4. Create `InputLayer` interface
5. Add type definitions (`NodeId`, `TextureId`, `SpritesheetId`)

### Phase 2: Web Implementations
1. Implement `PixiRenderingLayer` wrapping current PIXI.js code
   - Error texture generation (pink checkerboard)
   - Dual color format support (hex + RGB object)
   - Blend mode support (NORMAL, ADD, MULTIPLY, SCREEN)
   - Texture filtering (NEAREST, LINEAR)
   - Bounds querying
   - Size getters/setters
   - Viewport zoom query
   - Resize method
   - Line/polyline drawing
   - Stroke support for primitives
   - Tinting support
2. Implement `WebAudioLayer` wrapping Web Audio API
   - Procedural audio: `createBuffer()` and `loadSoundFromBuffer()`
3. Implement `WebInputLayer` wrapping DOM events
4. Create `WebPlatformLayer` composition
   - Add `getDevicePixelRatio()` method

### Phase 3: Memory Implementations & Testing Infra
1. Implement `MemoryRenderingLayer` with state tracking
   - Track bounds for `getBounds()`
   - Mock all new visual features
   - Return default values for query methods
2. Implement `MemoryAudioLayer` (no-op)
   - Mock `createBuffer()` to return AudioBuffer-like object
3. Implement `MemoryInputLayer` (no-op)
4. Create `MemoryPlatformLayer` composition
   - `getDevicePixelRatio()` returns `1`
5. **Setup Test Infrastructure**
   - Configure test runner (Jest/Vitest) to use `MemoryPlatformLayer`
   - Create basic "sanity check" test that boots the engine with memory platform
   - Ensure `HeadlessLoader` works in the test environment

### Phase 4: Engine Integration
1. Update `GameEngineOptions` to accept `PlatformLayer`
2. Refactor `GameEngine.setupUpdateLoop()` to use platform ticker
3. Update engine to pass platform to canvas/renderers

### Phase 5: Canvas Refactor
1. Update `GameCanvas.initialize()` to use `RenderingLayer`
2. Replace PIXI.Container with `DisplayNode`
3. Update viewport management to use platform APIs
4. Update event handling to use `InputLayer`

### Phase 6: Renderer Refactor
1. Update `AbstractRenderer` to use `RenderingLayer`
2. Update helper methods to return `DisplayNode`
3. Change `create()` return type from PIXI.Container to DisplayNode
4. Update `updateContainer()` parameter to DisplayNode

### Phase 7: Asset Loading
1. Port `Spritesheet` class from game-base
   - Update to use `RenderingLayer.loadTexture()` with error texture support
2. Create `AssetLoader` class (concrete, based on game-base and tiki-kong patterns)
   - Remove HTML5 Audio API usage (`new Audio()`)
   - Consolidate all sound loading through `AudioLayer.loadSound()`
   - Add `register(id: string, type: AssetType)` method for asset registration
   - Implement `preloadAssets()` method with progress callback support
   - Add `getSpritesheet()`, `getStaticImage()` getters
   - Virtual `load*()` methods for subclass customization
3. Update `GameEngineOptions` to accept optional `assetLoader`
4. Update `GameEngine.reset()` to call `assetLoader.preloadAssets()` if provided
5. Integrate with platform `RenderingLayer` and `AudioLayer`

### Phase 8: Demo Updates
1. Update demo to create `WebPlatformLayer`
2. Update demo `GameEngine` initialization
3. Update demo `GameCanvas` subclass
4. Update demo renderers
5. Test visual parity with current implementation

### Phase 9: Testing & Validation
1. Unit tests for each layer implementation
2. Integration tests for platform switching
3. Replay verification tests using `MemoryPlatformLayer`
4. Visual regression tests for demo
5. Performance benchmarking
(Note: Core test infra is set up in Phase 3, this phase focuses on expanding coverage)

### Phase 10: Headless Replay Infrastructure
1. Implement `HeadlessLoader` class (returns empty strings)
2. Update `MemoryRenderingLayer` to handle empty asset data
3. Update `MemoryAudioLayer` to handle empty asset data
4. Verify `GameEngine.reset()` preloading hook works with `AssetLoader`
5. Create comprehensive replay test suite using test game engine
6. Verify timeout protection and progress tracking
7. Document server-side replay validation patterns

## Success Criteria

✅ **Platform Independence**: Engine code has no direct PIXI.js, DOM, or Web Audio API imports
✅ **No Isomorphic Shims**: Games don't need `isomorphic-web-audio-api` or platform detection packages
✅ **Procedural Audio**: Games can generate audio programmatically via `createBuffer()` (snakes-on-a-chain use case)
✅ **Visual Parity**: Demo looks and behaves identically to current implementation
✅ **Error Resilience**: Missing assets show pink checkerboard, games continue running
✅ **Pixel Art Support**: Texture filtering enables crisp pixel art rendering
✅ **Complete Visual Control**: Tinting, blending, filtering, sizing all supported
✅ **Bounds Query**: Games can perform hit testing via InputLayer + `getBounds()`
✅ **Resize Handling**: Frameworks call `resize()` method, pattern matches arcade2/game-base
✅ **Replay Verification**: Can run headless replay verification with `MemoryPlatformLayer`
✅ **Performance**: No significant performance degradation (<5% overhead)
✅ **Type Safety**: Full TypeScript type safety maintained
✅ **API Clarity**: Clean, intuitive OOP-style API for game developers
✅ **Extensibility**: Easy to add new platform implementations (Canvas2D, Unity, etc.)
✅ **Headless Replay**: In-memory replay with `HeadlessLoader` + `MemoryPlatformLayer` validates game logic
✅ **Asset Preloading**: Games can declare required assets, automatically preloaded in `reset()`
✅ **No Asset Data Needed**: `MemoryPlatformLayer` handles empty strings from `HeadlessLoader`
✅ **GameCanvas Optional**: Replay validation works without `GameCanvas` initialization

## Open Questions & Future Considerations

### Current Plan Items
- None pending (all decisions made and documented)

### Audio Limitations (Current Scope)
The current AudioLayer interface covers basic game audio needs:
- Load and play sounds
- Volume control
- Looping
- Stop individual/all sounds

**Not Currently Supported** (can be added later if needed):
- Spatial audio (3D positioning, panning)
- Audio effects (reverb, filters, convolution)
- Dynamic volume changes during playback
- Seeking to specific time positions
- Playback position queries
- Multiple audio contexts
- Advanced routing (send/receive buses)

These features are not used by the reference games (tiki-kong, snakes-on-a-chain) and can be added to AudioLayer as extension methods if future games require them.

### Future Extensions
1. **Canvas2D Platform**: Fallback rendering for older browsers
2. **Text Rendering**: Add text node support to RenderingLayer (not needed currently - games use DOM overlay)
3. **Masking/Clipping**: Add sprite masking support (not needed currently)
4. **Fullscreen API**: Add `requestFullscreen()`/`exitFullscreen()` to PlatformLayer (not needed currently)
5. **Focus/Blur Handling**: Auto-pause on blur events (not needed - games handle manually)
6. **Particles**: Particle system abstraction
7. **Post-Processing**: Shader/filter abstraction
8. **Physics Integration**: Platform-agnostic physics layer
9. **Network Layer**: For multiplayer/server-authoritative games
10. **Storage Layer**: Platform-agnostic save/load

## Technical Debt Considerations

### Potential Issues
1. **PIXI.js Leakage**: Ensure TextureId doesn't leak PIXI.Texture references
2. **Event Coordinate Systems**: Viewport transformations for input events
3. **Memory Management**: DisplayNode wrapper lifecycle and GC pressure
4. **Animation State**: Syncing animation state across platforms
5. **Texture Atlasing**: Platform-specific optimizations

### Mitigation Strategies
- Strict type branding for all IDs (TextureId, NodeId, etc.) - **Added to Plan**
- Comprehensive unit tests for coordinate transformations
- Benchmark memory overhead of DisplayNode wrappers
- Document animation state management patterns
- Abstract texture optimization strategies per platform

## References

### Current Codebase
- `/Users/ram/dev/clockwork/src/GameEngine.ts`
- `/Users/ram/dev/clockwork/src/GameCanvas.ts`
- `/Users/ram/dev/clockwork/src/rendering/AbstractRenderer.ts`

### Reference Games
- Tiki Kong: `~/dev/tribally/tiki-kong/src`
- Snakes on a Chain: `~/dev/tribally/snakes-on-a-chain/src`

### Reference Libraries
- game-base: `~/dev/tribally/game-base/src`
  - Asset loading patterns
  - Audio management (RealAudioManager, DummyAudioManager)
  - Replay infrastructure
  - Resize handling pattern (useResponsiveCanvas hook)
- arcade2: `~/dev/tribally/arcade2/src`
  - Resize handling pattern (100ms debounce, orientation tracking)
  - Responsive canvas sizing with reserved vertical space
  - Server-side replay validation (`src/server/lib/serverAssetLoader.ts`)
  - DOM shims for headless execution (`src/server/lib/domShims.ts`)
  - Headless engine creation with DummyAudioManager
  - Asset caching and Data URL conversion patterns
  - Replay timeout protection and progress polling

### arcade2 Headless Replay Insights
Key patterns discovered from arcade2 that influenced this plan:
1. **Minimal Loader**: HeadlessLoader returns empty strings (simpler than arcade2's full asset loading)
2. **Asset Pre-loading**: Loader doesn't know game's asset requirements - games register via manifest
3. **Data URLs**: All non-JSON assets converted to Data URLs for in-memory use (already standard pattern)
4. **Timeout Protection**: Always guard replay loops with timeouts (10s recommended)
5. **Progress Polling**: Sleep between update() calls to allow async operations (100-500ms)
6. **No GameCanvas Needed**: In-memory replay validates logic only, no rendering required
7. **Cleaner Abstraction**: MemoryPlatformLayer eliminates need for DOM shims (unlike arcade2)

### External Documentation
- PIXI.js v8 API
- Web Audio API
- DOM Event APIs
