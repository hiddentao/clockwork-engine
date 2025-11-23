# Clockwork Examples

This directory contains example scripts demonstrating common Clockwork usage patterns.

## Available Examples

### headless-replay-validation.ts

**Purpose**: Validate game recordings without rendering

**Use cases**:
- Server-side validation
- CI/CD testing
- Determinism verification
- Cheat detection

**Run**:
```bash
bun run examples/headless-replay-validation.ts
```

**Key concepts demonstrated**:
- HeadlessLoader for asset-free replay
- MemoryPlatformLayer for headless execution
- Timeout protection for replay loops
- Progress tracking during replay
- State extraction and validation

### server-side-validation.ts

**Purpose**: Server API pattern for validating client submissions

**Use cases**:
- Leaderboard verification
- Game outcome validation
- Multiplayer result validation
- Anti-cheat systems

**Run**:
```bash
bun run examples/server-side-validation.ts
```

**Key concepts demonstrated**:
- Batch validation of multiple recordings
- Score/outcome extraction
- Client claim vs actual result comparison
- Error handling and reporting
- Progress logging

## Adapting Examples

These examples use mock game engines for demonstration. To use with your game:

1. Replace mock engine class with your GameEngine subclass
2. Implement game-specific state extraction (score, outcome, etc.)
3. Adjust validation logic for your game's rules
4. Add custom error handling as needed

Example adaptation:

```typescript
import { MyGameEngine } from './MyGameEngine'
import { validateRecording } from './examples/headless-replay-validation'

// Use your actual engine
const result = await validateRecording(recording, MyGameEngine)
```

## Related Documentation

- [Headless Replay Guide](../docs/headless-replay.md) - Detailed headless replay patterns
- [Platform Layer Guide](../docs/platform-layer.md) - Platform abstraction overview
- [Testing Guide](../docs/testing.md) - Testing strategies
