Let's re-architect the engine to longer assume that it's running on the web. We want to abstract away the specific platform from the engine completely (this includes GameEngine, GameCanvas and all other engine classes) so that we can write a game that runs on multiple platforms.

IMPORTANT: Once planning is done we first want to write the full plan in detail to .plan/platform.md and then iterate on their document prior to implementing anything. I will give the final go ahead before any implementation actually takes place.

## PlatformLayer

An interface which defines the platform abstraction layer. 

It should provide a factory function to fetch a RenderingLayer which will work similarly to PIXI.js in terms of it architecture. Have a look at the current engine code as well as our two reference games (see below). The PIXI.js container architecture, game loop ticker architecture, sprite management, animation management, primitives rendering, etc. are all useful inputs into how to design our generic RenderingLayer object and subobjects such that we can easily translate to PIXI.js as well as other rendering systems. 

It should also provide a factory method to fetch an AudioLayer which will work similarly to what we currently use in game-base codebase and the games codebases (see below). Note that the game codebases currently directly use the DOM AudioContext object but we want to replace that with an abstraction that AudioLayer will provide. The audio manager in game-base uses web audio API so we'll need an abstraction for that as other platforms will have their own audio layers.

Ultrathink about how to design the above abstraction layers such that they make sense, are easy to translate to concrete implementations like below, and can easily be extended, but don't make things too complex. 

It will have two derived concrete classes:

- WebPlatformLayer
- MemoryPlatformLayer

### WebPlatformLayer

An implementation of PlatformLayer for the web. This will use PIXI.js, DOM AudioContext and Web Audio API as the underlying concrete implementation.

### MemoryPlatformLayer

An implementation of PlatformLayer for the in-memory playback of a game recording. So it's a dummy rendering layer that doesn't do anything - same for audio.

## GameEngine

Create GameEngineOptions to replace current constructor parameter. This will internally container Loader and PlatformLayer instances.

## GameCanvas

Add PlatformLayer to GameCanvasOptions. 

The initialize() method should take a PlatformLayer subobject instead of HTML div element so to abstract away the web platform.

## Additional items

As part of this work we're going to add in audio management and asset loading to the engine from game-base codebase (see below). We want to add these to the platform abstraction layer as well as the concrete derived layers. This will allow us to build games with asset loading and audio playback using clockwork-engine itself.

## Reference code to use as input for designing this architecture of PlatformLayer and its subitems

* Game 1: ~/dev/tribally/tiki-kong/src
* Game 2: ~/dev/tribally/snakes-on-a-chain/src
* Asset loading, audio mgmt, and how replays work - ~/dev/tribally/game-base/src



