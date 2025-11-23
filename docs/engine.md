# Clockwork engine

Clockwork Engine is designed around the principle of deterministic gameplay through frame-based updates and centralized state management. 

This document contains:

* The high-level architecture, design patterns, and how the various systems work together to create a robust, reproducible game engine. 

* General coding guidelines for when building a game using this engine.

This document is not intended to cover every class and method in the engine, but it will equip you with enough information to make effective use of the engine by covering the most important parts. 


## Architectural overview

Clockwork is written in Typescript and is designed to be platform-agnostic, though by default it ships with support for browser-based games.

The engine is distributed as an NPM package: [@hiddentao/clockwork-engine](https://github.com/hiddentao/clockwork-engine). The package contains modern Javascript (transpiled from the source Typescript) as well as Typescript types. 

The engine does not (currently) include a networking stack - games are free to _"bring their own"_. Object-oriented Javascript is used to keep the code neat and organised and to also make it easy to extend.

The engine uses a platform abstraction layer that decouples game logic from input, rendering and audio implementations. The default web implementation uses [Pixi.js](https://pixijs.com/) for rendering and [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) for sound. Pixi is a well-established rendering library that provides fast hardware-accelerated rendering into a WebGL `canvas` so any performance bottleneck you encounter is likely to be due to inefficiencies in your own game logic. 

The engine also ships with a dummy "memory platform" implementation which enables in-memory game replays - see [Platform Layer Guide](./platform-layer.md) and [Headless Replay Guide](./headless-replay.md) for details.

### Deterministic replays

A core feature of Clockwork is the idea of *deterministic replays*. What this means is that it should be possible to replay a player's gameplay session exactly as it happened - both visually to show the replay to the playser, and in-memory to enable a gameplay session's end result to be validated programmatically.

For example, once a player has finished playing a gameplay session in the browser we may wish to send the recording to a server to validate it and calculate what the final game outcome was by running the entire session in-memory in milliseconds. This is entirely possible!

Clockwork relies on two key components to ensure that a given gameplay session can be replayed exactly as the player played it:

* **Integer-based tick system**. A tick is a logic unit of time that the engine relies on to schedule and execute activities at given points in time. Using an integer-based tick system eliminiates any issues resulting from floating point math rounding errors.
* **PRNG for deterministic randomness**. A pseudo-random number generator which allows all randomness within a game to be deterministically recreated from a given starting seed number.

_Note: the above two components are explained in more detail below._

By recording the discrete events (e.g user inputs), initial PRNG seed and per-frame tick deltas, Clockwork is able to replay a gameplay session exactly as it was first played without needing to record the entire game state at every frame. This saves on the size of the recorded data and makes fast validation of a gameplay session possible.

### Code layout

The code is organized into classes (object-oriented programming) to make it easy to extend the engine when building your own games. Here are the key classes to be aware of:

* [`GameEngine`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameEngine.ts) - Abstract base class which is responsible for setting up the initial game configuration, PRNG instance, event manager, data loader, recorder, coillision tree, and also handles the game loop logic (collision detection, game state transitions).
* [`GameCanvas`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameCanvas.ts) -  Abstract base class for creating iteractive game canvases with Pixi.js. Provides viewport management, event handling, and rendering infrastructure for with pan, zoom, and interaction capabilities. The Pixi.js ticker will call into this class, which in turn will call the engine's game loop.
* [`Timer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/Timer.ts) - Tick-based timer as a replacement for Javascript's `setTimeout` and `setInterval`.
* [`EventEmitter`](https://github.com/hiddentao/clockwork-engine/blob/main/src/EventEmitter.ts) - Event emitter base class - used by the `GameEngine` and game object classes. It makes it easy to know when game state changes without having to poll for changes.
* [`PRNG`](https://github.com/hiddentao/clockwork-engine/blob/main/src/PRNG.ts) - Pseudo-random number generator implementation that allow for deterministic randomness (makes game replays possible!).
* [`GameEventManager`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameEventManager.ts) - System for processing external events (such as user input) that integrates with the game loop. This also allows for game objects to be updated outside of the core game engine logic but to still have those updates be recorded as part of the gameplay session.
* [`GameObject`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameObject.ts) - Base class for in-game objects. By default objects have certain attributes such as position, rotation, velocity, health, etc. Objects are grouped in the game engine by their type, get updated as part of the game loop, and can be serialized and deserialized.
* [`GameRecorder`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameRecorder.ts) - Used to record a gameplay session for replay later on.
* [`ReplayManager`](https://github.com/hiddentao/clockwork-engine/blob/main/src/ReplayManager.ts) - Used to replay a previously recorded gameplay session.
* [`Loader`](https://github.com/hiddentao/clockwork-engine/blob/main/src/Loader.ts) - Abstract base class for data loaders. The engine uses the data loader instance to load external data at runtime. This is how you can inject external data and assets into your game in a clean, reproducible way.
* [`AssetLoader`](https://github.com/hiddentao/clockwork-engine/blob/main/src/assets/AssetLoader.ts) - Concrete asset loader for spritesheets, images, and sounds with automatic preloading during engine reset.
* [`Spritesheet`](https://github.com/hiddentao/clockwork-engine/blob/main/src/assets/Spritesheet.ts) - Spritesheet loader supporting TexturePacker and Leshy JSON formats with frame-based texture access.
* [`Vector2D`](https://github.com/hiddentao/clockwork-engine/blob/main/src/geometry/Vector2D.ts) - Simple vector math implementation with basic vector arithmetic.
* [`CollisionGrid`](https://github.com/hiddentao/clockwork-engine/blob/main/src/geometry/CollisionGrid.ts) - Extremely fast and simple collision detection with hashmaps for game grids of fixed sizes.
* [`AbstractRenderer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/rendering/AbstractRenderer.ts) - Base class for rendering layers (used by `GameCanvas`) with platform-agnostic rendering and helper methods that make it easy to render large numbers of items.
* [`DisplayNode`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/DisplayNode.ts) - Platform-agnostic scene graph node with fluent API for transforms, graphics, and sprite rendering.
* [`PlatformLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/PlatformLayer.ts) - Top-level platform interface composing rendering, audio, and input subsystems with device-level capabilities.
* [`RenderingLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/RenderingLayer.ts) - Platform-agnostic rendering interface for node lifecycle, transforms, graphics primitives, sprites, and viewport management.
* [`AudioLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/AudioLayer.ts) - Platform-agnostic audio interface for sound loading, playback, and procedural audio generation.
* [`InputLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/InputLayer.ts) - Platform-agnostic input interface for pointer and keyboard event handling.
* [`WebPlatformLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/web/WebPlatformLayer.ts) - Browser-based platform implementation using PIXI.js for rendering, Web Audio API for sound, and DOM events for input.
* [`MemoryPlatformLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/memory/MemoryPlatformLayer.ts) - Headless platform implementation for server-side replay validation and testing without browser dependencies.
* [`HeadlessLoader`](https://github.com/hiddentao/clockwork-engine/blob/main/src/loaders/HeadlessLoader.ts) - Loader implementation that returns empty data for headless replay validation and testing in CI/CD environments.

### Demo game

Clockwork ships with a ready-to-play demo snake game in the `demo/` folder. You can also find this live at https://hiddentao.github.io/clockwork-engine/. 

This game demonstrates simple movement, collision detection, animation, replayability and rendering multiple objects of different types. If you're unsure about how to get started making your own game with Clockwork then please take a look the code for this demo game.


## Game loop

Every game engine has what's known as a "game loop". This is the logic which executes for every frame that is rendered, and it's where you process user inputs and in-game events, check the updated game state for things like collisions, and then setup the data for rendering to screen. The game loop gets automatically called by the rendering timer along with information on how much time has elapsed since the last frame got rendered. 

In Clockwork the game loop is implemented in `GameEngine.update()`:

```typescript
/**
 * Update the game state for the current tick
 * Processes inputs, timers, and game objects in deterministic order
 * @param deltaTicks Number of ticks to advance the simulation
 */
update(deltaTicks: number): void {
  if (this.state !== GameState.PLAYING) {
    return
  }

  // Update tick counter to maintain deterministic timing
  this.totalTicks += deltaTicks

  // Record tick progression for replay system
  if (this.recorder) {
    this.recorder.recordFrameUpdate(deltaTicks, this.totalTicks)
  }

  // Process queued events at current tick
  this.eventManager.update(deltaTicks, this.totalTicks)

  // Execute scheduled timer callbacks
  this.timer.update(deltaTicks, this.totalTicks)

  // Update all registered game objects by type
  for (const [_type, group] of this.gameObjectGroups) {
    group.update(deltaTicks, this.totalTicks)
  }
}
```

In your own game you can override this method as follows:

```typescript
update(deltaTicks: number): void {
  // call base class method to process timers, game events, game object updates, etc.
  super.update(deltaTicks)
  
  // we only want to process game logic if the game is currently in the playing state
  if (this.state !== GameState.PLAYING) {
    return
  }

  // do whatever game-specific processing you want here...
}
```

Notice the `deltaTicks` parameter. 

The [rendering layer](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/RenderingLayer.ts) is ultimately responsible for calling the game loop. In Clockwork the rendering system aims for atleast 60 FPS (frames per second), and it passes along a *delta time* parameter indicating the no. of frames that have elapsed since the last call to the game loop. This value is usually a floating point number. In order to avoid rounding errors during to floating point calculations (and because we want to do deterministic replays) we [multiply this value by 1000](https://github.com/hiddentao/clockwork-engine/blob/main/src/lib/internals.ts) and rounding to the nearest integer to get what we call _ticks_. Thus, we are aiming for 60,000 ticks per second (TPS) and the game loop gets passed the no. of ticks that have elapsed since the last call to it. Integer math allows us to avoid floating-point rounding errors and makes deterministic replays easier to do.

### Sub-loops

Within the `GameEngine` game loop other objects referenced by the engine are also updated according to the tick delta. Objects which can be updated in this way **must** implement the [`IGameLoop` interface](https://github.com/hiddentao/clockwork-engine/blob/main/src/IGameLoop.ts):

```typescript
export interface IGameLoop {
  /**
   * Update the game state for the current tick
   * @param deltaTicks Number of ticks since the last update
   * @param totalTicks Total number of ticks processed since start
   */
  update(deltaTicks: number, totalTicks: number): void | Promise<void>
}
```

This makes it easy to build a game loop in which different objects can be processed in a consistent manner. A number of the other classes - `GameObject`, `Timer`, etc - all implement this. 

ℹ️ **Any and all timing-related code (e.g movement velocity, durations) should make use of deltaTicks and/or totalTicks and never assume a ticks-per-second frequency.**

### Game states

Note the `GameState.ENDED` in the code above. Here are the possible states:

```typescript
// Game execution states for engine lifecycle management
export enum GameState {
  READY = "READY",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  ENDED = "ENDED",
}
```

Thus the game loop only executes when in the `PLAYING` state. The same goes for any events being processed and/or recorded. How and when game ends is upto each specific game's logic in its game loop. When game state changes an event gets emitted by the `GameEngine` instance. This is how our UI can know what's going on with a game.


## Timers - setTimeout / setInterval

Games often need to execute events at repeated intervals (e.g an apple appearing every 5 seconds for a snake to eat), or they may need to execute a single event at some point in future (e.g if the snake eats a bomb we want to show an explosion animation that runs for 3 seconds, starting 1 second from now). 

In normal Javascript we would use `setTimeout` and `setInterval` to schedule such tasks. But since we use ticks for time tracking we need to work with the game loop to figure out how many ticks have elapsed in order to make timers work properly.

The `Timer` class implements timers using the engine's tick-based time system. The `GameEngine` class has an instance of this (`this.timer`) which you can use to schedule tasks. However, `GameEngine` also provides wrapper methods that mimic the Javascript timer methods - this makes using the timer much easier:

```typescript
/**
 * Schedule a one-time callback to execute after the specified number of ticks
 */
setTimeout(callback: () => void, ticks: number): number {
  return this.timer.setTimeout(callback, ticks)
}

/**
 * Schedule a repeating callback to execute every specified number of ticks
 */
setInterval(callback: () => void, ticks: number): number {
  return this.timer.setInterval(callback, ticks)
}
```

Additionally, there is a [`millisecondsToTicks()`](https://github.com/hiddentao/clockwork-engine/blob/main/src/lib/internals.ts) method that makes it easy to convert real clock time into ticks-based time.

ℹ️ **You should never use Javascript's built-in timer methods for scheduling events in your game. Always use the above methods and the game engine's timer instance instead - this will ensure that deterministic replays work as expected.**



## Random number generation

Random number generation is an essential part of any game. For example, you may need to randomly calculate a spawn point for the player, for enemies, etc. 

In order to do deterministic replays, however, we need to ensure that we can exactly recreate the sequence of random numbers that were generated from the beginning of the game. This is where a PRNG (Pseudo-random number generator) comes in. It's *"pseudo"* because the numbers aren't really true random numbers but are instead generated via an algorithm.

Clockwork relies on [Alea](https://github.com/coverslide/node-alea) as its PRNG. At the start of a game a *"seed"* value is supplied to the game engine's PRNG instance. This seed value can be any string, itself randomly generated via some external means. The seed value sets up the PRNG algorithm to generate a specific sequence of random numbers from then onwards.

When we replay a gameplay session we must again seed the engine's PRNG instance with the same seed value in order to get the same sequence of random numbers being generated. 

The `PRNG` class also defines a number of helper methods for making using random-ness easier:

```typescript
  random(): number // return a number between 0 and 1
  randomInt(min: number, max: number): number // return an integer within this range
  randomChoice<T>(array: T[]): T // return a random choice from this list
  randomFloat(min: number, max: number): number // same randomInt() but for floats
  randomBoolean(threshold: number = 0.5): boolean // return true or false based on the threshold
```

ℹ️ **You should NEVER use Math.random() or other external random number generators in your game logic. Always use the game engine's PRNG instance - this will ensure that deterministic replays work as expected.**



## Game objects

Every game has different objects which need representing. Objects usually share properties in common such as position, rotation, health, velocity, etc. 

In Clockwork all objects are represented by objects derived from `GameObject`. A `GameObject` provides getters and setters for common object properties. 

Within the `GameEngine` there are also `GameObjectGroups` which group together objects of the same type. Both `GameObject` and `GameObjectGroup` implement the `IGameLoop` interface, giving you flexibility about how you want to update game objects within your game loop.

The `GameObject` loop updates the object position and marks the object has being ready to repaint:

```typescript
public update(deltaTicks: number, _totalTicks: number): void {
  if (this.destroyed) {
    return
  }

  // Move object based on velocity
  const movement = this.velocity.scale(deltaTicks)
  const oldPosition = this.position
  this.position = this.position.add(movement)
  if (
    oldPosition.x !== this.position.x ||
    oldPosition.y !== this.position.y
  ) {
    // inform renderer that this object needs repainting
    this.isRepaintNeeded = true
  }
}
```

Game objects emits events when properties change. For example, to be notified when the position changes:

```typescript
class Snake extends GameObject {...}

const snake = new Snake(..)

snake.on(GameObjectEventType.POSITION_CHANGED, () => {...})
```

And subclasses of `GameObject` can define a custom set of event identifiers which inherit from the base set of identifiers. This provides us with a lot of flexibility in designing game objects.

ℹ️ **You should define classes derived from GameObject for the actual objects within your game. And each object's game loop processing should take place within its update() method.**



## Rendering system

The rendering system in Clockwork uses a platform-agnostic rendering layer that abstracts the underlying graphics implementation. `GameObject` instances are queried for their size, position, etc and rendered using [`DisplayNode`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/DisplayNode.ts) instances that represent visual elements in the scene graph.

The platform layer provides:

* **Platform independence** - Same rendering code works in the browser (WebGL via PIXI.js), memory (for replay validation) and any platform of your choice which can execute Javascript.
* **Fluent API** - Chain method calls for concise node setup: `node.setPosition(x, y).setScale(2).setAlpha(0.5)`.
* **Primitives** - Built-in shapes (rectangles, circles, polygons, lines) without external graphics libraries.

See [Platform Layer Guide](./platform-layer.md) for architectural details.

In addition to the above, Clockwork makes rendering easier and efficient by:

* **GameObject-specific renderers** - [`AbstractRenderer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/rendering/AbstractRenderer.ts) is the base class for any and all renderers which render a list of game objects. It handles per-object updates, adding and removing objects from the renderer nodes, sprite rendering, and provides methods for rendering primitives such as circles and rectangles.
* **Only re-rendering what has changed** - the `GameObject.needsRepaint` boolean value indicates whether a given game object needs to be re-rendered by the rendering pipeline. This helps with rendering performance. The boolean is set from within the game loop, and it must be unset by the renderer instance that is responsible for rendering that item, once the item has re-rendered.

*Note: `AbstractRenderer` is actually a generic type, meaning you don't need to use `GameObject`s with it, you could use any type of object you want.*

Renderers are loaded and executed from within the [`GameCanvas`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameCanvas.ts) instance. This object holds a list of renderers and sets up the rendering system and associated viewport (to enable panning and zooming of a game map). It is also responsible for rescaling the game canvas when the viewing window size changes.

`GameCanvas` provides the game loop entrypoint method, which internally calls the `GameEngine` game loop method:

```typescript
/**
 * Updates the game state and triggers rendering for each tick.
 * Coordinates between the game engine and visual rendering.
 *
 * @param deltaTicks Ticks elapsed since the last update
 */
protected update(deltaTicks: number): void {
  if (this.gameEngine) {
    this.gameEngine.update(deltaTicks)
  }
  this.render(deltaTicks)
}
```

The `GameCanvas` listens for state changes in the `GameEngine` and informs its list of renderers accordingly. This allows for e.g animations to be visually paused when the game is in a paused state.



## Handling user input

In Clockwork user inputs are considered to be *game events*. 

*"A game event is any event that takes places outside of the normal game loop but which influences game logic."*

User inputs are an example of game events. All game events are processed by the `GameEventManager` in its game update loop when called from within the `GameEngine` game loop.

### Raw input from the platform layer

Raw user input (keyboard presses, pointer clicks, etc.) comes through the platform abstraction layer's [`InputLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/InputLayer.ts) interface. This provides a platform-agnostic way to receive input events, which are then translated to game engine input events.

### Queuing input to the game event system

The event manager has a single [`GameEventSource`](https://github.com/hiddentao/clockwork-engine/blob/main/src/EventSource.ts) it reads events from. In normal gameplay mode we use the [`UserInputSource`](https://github.com/hiddentao/clockwork-engine/blob/main/src/UserInputEventSource.ts). This class provides a `queueInput` method through which user input can be queued for processing in the next game loop iteration:

```typescript
/**
 * Queue user input for processing in next loop iteration.
 *
 * @param inputType The type of input (e.g., "direction", "button")
 * @param data The input data to queue
 */
queueInput(inputType: string, data: any): void
```

The parameters to `queueInput` are deliberately left as primitive types so that you can customize the values according to your specific game.


### Other events

The `GameEventManager` supports the processing of non-user-input events as well. If we take a look at types.ts we can see that a `GameEvent` can represent user input or an object update. An object update is an event which updates the property of a `GameObject` - this too will get recorded in the gameplay session recording. 

```typescript
// Event classification for game event processing
export enum GameEventType {
  USER_INPUT = "USER_INPUT",
  OBJECT_UPDATE = "OBJECT_UPDATE",
}

// Event data structures for game state recording
export interface GameEvent {
  type: GameEventType
  tick: number
  timestamp: number
}

export type AnyGameEvent = UserInputEvent | ObjectUpdateEvent
```

**⚠️ The game event processing logic for non-user-input events is still under development and this spec may change in future.**


## Loading external assets

Very often a game may need to load assets and other data in from external data sources rather than bundling them within. This is especially true for games which have dynamically changing assets - for example, you may wish to make the background map of your game be changeable and store the map on a server somewhere.

The `GameEngine` holds a reference to a [`Loader`](https://github.com/hiddentao/clockwork-engine/blob/main/src/Loader.ts) object which must implement a simple `fetchData()` method. This provides flexibility in terms of where assets come from - local files, remote servers, or dynamically generated data. You could also use the `Loader` to load in dynamic configuration at runtime. For instance, the colours used in the game, the speed of movement, and various other parameters could, if you wanted, be loaded in dynamically.

### AssetLoader

For game assets (spritesheets, images, sounds), use [`AssetLoader`](https://github.com/hiddentao/clockwork-engine/blob/main/src/assets/AssetLoader.ts):

```typescript
import { AssetType } from 'clockwork-engine'

const engine = new MyGameEngine({ loader, platform })
const assetLoader = engine.getAssetLoader()!

// Register assets for automatic preloading
assetLoader.register('sprites/player.png', AssetType.SPRITESHEET)
assetLoader.register('images/logo.png', AssetType.STATIC_IMAGE)
assetLoader.register('sounds/jump.mp3', AssetType.SOUND)

// Assets automatically preload during reset() before setup() is called
await engine.reset(config)

// Access loaded assets in your game code
const playerSheet = assetLoader.getSpritesheet('sprites/player.png')
const logoTexture = assetLoader.getStaticImage('images/logo.png')
```

### Spritesheets

You can load spritesheets with frame-based texture access. Supports both TexturePacker and Leshy JSON formats.

```typescript
// Spritesheet loads automatically via AssetLoader
const sheet = assetLoader.getSpritesheet('sprites/player.png')

// Get individual frames
const idleTexture = sheet.getTexture('player-idle-0.png')
const walkTextures = sheet.getAnimationFrames('player-walk-')
```

### Custom Asset Loaders

Extend `AssetLoader` to customize how it works:

```typescript
class CustomAssetLoader extends AssetLoader {
  // ...
}

const assetLoader = new CustomAssetLoader()

const gameEngine = new MyGameEngine({ loader, platform, assetLoader }) 
```



## Audio playback

Clockwork provides a platform-agnostic audio system through the [`AudioLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/AudioLayer.ts) interface. This abstraction allows audio to work consistently no matter the platform.

The audio layer is accessed through the platform abstraction:

```typescript
const platform = new WebPlatformLayer(container, options)
await platform.init()  // Initializes audio context

// Audio is available on platform.audio
const audio = platform.audio
```

### Loading sounds

There are two ways to load sounds into the engine:

- Using `AssetLoader` for automatic preloading
- Loading sounds directly

### Procedural audio generation

The audio layer supports creating sounds programmatically, which is useful for simple sound effects, tones, or dynamic audio:

```typescript
// Create an empty audio buffer (2 channels, 1 second at 44.1kHz)
const buffer = platform.audio.createBuffer(2, 44100, 44100)

// Fill with audio data (e.g., a 440Hz sine wave)
const channelData = buffer.getChannelData(0)
for (let i = 0; i < channelData.length; i++) {
  channelData[i] = Math.sin(2 * Math.PI * 440 * i / 44100)
}

// If stereo, fill second channel
const rightChannel = buffer.getChannelData(1)
for (let i = 0; i < rightChannel.length; i++) {
  rightChannel[i] = Math.sin(2 * Math.PI * 440 * i / 44100)
}

// Load the procedural sound
platform.audio.loadSoundFromBuffer('beep', buffer)

// Play it like any other sound
platform.audio.playSound('beep', 1.0, false)
```

This is particularly useful for:
- Simple beeps and tones without external files
- Dynamically generated sound effects based on game state
- White noise, explosions, or other procedural effects


## Recording game sessions

Game recording are done via `GameRecorder` - the `GameEngine` has an instance of this and passes it around to other objects activated within the game loop which may need to record their actions. Specifically, a gameplay session recording contains:

* Initial configuration used to setup the game, including the initial PRNG seed value.
* All game events (e.g user input events) along with the tick values they were called at.
* The full array of delta ticks that the top-level game loop was called until the game ended.

Once a game has ended the recorded session can be output as a JSON.

### Replaying a session

Replaying a gameplay session requires:

* The JSON of the recorded gameplay session.
* The exact same game engine codebase.
* The same external data available to be loaded (if the game is using the `Loader` to load external data at runtime).

If the above requirements are met then the `ReplayManager` can be used to replay a game. 

When replaying a game we typically want to display the replay visually. This means we want to re-use the rendering layer (and `GameCanvas`) but we need to replace the `GameEngine` instance with one that does a replay instead of playing the game normally. The `ReplayManager.createProxyEngine()` method exists for this purpose - to create a proxy `GameEngine` that in its game loop will translate the incoming tick deltas into the ones from the gameplay session recording.

Additionally, `ReplayManager` sets up the `GameEventManager` event source to be a [`RecordedEventSource`](https://github.com/hiddentao/clockwork-engine/blob/main/src/RecordedEventSource.ts) instance. This is how recorded user input events are played back at the right tick count during the replay game loops.

Because replays are also be driven by the Pixi ticker we can increase the ticker speed to increase the speed of the replay. The proxy engine created by the replay manager automatically handles translating the speeded-up tick deltas to the recorded tick deltas.

The live engine demo has an example of replays in action, including speeded-up replays: https://hiddentao.github.io/clockwork-engine/



## Creating a game

This section briefly covers key points to be aware of when implementing a game using Clockwork.

### Engine and game setup

You will need to implement a concrete subclass of `GameEngine`.

Before creating your game engine instance, you must initialize the platform abstraction layer. For browser-based games, use `WebPlatformLayer`:

```typescript
// Initialize the platform layer for browser-based rendering
const container = document.getElementById('game-container')
const platform = new WebPlatformLayer(container, {
  width: 800,
  height: 600,
  backgroundColor: 0x000000
})
await platform.init()  // Initializes rendering, audio, and input systems

// Create your game engine with the platform layer
const engine = new MyGameEngine({
  platform,
  loader: new MyDataLoader(),
  assetLoader: new AssetLoader(loader, platform.rendering, platform.audio)
})
```

The platform layer provides access to rendering (`platform.rendering`), audio (`platform.audio`), and input (`platform.input`) subsystems. The engine uses this abstraction to remain platform-agnostic.

Before a game starts playing the `GameEngine.setup()` method must be called (note that this automatically gets called by the replay manager when doing replays).

```typescript
/**
 * Abstract method for game-specific initialization
 * Override in subclasses to create initial game objects and configure game state
 * Called automatically during reset() to set up the game world
 * @param gameConfig Game configuration containing seed and initial state
 */
abstract setup(gameConfig: GameConfig): Promise<void>
```

The `GameConfig` object specifies the seed value for the PRNG as well as game-specific setup information:

```typescript
export interface GameConfig {
  prngSeed?: string
  gameSpecific?: Record<string, any>
}
```

### Canvas

You will also need to implement a concrete subclass of `GameCanvas` so that the `render()` method can be implemented. Note that this method gets called from the game loop `update()` method. You can initialise (if not yet done so) and update your renderers in here:

```typescript
/**
 * Renders the current frame with game-specific drawing logic.
 * Called every tick after the game engine update.
 *
 * @param deltaTicks Ticks elapsed since the last update
 */
protected abstract render(deltaTicks: number): void
```

### User input

User input events will need to be manually passed to the `UserInputEventSource.queueInput()` method. Note that the `GameCanvas` can already handle mouse and pointer pan and zoom interactions - if you want to capture those for the game engine instead then you will need to disable those. 



## Coding guidelines

When working with Clockwork here are some general coding guidelines you should follow to make the best game possible:

* Think about game loop and rendering performance. The game loop gets run more than 60 times per secod and ought to be very, very efficient, completing in less than a few milliseconds. This means things like:

  * Avoid loops unless absolutely necessary. For example, it's ok to use a bit more memory and hash-tables for lookups to avoid looping - The `CollisionGrid` is an example of this in action

  * Use the `GameObject.isRepaintNeeded` boolean flag to indicate when an object needs re-rendering so that you don't unnecessarily re-render items.
  * If a game object changes position then see if you can change the corresponding Pixi container position accordingly instead of removing and re-rerendering the object completely. The same goes for the other properties. You may need to redesign your game object data architecture and/or that of its renderer in order to be able to be as efficient as possible.
  * If you have hundreds of objects of a particular type and their properties are related in some way then it might be more performant to deal with them in a single game object rather than as separate game objects, thus avoiding hundreds of game loop calls. You may need to try both ways to see what works better.

* Always go through the platform abstraction layer to engage platform-specific actions so that your core game logic (including rendering logic) can be platform-agnositic.

* Never use Javascript's built-in `setTimeout/setInterval` methods; always the use the equivalent methods on the `GameEngine` class or the `Timer` instance.

* Never use Javascript's built-in randomness methods like `Math.random()`; always the use the methods on the PRNG instance instead so that all randomness is deterministic.

* Make sure your game logic only processes game events and updates game data wen the game state is `PLAYING`. Ensuring this means a game can be paused and that recording can stop when the game ends. The `GameEngine` game loop already skips all further processing when the game is in any other state, so as long as all your processing takes place witin the game loop (or sub loops) there is nothing extra you need to do to adhere to this guideline.

* Make sure the game can be reset - there is an explicit `GameEngine.reset()` that supposedly can be used to reset a game to its initial state.

* When writing renderers they should be concrete subclasses of `AbstractRenderer` and they should use the base class methods as much as possible for common operations like drawing graphics.

* All game objects should have serialization support.



## Related Documentation

* **[Platform Layer Guide](./platform-layer.md)** - Platform abstraction, `DisplayNode`, `WebPlatformLayer` vs `MemoryPlatformLayer`
* **[Headless Replay Guide](./headless-replay.md)** - Server-side validation, `HeadlessLoader`, determinism verification

