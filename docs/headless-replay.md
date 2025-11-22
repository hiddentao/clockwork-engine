# Headless Replay Validation

Headless replay enables server-side validation of game recordings without rendering, audio, or browser dependencies.

## Purpose

* **Cheat detection**: Validate client-side gameplay on the server
* **CI testing**: Automated determinism verification in build pipelines
* **Performance**: Fast replay processing (milliseconds vs real-time)
* **Scalability**: Validate thousands of recordings concurrently

## Components

### HeadlessLoader

[`HeadlessLoader`](https://github.com/hiddentao/clockwork-engine/blob/main/src/loaders/HeadlessLoader.ts) returns empty strings for all asset requests. Memory platform handles empty data gracefully:

```typescript
import { HeadlessLoader } from '@hiddentao/clockwork-engine'

const loader = new HeadlessLoader()
```

No asset files required - perfect for server environments.

### MemoryPlatformLayer

[`MemoryPlatformLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/memory/MemoryPlatformLayer.ts) tracks game state without rendering:

```typescript
import { MemoryPlatformLayer } from '@hiddentao/clockwork-engine'

const platform = new MemoryPlatformLayer()
```

Rendering, audio, and input are no-ops. State updates work identically to Web platform.

## Basic Usage

```typescript
import { HeadlessLoader } from '@hiddentao/clockwork-engine'
import { MemoryPlatformLayer } from '@hiddentao/clockwork-engine'
import { ReplayManager } from '@hiddentao/clockwork-engine'

// Create headless components
const loader = new HeadlessLoader()
const platform = new MemoryPlatformLayer()

// Initialize engine
const engine = new MyGameEngine({ loader, platform })
await engine.reset(recording.gameConfig)

// Replay recording
const replayManager = new ReplayManager(engine)
await replayManager.replay(recording)

// Process until complete
while (replayManager.getReplayProgress().progress < 1.0) {
  engine.update(1)
  await sleep(10)
}

// Validate final state
const finalState = engine.getGameSnapshot()
validateState(finalState, recording.expectedState)
```

Complete example: [examples/headless-replay-validation.ts](https://github.com/hiddentao/clockwork-engine/blob/main/examples/headless-replay-validation.ts)

## Timeout Protection

**Always guard replay loops with timeouts to prevent infinite loops:**

```typescript
const TIMEOUT_MS = 10000 // 10 seconds
const startTime = Date.now()

while (progress.progress < 1.0) {
  if (Date.now() - startTime > TIMEOUT_MS) {
    throw new Error('Replay timeout')
  }

  engine.update(recording.totalTicks)
  await sleep(100)

  progress = replayManager.getReplayProgress()
}
```

Pattern from [tests/integration/RecordReplayIntegration.test.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/integration/RecordReplayIntegration.test.ts).

## Progress Tracking

Monitor replay progress with `getReplayProgress()`:

```typescript
const progress = replayManager.getReplayProgress()

console.log(`Progress: ${(progress.progress * 100).toFixed(1)}%`)
console.log(`Current tick: ${progress.currentTick}`)
console.log(`Total ticks: ${progress.totalTicks}`)
```

Sleep between updates to allow async operations to complete:

```typescript
while (progress.progress < 1.0) {
  engine.update(recording.totalTicks)
  await sleep(100) // Allow async processing
  progress = replayManager.getReplayProgress()
}
```

## Determinism Verification

Run the same recording multiple times and compare final states:

```typescript
const results = []

for (let i = 0; i < 3; i++) {
  const engine = new MyGameEngine({ loader, platform })
  await engine.reset(recording.gameConfig)

  const replayManager = new ReplayManager(engine)
  await replayManager.replay(recording)

  // Process replay...

  results.push(engine.getGameSnapshot())
}

// All replays should produce identical results
assert.deepEqual(results[0], results[1])
assert.deepEqual(results[1], results[2])
```

See [tests/integration/DeterminismIntegration.test.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/integration/DeterminismIntegration.test.ts).

## Asset Preloading

Asset preloading works identically in headless mode:

```typescript
const assetLoader = new AssetLoader(loader, platform.rendering, platform.audio)

// Register assets (same as Web platform)
assetLoader.register('sprites/player.png', 'spritesheet')
assetLoader.register('sounds/jump.mp3', 'sound')

const engine = new MyGameEngine({ loader, platform, assetLoader })

// Assets "load" instantly (empty strings from HeadlessLoader)
await engine.reset(config)
```

Memory platform accepts empty asset data without errors.

## Server-Side Pattern

Typical server-side validation workflow:

1. Client submits recording JSON
2. Server validates recording format
3. Server creates headless engine
4. Server replays recording with timeout
5. Server validates final game state
6. Server responds with validation result

Example: [examples/server-side-validation.ts](https://github.com/hiddentao/clockwork-engine/blob/main/examples/server-side-validation.ts)

## Performance

Headless replay is **significantly faster than real-time**:

* No rendering overhead
* No audio processing
* No browser event loop
* Minimal memory footprint

Typical speeds:
* Simple games: 100-1000x real-time
* Complex games: 10-100x real-time

Profile with benchmarks: [tests/benchmarks/](https://github.com/hiddentao/clockwork-engine/tree/main/tests/benchmarks)

## Common Patterns

**CI integration**:

```bash
# In CI pipeline
bun test tests/integration/RecordReplayIntegration.test.ts
```

**Batch validation**:

```typescript
const recordings = await loadAllRecordings()

for (const recording of recordings) {
  const isValid = await validateRecording(recording)
  console.log(`${recording.id}: ${isValid ? 'PASS' : 'FAIL'}`)
}
```

**State extraction**:

```typescript
// Replay to specific tick
while (engine.totalTicks < targetTick) {
  engine.update(1)
}

const stateAtTick = engine.getGameSnapshot()
```

## Limitations

**GameCanvas not available**: Headless replay validates game logic only, not visual output

**Browser APIs unavailable**: No DOM, no WebGL, no Web Audio

**Asset data not loaded**: Textures and sounds are mocked

For visual validation, use browser-based tests: [tests/browser/](https://github.com/hiddentao/clockwork-engine/tree/main/tests/browser)

## Troubleshooting

**Replay hangs**: Add timeout protection (see above)

**State mismatch**: Check PRNG seed consistency, ensure all randomness uses engine PRNG

**Asset errors**: Verify Memory platform is used (gracefully handles empty assets)

**Timing issues**: Add sleep between updates for async operations

## Related Documentation

* [Platform Layer](./platform-layer.md) - Platform abstraction overview
* [Testing Guide](./testing.md) - Test strategies and patterns
* [Engine Guide](./engine.md) - Core engine concepts
