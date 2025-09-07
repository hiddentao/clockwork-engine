# 📹 Recording and Replaying

The Clockwork Engine's recording and replay system enables deterministic capture and playback of entire gameplay sessions with frame-perfect accuracy. This system is fundamental to the engine's architecture and enables features like automated testing, gameplay analysis, and deterministic debugging.

## Overview

The recording system captures all game events and frame timing data during gameplay, while the replay system reconstructs the exact same gameplay by feeding recorded events back through the engine. This approach ensures that replays are not just visually similar to the original session, but mathematically identical.

## How It Works

### Recording Architecture

The recording system operates by intercepting events at the **GameEventManager** level, ensuring that all game state changes are captured:

1. **Event Capture**: All user inputs and object updates flow through the event system
2. **Frame Timing**: The exact `deltaFrames` values for each update cycle are recorded
3. **Deterministic State**: The engine's PRNG seed is recorded to ensure identical random sequences
4. **Serialization**: All event parameters are automatically serialized for storage

### Replay Architecture

During replay, the system reverses this process:

1. **State Initialization**: The engine is reset with the original seed
2. **Event Source Switching**: Live input is replaced with recorded events
3. **Frame-Accurate Timing**: The exact frame timing is reproduced
4. **Deterministic Execution**: The engine processes events identically to the original session

## Key Concepts

### Frame-Based Determinism

The system records **frame counts** rather than wall-clock time, ensuring that replays are deterministic regardless of performance variations:

```typescript
// Recording captures deltaFrames for each update
game.update(1.5) // Records deltaFrames: 1.5
game.update(0.8) // Records deltaFrames: 0.8
game.update(1.2) // Records deltaFrames: 1.2

// Replay feeds back the exact same values
```

### Event Interception

All game events are captured at the source:

```typescript
// User input events
recorder.recordEvent({
  type: GameEventType.USER_INPUT,
  frame: engine.getTotalFrames(),
  inputType: "keydown",
  params: { key: "w" }
})

// Object update events  
recorder.recordEvent({
  type: GameEventType.OBJECT_UPDATE,
  frame: engine.getTotalFrames(),
  objectType: "Player",
  objectId: "player-1", 
  method: "setPosition",
  params: [serializer.serialize(new Vector2D(100, 200))]
})
```

### Universal Serialization

All event parameters are automatically serialized to ensure they can be stored and reconstructed exactly:

```typescript
// Complex objects are serialized transparently
const position = new Vector2D(150, 300)
recorder.recordObjectUpdate(player, "setPosition", [position])
// Automatically becomes: params: [{ __type: "Vector2D", x: 150, y: 300 }]
```

## Recording API

### GameRecorder

The `GameRecorder` class handles event capture:

```typescript
const recorder = new GameRecorder()

// Start recording
recorder.startRecording(eventManager, "my-seed", "Level 1 playthrough")

// Events are automatically captured during gameplay
game.update(1.0)

// Stop and get recording
recorder.stopRecording()
const recording = recorder.getCurrentRecording()
```

### Manual Event Recording

For direct object modifications outside the normal input flow, you must manually record events:

```typescript
// When you modify an object directly, record the update
player.setPosition(new Vector2D(200, 150))
recorder.recordEvent({
  type: GameEventType.OBJECT_UPDATE,
  frame: engine.getTotalFrames(),
  objectType: "Player",
  objectId: player.getId(),
  method: "setPosition", 
  params: [serializer.serialize(new Vector2D(200, 150))]
})
```

### Recording Data Structure

Recordings contain all necessary data for perfect reproduction:

```typescript
interface GameRecording {
  seed: string                 // PRNG seed
  events: GameEvent[]          // All game events
  deltaFrames: number[]        // Frame timing data
  totalFrames: number          // Total frames processed
  metadata?: {
    createdAt: number          // Timestamp
    version?: string           // Engine version
    description?: string       // User description
  }
}
```

## Replay API

### ReplayManager

The `ReplayManager` class handles playback:

```typescript
const replayManager = new ReplayManager(engine)

// Start replay - automatically resets engine and switches event source
replayManager.replay(recording)

// Monitor replay progress
const progress = replayManager.getReplayProgress()
console.log(`Replay ${Math.round(progress.progress * 100)}% complete`)

// Stop replay manually if needed
replayManager.stopReplay()
```

### Replay Lifecycle

The replay manager handles the complete replay lifecycle:

```typescript
// 1. Validation
replayManager.replay(recording) // Validates recording structure

// 2. Engine Reset
engine.reset(recording.seed)    // Resets to identical initial state

// 3. Event Source Switch  
eventManager.setSource(recordedEventSource) // Switches from live to recorded input

// 4. Playback Loop
// Processes each recorded frame with exact timing
for (const deltaFrame of recording.deltaFrames) {
  engine.update(deltaFrame)
}
```

### Progress Monitoring

Track replay progress with detailed information:

```typescript
const progress = replayManager.getReplayProgress()

if (progress.isReplaying) {
  console.log(`Progress: ${(progress.progress * 100).toFixed(1)}%`)
  console.log(`More frames: ${progress.hasMoreFrames}`)
}
```

## Code Examples

### Complete Recording Example

```typescript
class MyGame extends GameEngine {
  private recorder = new GameRecorder()
  
  setup() {
    // Create game objects
    const player = new Player(new Vector2D(100, 100))
    this.registerGameObject(player)
  }
  
  startRecording() {
    // Begin recording with a unique seed
    const seed = `game-${Date.now()}`
    this.reset(seed)
    this.recorder.startRecording(this.getEventManager(), seed, "My gameplay session")
    this.start()
  }
  
  saveRecording() {
    this.recorder.stopRecording()
    const recording = this.recorder.getCurrentRecording()
    
    // Save to file, database, etc.
    localStorage.setItem('my-recording', JSON.stringify(recording))
    return recording
  }
}
```

### Complete Replay Example

```typescript
class ReplayViewer {
  constructor(private engine: GameEngine) {
    this.replayManager = new ReplayManager(engine)
  }
  
  async loadAndPlayRecording(recordingData: string) {
    const recording = JSON.parse(recordingData)
    
    // Start replay
    this.replayManager.replay(recording)
    
    // Monitor progress
    const progressInterval = setInterval(() => {
      const progress = this.replayManager.getReplayProgress()
      
      if (!progress.isReplaying) {
        console.log("Replay completed!")
        clearInterval(progressInterval)
        return
      }
      
      console.log(`Replay: ${(progress.progress * 100).toFixed(1)}%`)
    }, 1000)
  }
}
```

### Recording Custom Events

```typescript
class CustomRecorder extends GameRecorder {
  recordCustomAction(action: string, data: any) {
    if (this.isCurrentlyRecording()) {
      this.recordEvent({
        type: GameEventType.USER_INPUT,
        frame: this.engine.getTotalFrames(),
        timestamp: Date.now(),
        inputType: "custom_action",
        params: { action, data: this.serializer.serialize(data) }
      })
    }
  }
}

// Usage
recorder.recordCustomAction("power_up_collected", { type: "speed_boost", duration: 300 })
```

## Edge Cases and Gotchas

### Manual Recording Requirement

**Issue**: Objects modified directly (not through input events) won't be recorded automatically.

**Solution**: Always record object updates manually:

```typescript
// BAD - Changes not recorded
player.setHealth(player.getHealth() - 10)

// GOOD - Changes recorded
player.setHealth(player.getHealth() - 10)
recorder.recordEvent({
  type: GameEventType.OBJECT_UPDATE,
  frame: engine.getTotalFrames(),
  objectType: "Player",
  objectId: player.getId(),
  method: "setHealth",
  params: [player.getHealth()]
})
```

### Floating-Point Frame Timing

**Issue**: Floating-point deltaFrames values may cause slight timing drift.

**Solution**: The system includes tolerance for floating-point precision:

```typescript
// The replay manager automatically handles floating-point tolerance
const TOLERANCE = 0.0001
if (accumulatedFrames >= recordedDeltaFrames - TOLERANCE) {
  // Process frame
}
```

### Serialization Dependencies

**Issue**: Unregistered types will fail during replay.

**Solution**: Register all custom types before recording:

```typescript
// Register types once during initialization
serializer.registerType("Vector2D", Vector2D)
serializer.registerType("Player", Player)
serializer.registerType("Enemy", Enemy)

// Now these can be safely recorded and replayed
```

### State Synchronization

**Issue**: Engine state might differ between recording and replay if not properly reset.

**Solution**: Always use the recorded seed and reset completely:

```typescript
// The ReplayManager handles this automatically
replayManager.replay(recording) // Automatically calls engine.reset(recording.seed)
```

## Performance Considerations

### Recording Overhead

- **Event Capture**: Minimal overhead, events are captured in-memory
- **Serialization**: Moderate overhead for complex objects
- **Storage**: Linear growth with session length and complexity

**Optimization**: Use efficient serialization and batch recording when possible.

### Replay Performance

- **Event Processing**: Similar to live gameplay
- **Deserialization**: Moderate overhead for complex objects  
- **Frame Timing**: Frame-accurate processing may be slower than real-time

**Optimization**: Consider fast-forward modes for long replays:

```typescript
// Process multiple frames per update for faster replay
while (canProcessMoreFrames && fastForwardMode) {
  replayManager.update(targetDeltaFrames)
}
```

### Memory Usage

**Recording Size**: Depends on session length and event frequency
- Typical session: 1-5 MB per hour
- Complex games: Up to 50+ MB per hour

**Optimization**: Implement compression or streaming for long sessions.

## Best Practices

### 1. Always Use Deterministic Seeds

```typescript
// GOOD - Consistent seed
const seed = "level-1-attempt-1"
game.reset(seed)

// BAD - Non-deterministic seed
const seed = Date.now().toString() // Different every time
```

### 2. Record at Event Boundaries

```typescript
// GOOD - Record complete logical operations
player.takeDamage(25)
recorder.recordObjectUpdate(player, "takeDamage", [25])

// BAD - Recording partial state changes
player.health -= 25 // Manual field modification
recorder.recordObjectUpdate(player, "setHealth", [player.health])
```

### 3. Validate Recordings

```typescript
// Always validate recordings before storage
const recording = recorder.getCurrentRecording()
if (recording && recording.events.length > 0) {
  saveRecording(recording)
} else {
  console.warn("Empty or invalid recording")
}
```

### 4. Handle Replay Errors

```typescript
try {
  replayManager.replay(recording)
} catch (error) {
  console.error("Replay failed:", error.message)
  // Fallback or error handling
}
```

### 5. Clean Up Resources

```typescript
// Stop recording when done
recorder.stopRecording()
recorder.reset() // Clear memory

// Stop replay when switching modes
replayManager.stopReplay()
```

The recording and replay system is a powerful feature that enables deterministic game development, thorough testing, and rich gameplay analysis. By understanding its architecture and following best practices, you can build games with unprecedented reproducibility and debugging capabilities.