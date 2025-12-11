# Performance Benchmarks

This directory contains performance benchmarks for the Clockwork engine. Benchmarks help track performance characteristics and detect regressions.

## Running Benchmarks

### Run all benchmarks
```bash
bun run tests/benchmarks/run-all.ts
```

This generates a comprehensive report in `tests/benchmarks/RESULTS.md`.

### Run individual benchmarks
```bash
bun run tests/benchmarks/platform-overhead.bench.ts
bun run tests/benchmarks/collision-detection.bench.ts
bun run tests/benchmarks/serialization.bench.ts
```

## Available Benchmarks

### Platform Overhead
**File**: `platform-overhead.bench.ts`
**Purpose**: Measures the cost of the platform abstraction layer
**Metrics**: Operations per second for common rendering operations

### Collision Detection
**File**: `collision-detection.bench.ts`
**Purpose**: Tests CollisionGrid performance at different scales
**Metrics**: Insert, query, and update performance with 100-1000 objects

### Serialization
**File**: `serialization.bench.ts`
**Purpose**: Measures serialize/deserialize performance
**Metrics**: Round-trip time for various data structures

## Interpreting Results

Results are formatted as markdown tables:

| Benchmark | Ops/sec | Time/op (ms) | Iterations | Total Time (ms) |
|-----------|---------|--------------|------------|-----------------|
| Example | 10,000 | 0.10 | 10,000 | 1,000.00 |

- **Ops/sec**: Operations per second (higher is better)
- **Time/op**: Milliseconds per operation (lower is better)
- **Iterations**: Number of times the benchmark ran
- **Total Time**: Total benchmark duration

## Performance Goals

**Platform overhead**: < 5% vs direct PIXI.js operations
**Collision detection**: > 1000 objects at 60 FPS
**Serialization**: < 1ms for typical game states

## Adding New Benchmarks

1. Create a new `.bench.ts` file
2. Use the benchmark framework from `framework.ts`
3. Add to `BENCHMARKS` array in `run-all.ts`
4. Document the benchmark purpose above

Example:
```typescript
import { suite, formatSuite } from "./framework"

async function runMyBenchmarks() {
  const results = await suite("My Benchmark Suite", [
    {
      name: "Operation to test",
      fn: () => {
        // Operation code here
      }
    }
  ])

  console.log(formatSuite(results))
}

if (import.meta.main) {
  runMyBenchmarks()
}
```
