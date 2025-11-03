# Clockwork engine

Clockwork Engine is designed around the principle of deterministic gameplay through frame-based updates and centralized state management. 

This document contains:

* The high-level architecture, design patterns, and how the various systems work together to create a robust, reproducible game engine.

* Coding guidelines for building a game using this engine.

  

## Architectural overview

Clockwork is written in Typescript and is designed for browser-based games. 

The engine is distributed as an NPM package: [@hiddentao/clockwork-engine](https://github.com/hiddentao/clockwork-engine). The package contains modern Javascript (transpiled from the source Typescript) as well as Typescript types. 

The engine does not (currently) include any networking or audio stack - games are free to _"bring their own"_. Object-oriented Javascript is used to keep the code neat and organised and to also make it easy to extend.

The engine has been built around [Pixi.js](https://pixijs.com/) as the underlying rendering library of choice. Pixi is a well-established rendering library that provides fast hardware-accelerated rendering into a WebGL `canvas` so any performance bottleneck you encounter is likely to be due to inefficiencies in your own game logic.

### Deterministic replays

A core feature of Clockwork is the idea of *deterministic replays*. What this means is that it should be possible to replay a player's gameplay session exactly as it happened - both visually to show the replay to the playser, and in-memory to enable a gameplay session's end result to be validated programmatically.

Clockwork relies on two key components to ensure that a given gameplay session can be replayed exactly as the player played it:

* **Integer-based tick system**. A tick is a logic unit of time that the engine relies on to schedule and execute activities at given points in time. Using an integer-based tick system eliminiates any issues resulting from floating point math rounding errors.
* **PRNG for deterministic randomness**. A pseudo-random number generator which allows all randomness within a game to be deterministically recreated from a given starting seed number.

_Note: the above two components are explained in more detail below._

By recording the user inputs, initial PRNG seed and per-frame tick count, Clockwork is able to replay a gameplay session exactly as it was first played without needing to record the entire game state at every frame. This saves on the size of the recorded data and makes fast validation of a gameplay session possible. For example, once a player as finished playing a gameplay session in the browser we may wish to send the recording to a server to validate it and calculate what the final game outcome was.

### Code layout

The code is organized into classes (object-oriented programming) to make it easy to extend the engine when building your own games.

* [`GameEngine`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameEngine.ts) - Abstract base class which is responsible for setting up the initial game configuration, PRNG instance, event manager, data loader, recorder, coillision tree, and also handles the game loop logic (collision detection, game state transitions).
* [`GameCanvas`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameCanvas.ts) -  Abstract base class for creating iteractive game canvases with Pixi.js. Provides viewport management, event handling, and rendering infrastructure for with pan, zoom, and interaction capabilities. The Pixi.js ticker will call into this class, which in turn will call the engine's game loop.
* [`Timer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/Timer.ts) - Tick-based timer as a replacement for Javascript's `setTimeout` and `setInterval`.
* [`PRNG`](https://github.com/hiddentao/clockwork-engine/blob/main/src/PRNG.ts) - Pseudo-random number generator implementation that allow for deterministic randomness (makes game replays possible!).
* [`GameEventManager`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameEventManager.ts) - User input processing system that integrates with the game loop. This also allows for game objects to be updated outside of the core game engine logic but to still have those updates be recorded as part of the gameplay session.
* [`GameRecorder`](https://github.com/hiddentao/clockwork-engine/blob/main/src/GameRecorder.ts) - Used to record a gameplay session for replay later on.
* [`ReplayManager`](https://github.com/hiddentao/clockwork-engine/blob/main/src/ReplayManager.ts) - Used to replay a previously recorded gameplay session.
* [`EventEmitter`](https://github.com/hiddentao/clockwork-engine/blob/main/src/EventEmitter.ts) - Event emitter base class - used by the `GameEngine` and game object classes. It makes it easy to know when game state changes without having to poll for changes.



## Game loop

Every game engine has what's known as a "game loop". This is the logic which executes for every frame that is rendered, and it's where you will process user inputs and in-game events, check the updated game state for things like collisions, and then setup the data for rendering to screen. The game loop gets automatically called by the rendering timer along with information on how much time has elapsed since the last frame got rendered. 

In Clockwork the game loop is implemented in `GameEngine.update()`. In your own game you can override this method as follows:

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

The [Pixi.js ticker](https://pixijs.com/8.x/guides/components/ticker) is ultimately responsible for calling the game loop. In Pixi the rendering system aims for atleast 60 FPS (frames per second), and it passes along a *delta time* parameter indicating the no. of frames that have elapsed since the last call to the game loop.  This value is usually a floating point number. In order to avoid rounding errors during to floating point calculations (and because we want to do deterministic replays) we [multiply this value by 1000](https://github.com/hiddentao/clockwork-engine/blob/main/src/lib/internals.ts) and rounding to the nearest integer to get what we call _ticks_. Thus, we are aiming for 60,000 ticks per second (TPS) and the game loop gets passed the no. of ticks that have elapsed since the last call. Integer math allows us to avoid floating-point rounding errors and makes deterministic replays easier.



## Timers - setTimeout / setInterval

Games often need to execute events at repeated intervals (e.g an apple appearing every 5 seconds for a snake to eat), or they may need to execute a single event at some point in future (e.g if the snake eats a bomb we want to show an explosion animation that runs for 3 seconds, starting 1 second from now). 

In normal Javascript we would use `setTimeout` and `setInterval` to schedule such tasks. But since we use ticks for time tracking we need to work with the game loop to figure out how many ticks have elapsed in order to make timers work properly.

The `Timer` class implements timers using the engine's tick-based time system. The `GameEngine` class has an instance of this (`this.timer`) which you can use to schedule tasks. However, `GameEngine` also provides wrapper methods that mimic the Javascript timer methods - this makes using the timer much easier:

```typ
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

⚠️**You should never use Javascript's built-in timer methods for scheduling events in your game. Always use the above methods and the game engine's timer instance instead - this will ensure that deterministic replays work as expected.**



## Random numbers - Math.random

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

⚠️ **You should never use Math.random() or other external random number generators in your game logic. Always use the game engine's PRNG instance - this will ensure that deterministic replays work as expected.**



## Loading external data

* Data loader
* Canvas
* Recorder
* Replays
* Game objects
* Game events

## Rendering system



## Creating a game

## Coding guidelines

