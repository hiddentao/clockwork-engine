# Testing Guide

Clockwork provides comprehensive testing infrastructure for unit tests, integration tests, browser tests, and performance benchmarks.

## Test Structure

```
tests/
├── core/              # GameEngine, Timer, PRNG, etc.
├── events/            # Event system tests
├── geometry/          # Vector2D, CollisionGrid
├── rendering/         # AbstractRenderer, GameCanvas
├── platform/          # Platform layer unit tests
├── assets/            # AssetLoader, Spritesheet
├── loaders/           # HeadlessLoader, custom loaders
├── integration/       # Cross-component tests
├── browser/           # Playwright browser tests
└── benchmarks/        # Performance benchmarks
```

## Running Tests

```bash
# All tests
bun test

# Watch mode
bun test --watch

# Specific file
bun test tests/core/GameEngine.test.ts

# Integration tests only
bun test tests/integration/

# Browser tests (requires test server)
bun test:browser

# Benchmarks
bun run tests/benchmarks/run-all.ts
```

## Unit Testing

### Platform-Agnostic Tests

Use `MemoryPlatformLayer` for fast, deterministic unit tests:

```typescript
import { test, expect } from 'bun:test'
import { MemoryPlatformLayer } from '../../src/platform/memory'

test('My game logic', () => {
  const platform = new MemoryPlatformLayer()
  const engine = new MyGameEngine({ loader, platform })

  // Test game logic without rendering
  engine.doSomething()

  expect(engine.state).toBe(expectedState)
})
```

No browser, no rendering, instant execution.

### Testing Patterns

**GameObject testing**: [tests/core/GameObject.test.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/core/GameObject.test.ts)

**Renderer testing**: [tests/rendering/AbstractRenderer.test.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/rendering/AbstractRenderer.test.ts)

**Platform testing**: [tests/platform/MemoryRenderingLayer.test.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/platform/MemoryRenderingLayer.test.ts)

## Integration Testing

Test cross-component interactions with real workflows:

```typescript
test('Record and replay game session', async () => {
  const platform = new MemoryPlatformLayer()
  const engine = new TestGameEngine({ loader, platform })

  // Record session
  const recorder = new GameRecorder()
  engine.recorder = recorder

  await engine.reset(config)
  // Play game...

  const recording = recorder.export()

  // Replay session
  const replayEngine = new TestGameEngine({ loader, platform })
  const replayManager = new ReplayManager(replayEngine)

  await replayManager.replay(recording)
  // Process replay...

  expect(finalState).toEqual(expectedState)
})
```

Examples: [tests/integration/RecordReplayIntegration.test.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/integration/RecordReplayIntegration.test.ts)

## Browser Testing

Use Playwright for testing actual WebGL rendering:

```typescript
import { test, expect } from '@playwright/test'

test('Renders colored rectangle', async ({ page }) => {
  await page.goto('http://localhost:3000/tests/browser/test-page.html')

  const result = await page.evaluate(`(async () => {
    const platform = new WebPlatformLayer(canvas, 800, 600)
    const node = platform.rendering.createNode()
    platform.rendering.drawRectangle(node, 100, 100, 50, 50, 0xff0000)
    platform.rendering.render()

    // Extract and check pixels...
    return { pixelIsRed: true }
  })()`)

  expect(result.pixelIsRed).toBe(true)
})
```

**Browser test utilities**: [tests/browser/helpers/browser-test-utils.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/browser/helpers/browser-test-utils.ts)

**Visual regression**: [tests/browser/visual-regression.spec.playwright.ts](https://github.com/hiddentao/clockwork-engine/blob/main/tests/browser/visual-regression.spec.playwright.ts)

## Performance Benchmarks

Measure performance characteristics to detect regressions:

```bash
# Run all benchmarks
bun run tests/benchmarks/run-all.ts

# Individual benchmark
bun run tests/benchmarks/platform-overhead.bench.ts
```

Results saved to `tests/benchmarks/RESULTS.md`.

**Available benchmarks**:
* Platform overhead (rendering operations)
* Collision detection (grid performance at scale)
* Serialization (encode/decode speed)

See [tests/benchmarks/README.md](https://github.com/hiddentao/clockwork-engine/blob/main/tests/benchmarks/README.md).

## Testing Best Practices

### Determinism

Use engine's PRNG, not `Math.random()`:

```typescript
// Bad - non-deterministic
const x = Math.random() * 100

// Good - deterministic
const x = engine.prng.randomFloat(0, 100)
```

### Timing

Use tick-based timing, not real time:

```typescript
// Bad - real-time dependent
await sleep(100)

// Good - tick-based
engine.update(6000) // 100ms worth of ticks at 60000 TPS
```

### Isolation

Reset engine state between tests:

```typescript
test('First test', async () => {
  const engine = new TestGameEngine({ loader, platform })
  await engine.reset(config)
  // Test...
})

test('Second test', async () => {
  // Create fresh engine instance
  const engine = new TestGameEngine({ loader, platform })
  await engine.reset(config)
  // Test...
})
```

### Mock Data

Use consistent test data:

```typescript
const TEST_CONFIG = {
  prngSeed: 'test-seed-123',
  gameSpecific: {
    mapSize: 1000,
    playerCount: 4,
  },
}

test('Test 1', async () => {
  await engine.reset(TEST_CONFIG)
  // Test...
})

test('Test 2', async () => {
  await engine.reset(TEST_CONFIG)
  // Test...
})
```

## Headless Testing

For server-side or CI environments without browsers:

```typescript
import { HeadlessLoader } from '@hiddentao/clockwork-engine'
import { MemoryPlatformLayer } from '@hiddentao/clockwork-engine'

const loader = new HeadlessLoader()
const platform = new MemoryPlatformLayer()
const engine = new TestGameEngine({ loader, platform })

// No assets needed, no rendering, instant execution
await engine.reset(config)
```

See [Headless Replay Guide](./headless-replay.md).

## Coverage

Current test coverage (as of completion):

* **Unit tests**: ~1200 tests across 41 files
* **Integration tests**: ~200 tests across 8 files
* **Browser tests**: ~35 tests across 5 files
* **Total**: ~1600 tests

Run coverage report:

```bash
bun test --coverage
```

## Writing New Tests

### Unit Test Template

```typescript
import { test, expect } from 'bun:test'

test.describe('MyFeature', () => {
  test('should do something', () => {
    // Arrange
    const input = createTestInput()

    // Act
    const result = doSomething(input)

    // Assert
    expect(result).toBe(expectedOutput)
  })

  test('should handle edge case', () => {
    // Test edge case...
  })
})
```

### Integration Test Template

```typescript
import { test, expect } from 'bun:test'
import { MemoryPlatformLayer } from '../../src/platform/memory'

test('End-to-end workflow', async () => {
  const platform = new MemoryPlatformLayer()
  const engine = new TestGameEngine({ loader, platform })

  await engine.reset(config)

  // Simulate gameplay
  for (let i = 0; i < 100; i++) {
    engine.update(1000)
  }

  // Verify final state
  expect(engine.totalTicks).toBe(100000)
})
```

### Browser Test Template

```typescript
import { test, expect } from '@playwright/test'

test('Browser feature', async ({ page }) => {
  await page.goto('http://localhost:3000/tests/browser/test-page.html')

  const result = await page.evaluate(`(async () => {
    // Browser-side code
    return { success: true }
  })()`)

  expect(result.success).toBe(true)
})
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
- name: Run tests
  run: bun test

- name: Run browser tests
  run: bun test:browser

- name: Run benchmarks
  run: bun run tests/benchmarks/run-all.ts
```

Tests run automatically on pull requests.

## Related Documentation

* [Platform Layer](./platform-layer.md) - Platform abstraction for testing
* [Headless Replay](./headless-replay.md) - Server-side validation
* [Performance Guide](./performance.md) - Optimization strategies
