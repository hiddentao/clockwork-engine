# Headless Replay Validation

Headless replay enables server-side validation of game recordings without rendering, audio, or browser dependencies.

Headless replay is **significantly faster than real-time**:

* No rendering overhead
* No audio processing
* No browser event loop
* Minimal memory footprint

## Components

### HeadlessLoader

[`HeadlessLoader`](https://github.com/hiddentao/clockwork-engine/blob/main/src/loaders/HeadlessLoader.ts) wraps an existing loader and selectively loads only replay-essential data:

```typescript
import { HeadlessLoader } from '@hiddentao/clockwork-engine'

const actualLoader = new MyDataLoader()
const loader = new HeadlessLoader(actualLoader)

// Non-essential data returns empty string
await loader.fetchData('sprite.png')  // returns ""

// Validation-essential data is forwarded to wrapped loader
await loader.fetchData('level-map.json', { requiredForValidation: true })  // returns actual data
```

This minimizes asset loading while still loading data that affects gameplay outcomes.

### MemoryPlatformLayer

[`MemoryPlatformLayer`](https://github.com/hiddentao/clockwork-engine/blob/main/src/platform/memory/MemoryPlatformLayer.ts) tracks game state without rendering:

```typescript
import { MemoryPlatformLayer } from '@hiddentao/clockwork-engine'

const platform = new MemoryPlatformLayer()
```

Rendering, audio, and input are no-ops. State updates work identically to other platform.

## Basic Usage

```typescript
import { HeadlessLoader } from '@hiddentao/clockwork-engine'
import { MemoryPlatformLayer } from '@hiddentao/clockwork-engine'
import { ReplayManager } from '@hiddentao/clockwork-engine'

// Create headless components - HeadlessLoader wraps your actual data loader
const actualLoader = new MyDataLoader()
const loader = new HeadlessLoader(actualLoader)
const platform = new MemoryPlatformLayer()

// Initialize engine
const engine = new MyGameEngine({ loader, platform })

// Replay recording
const replayManager = new ReplayManager(engine)
const replayEngine = replayManager.getReplayEngine()
await replayManager.replay(recording)

// Process until complete
while (replayManager.getReplayProgress().progress < 1.0) {
  replayEngine.update(recording.totalTicks)
  await sleep(10)
}

// Validate final state
const finalState = engine.getGameSnapshot()
validateState(finalState, recording.expectedState)
```

## Timeout Protection

**Always guard replay loops with timeouts to prevent infinite loops:**

```typescript
const TIMEOUT_MS = 10000 // 10 seconds
const startTime = Date.now()

while (progress.progress < 1.0) {
  if (Date.now() - startTime > TIMEOUT_MS) {
    throw new Error('Replay timeout')
  }

  replayEngine.update(recording.totalTicks)
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
  replayEngine.update(recording.totalTicks)
  await sleep(100) // Allow async processing
  progress = replayManager.getReplayProgress()
}
```

