# 🎮 Game Loop

The game loop is the heart of any game engine, responsible for coordinating all game systems in each frame. Clockwork Engine implements a deterministic, frame-based game loop through the `GameEngine.update()` method, ensuring consistent behavior across different hardware and enabling perfect recording and replay functionality.

## Overview

The Clockwork Engine game loop follows a fixed update order each frame, processing systems in a deterministic sequence. Unlike delta-time-based engines that update based on elapsed wall-clock time, Clockwork uses **frame counts** to ensure mathematical precision and reproducibility.

## How It Works

### Update Order Architecture

The game loop processes systems in this exact order each frame:

```
1. Frame Counter Update
2. Event Processing (Input & Object Updates)  
3. Timer System Update
4. Game Object Updates (by type groups)
```

This ordering ensures that:
- Events are processed before object updates
- Timers fire before objects that might depend on them
- All objects update in consistent type-based groups

### Frame-Based Timing & Pixi.js Integration

Instead of delta time (seconds), the system uses **delta frames** (frame count). This design choice enables seamless integration with rendering libraries like Pixi.js:

```typescript
// Traditional delta-time approach
position += velocity * deltaTime  // seconds (varies with framerate)

// Clockwork frame-based approach  
position += velocity * deltaFrames  // frame count (consistent)
```

**Perfect Pixi.js Integration**: Pixi.js provides `ticker.deltaTime` as a frame-rate independent value (1.0 = 60fps, 0.5 = 30fps, 2.0 = 120fps), which maps directly to Clockwork's `deltaFrames` system:

```typescript
import * as PIXI from 'pixi.js'

const ticker = PIXI.Ticker.shared
ticker.add((ticker) => {
  // ticker.deltaTime IS deltaFrames - perfect 1:1 mapping!
  const deltaFrames = ticker.deltaTime
  gameEngine.update(deltaFrames)
  renderer.render()
})
```

This ensures smooth gameplay across different devices and frame rates while maintaining mathematical precision for deterministic behavior.

### State-Dependent Processing

The game loop only processes updates when in the `PLAYING` state:
- `READY`: Engine initialized but not running
- `PLAYING`: Normal game loop processing
- `PAUSED`: Game loop skipped, state preserved
- `ENDED`: Game finished, no processing

## Key Concepts

### Delta Frames

**Delta Frames** represent the number of frames to advance the simulation:
- Usually `1.0` for normal 60fps gameplay
- Can be fractional for variable frame rate conversion
- Consistent across all systems in a single update

### Total Frames

**Total Frames** is the accumulated count of all frames processed:
- Starts at `0` when engine resets
- Increments by `deltaFrames` each update
- Used for event timing and deterministic calculations

### IGameLoop Interface

All updateable systems implement the `IGameLoop` interface:

```typescript
interface IGameLoop {
  update(deltaFrames: number, totalFrames: number): void | Promise<void>
}
```

### State Machine Integration

The game loop respects the engine's state machine:
- Only processes updates in `PLAYING` state
- State transitions are handled independently of the game loop
- Recording and replay systems integrate seamlessly

## GameEngine Update Cycle

### Main Update Method

```typescript
update(deltaFrames: number): void {
  // Only process if game is running
  if (this.state !== GameState.PLAYING) {
    return
  }

  // 1. Update frame counter
  this.totalFrames += deltaFrames

  // 2. Record frame progression (if recording)
  if (this.recorder) {
    this.recorder.recordFrameUpdate(deltaFrames, this.totalFrames)
  }

  // 3. Process events (input, object updates)
  this.eventManager.update(deltaFrames, this.totalFrames)

  // 4. Update timer system
  this.timer.update(deltaFrames, this.totalFrames)

  // 5. Update all game object groups
  for (const [_type, group] of this.gameObjectGroups) {
    group.update(deltaFrames, this.totalFrames)
  }
}
```

### State Management

```typescript
// Engine must be in correct state to process
getState(): GameState { return this.state }

// State transitions affect loop processing
start(): void    // READY → PLAYING
pause(): void    // PLAYING → PAUSED  
resume(): void   // PAUSED → PLAYING
end(): void      // PLAYING/PAUSED → ENDED
```

### Frame Counter Access

```typescript
getTotalFrames(): number { return this.totalFrames }
```

## IGameLoop Interface

### Implementation Contract

All systems that need per-frame updates implement `IGameLoop`:

```typescript
class MyGameSystem implements IGameLoop {
  update(deltaFrames: number, totalFrames: number): void {
    // System-specific update logic
    this.processSystemLogic(deltaFrames)
    
    // Can use totalFrames for timing
    if (totalFrames % 60 === 0) {
      this.doSomethingEverySecond() // Assuming 60fps
    }
  }
}
```

### Async Updates

The interface supports async updates for systems that need them:

```typescript
class AsyncGameSystem implements IGameLoop {
  async update(deltaFrames: number, totalFrames: number): Promise<void> {
    await this.processAsyncLogic(deltaFrames)
  }
}
```

## Game Loop Integration

### Basic Game Implementation

```typescript
class MyGame extends GameEngine {
  private player: Player
  private enemies: Enemy[] = []
  private inputHandler: InputHandler
  
  setup(): void {
    // Initialize game objects
    this.player = new Player("player-1", new Vector2D(100, 100))
    this.registerGameObject(this.player)
    
    // Create some enemies
    for (let i = 0; i < 5; i++) {
      const enemy = new Enemy(`enemy-${i}`, new Vector2D(200 + i * 50, 200))
      this.registerGameObject(enemy)
    }
    
    // Set up input handling
    this.inputHandler = new InputHandler(this.getEventManager())
  }
  
  // The base GameEngine.update() handles the main loop
  // Custom logic can be added through game objects and systems
}

// Usage
const game = new MyGame()
game.reset("my-seed")
game.start()

// In your render loop (typically 60fps)
function gameLoop() {
  game.update(1.0) // Advance by 1 frame
  renderer.render()
  requestAnimationFrame(gameLoop)
}
gameLoop()
```

### Pixi.js Integration

Clockwork Engine's `deltaFrames` system is specifically designed to integrate seamlessly with Pixi.js:

```typescript
import * as PIXI from 'pixi.js'

// Pixi.js ticker provides deltaFrames directly
const ticker = PIXI.Ticker.shared

ticker.add((deltaFrames) => {
  // deltaFrames from Pixi.js:
  // - 1.0 = 60fps (perfect frame rate)
  // - 0.5 = 30fps (half speed)
  // - 2.0 = 120fps (double speed)
  // This maps perfectly to Clockwork's deltaFrames concept
  
  game.update(deltaFrames) // Direct mapping!
  renderer.render() // Update visual representation
})

ticker.start()
```

### Alternative Frame Rate Handling

For non-Pixi.js applications, you can convert wall-clock time to frame deltas:

```typescript
class FrameRateAdapter {
  private targetFPS = 60
  private lastTime = 0
  
  update(currentTime: number, game: GameEngine): void {
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    
    // Convert wall-clock time to frame count
    const deltaFrames = (deltaTime / 1000) * this.targetFPS
    
    game.update(deltaFrames)
  }
}

// Usage with requestAnimationFrame
const adapter = new FrameRateAdapter()
function gameLoop(currentTime: number) {
  adapter.update(currentTime, game)
  renderer.render()
  requestAnimationFrame(gameLoop)
}
```

### Custom Game Systems

```typescript
class WeatherSystem implements IGameLoop {
  private weatherState = 'sunny'
  private nextWeatherChange = 0
  
  update(deltaFrames: number, totalFrames: number): void {
    // Check if it's time to change weather
    if (totalFrames >= this.nextWeatherChange) {
      this.changeWeather()
      this.nextWeatherChange = totalFrames + (60 * 30) // 30 seconds at 60fps
    }
    
    // Apply weather effects to game objects
    this.applyWeatherEffects(deltaFrames)
  }
  
  private changeWeather(): void {
    const weathers = ['sunny', 'rainy', 'cloudy', 'stormy']
    this.weatherState = weathers[Math.floor(Math.random() * weathers.length)]
  }
  
  private applyWeatherEffects(deltaFrames: number): void {
    if (this.weatherState === 'rainy') {
      // Reduce visibility, add rain particles, etc.
    }
  }
}

// Integrate custom system
class MyGame extends GameEngine {
  private weatherSystem = new WeatherSystem()
  
  update(deltaFrames: number): void {
    super.update(deltaFrames) // Run standard game loop
    
    // Update custom systems after standard processing
    if (this.getState() === GameState.PLAYING) {
      this.weatherSystem.update(deltaFrames, this.getTotalFrames())
    }
  }
}
```

### Time-Based Events

```typescript
class EventScheduler implements IGameLoop {
  private scheduledEvents: ScheduledEvent[] = []
  
  scheduleEvent(eventName: string, triggerFrame: number, callback: () => void): void {
    this.scheduledEvents.push({ eventName, triggerFrame, callback })
    // Sort by trigger frame for efficient processing
    this.scheduledEvents.sort((a, b) => a.triggerFrame - b.triggerFrame)
  }
  
  update(deltaFrames: number, totalFrames: number): void {
    // Process all events that should trigger this frame
    while (this.scheduledEvents.length > 0 && 
           this.scheduledEvents[0].triggerFrame <= totalFrames) {
      const event = this.scheduledEvents.shift()!
      try {
        event.callback()
      } catch (error) {
        console.error(`Error executing scheduled event ${event.eventName}:`, error)
      }
    }
  }
}

interface ScheduledEvent {
  eventName: string
  triggerFrame: number
  callback: () => void
}
```

## Code Examples

### Performance-Optimized Game Loop

```typescript
class OptimizedGame extends GameEngine {
  private updateCounter = 0
  private performanceMetrics = {
    eventTime: 0,
    timerTime: 0,
    objectTime: 0,
    totalTime: 0
  }
  
  update(deltaFrames: number): void {
    const startTime = performance.now()
    
    if (this.state !== GameState.PLAYING) {
      return
    }
    
    this.totalFrames += deltaFrames
    
    if (this.recorder) {
      this.recorder.recordFrameUpdate(deltaFrames, this.totalFrames)
    }
    
    // Measure event processing time
    const eventStart = performance.now()
    this.eventManager.update(deltaFrames, this.totalFrames)
    this.performanceMetrics.eventTime = performance.now() - eventStart
    
    // Measure timer processing time
    const timerStart = performance.now()
    this.timer.update(deltaFrames, this.totalFrames)
    this.performanceMetrics.timerTime = performance.now() - timerStart
    
    // Measure object update time
    const objectStart = performance.now()
    for (const [_type, group] of this.gameObjectGroups) {
      group.update(deltaFrames, this.totalFrames)
    }
    this.performanceMetrics.objectTime = performance.now() - objectStart
    
    this.performanceMetrics.totalTime = performance.now() - startTime
    
    // Log performance every second
    this.updateCounter++
    if (this.updateCounter % 60 === 0) {
      this.logPerformanceMetrics()
    }
  }
  
  private logPerformanceMetrics(): void {
    const metrics = this.performanceMetrics
    if (metrics.totalTime > 16) { // More than one frame at 60fps
      console.warn(`Slow frame detected: ${metrics.totalTime.toFixed(2)}ms`)
      console.log(`  Events: ${metrics.eventTime.toFixed(2)}ms`)
      console.log(`  Timers: ${metrics.timerTime.toFixed(2)}ms`)
      console.log(`  Objects: ${metrics.objectTime.toFixed(2)}ms`)
    }
  }
}
```

### Multi-Speed Game Loop

```typescript
class MultiSpeedGame extends GameEngine {
  private gameSpeed = 1.0 // Normal speed
  
  setGameSpeed(speed: number): void {
    this.gameSpeed = Math.max(0.1, Math.min(5.0, speed)) // Clamp between 0.1x and 5x
  }
  
  update(baseDeltaFrames: number): void {
    // Apply speed multiplier to frame delta
    const adjustedDeltaFrames = baseDeltaFrames * this.gameSpeed
    super.update(adjustedDeltaFrames)
  }
  
  // Convenience methods for common speed changes
  slowMotion(): void { this.setGameSpeed(0.5) }
  normalSpeed(): void { this.setGameSpeed(1.0) }
  fastForward(): void { this.setGameSpeed(2.0) }
  pause(): void { this.setGameSpeed(0.0); super.pause() }
}
```

### Game Loop with Automatic Cleanup

```typescript
class ManagedGame extends GameEngine {
  private cleanupInterval = 60 * 5 // 5 seconds at 60fps
  private lastCleanup = 0
  
  update(deltaFrames: number): void {
    super.update(deltaFrames)
    
    // Perform automatic cleanup periodically
    if (this.getTotalFrames() - this.lastCleanup >= this.cleanupInterval) {
      this.performCleanup()
      this.lastCleanup = this.getTotalFrames()
    }
  }
  
  private performCleanup(): void {
    let totalRemoved = 0
    
    // Clean up destroyed objects from all groups
    for (const [type, group] of this.gameObjectGroups) {
      const removed = group.clearDestroyed()
      totalRemoved += removed
      
      if (removed > 0) {
        console.log(`Cleaned up ${removed} destroyed ${type} objects`)
      }
    }
    
    // Clean up collision tree
    const collisionTree = this.getCollisionTree()
    if (collisionTree && totalRemoved > 0) {
      // Collision tree cleanup happens automatically when objects are destroyed
      console.log(`Collision tree updated after cleanup`)
    }
    
    // Trigger garbage collection hint (if available)
    if (global.gc) {
      global.gc()
    }
  }
}
```

### Recording-Aware Game Loop

```typescript
class RecordingGame extends GameEngine {
  private recorder: GameRecorder
  private isRecording = false
  
  constructor() {
    super()
    this.recorder = new GameRecorder()
  }
  
  startRecording(description?: string): void {
    if (this.getState() !== GameState.READY) {
      throw new Error("Can only start recording from READY state")
    }
    
    const seed = `recording-${Date.now()}`
    this.reset(seed)
    this.recorder.startRecording(this.getEventManager(), seed, description)
    this.isRecording = true
  }
  
  stopRecording(): GameRecording | null {
    if (!this.isRecording) {
      return null
    }
    
    this.recorder.stopRecording()
    this.isRecording = false
    return this.recorder.getCurrentRecording()
  }
  
  update(deltaFrames: number): void {
    // Standard game loop
    super.update(deltaFrames)
    
    // Additional recording-specific processing
    if (this.isRecording && this.getState() === GameState.PLAYING) {
      // Could add additional recording metadata here
      this.updateRecordingMetrics()
    }
  }
  
  private updateRecordingMetrics(): void {
    const recording = this.recorder.getCurrentRecording()
    if (recording && this.getTotalFrames() % 300 === 0) { // Every 5 seconds
      console.log(`Recording: ${recording.events.length} events, ${this.getTotalFrames()} frames`)
    }
  }
}
```

## Edge Cases and Gotchas

### State Transition Timing

**Issue**: State changes mid-frame can cause inconsistent behavior.

**Solution**: Handle state changes before or after the full update cycle:

```typescript
class SafeStateGame extends GameEngine {
  private pendingStateChange?: GameState
  
  requestStateChange(newState: GameState): void {
    this.pendingStateChange = newState
  }
  
  update(deltaFrames: number): void {
    // Process pending state change before update
    if (this.pendingStateChange) {
      this.transitionToState(this.pendingStateChange)
      this.pendingStateChange = undefined
    }
    
    super.update(deltaFrames)
  }
}
```

### Large Delta Frames

**Issue**: Large deltaFrames values can cause instability in physics or collision detection.

**Solution**: Clamp or subdivide large frame deltas:

```typescript
class StableGame extends GameEngine {
  private maxDeltaFrames = 5.0 // Maximum frames per update
  
  update(deltaFrames: number): void {
    // Clamp excessive frame deltas
    const clampedDelta = Math.min(deltaFrames, this.maxDeltaFrames)
    
    if (clampedDelta < deltaFrames) {
      console.warn(`Large delta frames clamped: ${deltaFrames} → ${clampedDelta}`)
    }
    
    super.update(clampedDelta)
  }
}
```

### Floating-Point Frame Precision

**Issue**: Floating-point deltaFrames can accumulate precision errors over time.

**Solution**: Use epsilon comparisons and periodic frame counter validation:

```typescript
class PreciseGame extends GameEngine {
  private frameEpsilon = 0.0001
  
  update(deltaFrames: number): void {
    // Round very small frame deltas to zero
    const adjustedDelta = Math.abs(deltaFrames) < this.frameEpsilon ? 0 : deltaFrames
    
    super.update(adjustedDelta)
    
    // Validate frame counter occasionally
    if (this.getTotalFrames() % 1000 === 0) {
      this.validateFrameCounter()
    }
  }
  
  private validateFrameCounter(): void {
    const frames = this.getTotalFrames()
    if (frames !== Math.floor(frames * 1000) / 1000) {
      console.warn(`Frame counter precision drift detected: ${frames}`)
    }
  }
}
```

### Update Order Dependencies

**Issue**: Object update order can affect game behavior.

**Solution**: Use explicit ordering or event-based communication:

```typescript
class OrderedGame extends GameEngine {
  private updateOrder = ['Player', 'Enemy', 'Bullet', 'PowerUp', 'Effect']
  
  update(deltaFrames: number): void {
    if (this.state !== GameState.PLAYING) {
      return
    }
    
    this.totalFrames += deltaFrames
    
    if (this.recorder) {
      this.recorder.recordFrameUpdate(deltaFrames, this.totalFrames)
    }
    
    this.eventManager.update(deltaFrames, this.totalFrames)
    this.timer.update(deltaFrames, this.totalFrames)
    
    // Update objects in specific order
    for (const type of this.updateOrder) {
      const group = this.gameObjectGroups.get(type)
      if (group) {
        group.update(deltaFrames, this.totalFrames)
      }
    }
    
    // Update any remaining types not in the order list
    for (const [type, group] of this.gameObjectGroups) {
      if (!this.updateOrder.includes(type)) {
        group.update(deltaFrames, this.totalFrames)
      }
    }
  }
}
```

## Performance Considerations

### Update Frequency

Monitor frame processing time to maintain target frame rate:

```typescript
class PerformanceMonitoredGame extends GameEngine {
  private frameTimeHistory: number[] = []
  private maxHistorySize = 60
  
  update(deltaFrames: number): void {
    const startTime = performance.now()
    
    super.update(deltaFrames)
    
    const frameTime = performance.now() - startTime
    this.frameTimeHistory.push(frameTime)
    
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift()
    }
    
    // Check for performance issues
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
    if (avgFrameTime > 16.67) { // More than 60fps
      console.warn(`Average frame time: ${avgFrameTime.toFixed(2)}ms`)
    }
  }
}
```

### Memory Management

Implement periodic cleanup to prevent memory leaks:

```typescript
class MemoryManagedGame extends GameEngine {
  private memoryCheckInterval = 60 * 10 // Every 10 seconds
  
  update(deltaFrames: number): void {
    super.update(deltaFrames)
    
    if (this.getTotalFrames() % this.memoryCheckInterval === 0) {
      this.checkMemoryUsage()
    }
  }
  
  private checkMemoryUsage(): void {
    // Check object counts
    let totalObjects = 0
    for (const [type, group] of this.gameObjectGroups) {
      const active = group.activeSize()
      const total = group.size()
      totalObjects += active
      
      if (total - active > 100) {
        console.warn(`Many destroyed ${type} objects: ${total - active}`)
        group.clearDestroyed()
      }
    }
    
    if (totalObjects > 10000) {
      console.warn(`High object count: ${totalObjects}`)
    }
  }
}
```

## Rendering Library Integration

### Frame Count Benefits for Rendering

The frame-based approach provides significant advantages for integration with popular rendering libraries:

#### Universal Compatibility
Most game rendering libraries expect frame-rate independent values:

```typescript
// Three.js integration
threejsClock.getDelta() // Returns seconds-based delta
// Convert to frame count: delta * targetFPS

// Pixi.js integration  
pixiTicker.deltaTime // Already frame-rate independent!
// Direct mapping: ticker.deltaTime === deltaFrames

// Babylon.js integration
scene.registerBeforeRender(() => {
  const deltaTime = engine.getDeltaTime() / 1000 // Convert ms to seconds
  const deltaFrames = deltaTime * 60 // Convert to frame count
})
```

#### Consistent Performance
Frame counts provide consistent behavior across different hardware:

```typescript
// 60fps device: deltaFrames = 1.0 → smooth movement
// 30fps device: deltaFrames = 2.0 → same distance per update
// 120fps device: deltaFrames = 0.5 → same distance per update

class SmoothMovement {
  update(deltaFrames: number): void {
    // Movement speed is automatically scaled to framerate
    this.position.x += this.velocity.x * deltaFrames
  }
}
```

#### Easy Debugging
Frame counts make timing issues easier to debug:

```typescript
console.log(`Update ${this.getTotalFrames()}: deltaFrames=${deltaFrames}`)
// Frame counts are predictable: 0, 1, 2, 3... at 60fps
// Time-based deltas vary: 0.0166, 0.0134, 0.0201...
```

### Common Integration Patterns

#### Animation Timing
```typescript
class FrameBasedAnimation {
  private animationSpeed = 0.1 // frames per keyframe
  private currentFrame = 0
  
  update(deltaFrames: number): void {
    this.currentFrame += this.animationSpeed * deltaFrames
    
    // Works consistently across any framerate
    const keyframe = Math.floor(this.currentFrame)
    this.setSprite(this.keyframes[keyframe % this.keyframes.length])
  }
}
```

#### Physics Integration
```typescript
class PhysicsWorld {
  update(deltaFrames: number): void {
    // Frame-based physics step
    const timeStep = (1/60) * deltaFrames
    this.physicsEngine.step(timeStep)
    
    // Consistent physics simulation regardless of render framerate
  }
}
```

## Best Practices

### 1. Keep Updates Deterministic

```typescript
// GOOD - Deterministic update
class GameObject {
  update(deltaFrames: number): void {
    this.position = this.position.add(this.velocity.multiply(deltaFrames))
  }
}

// AVOID - Non-deterministic update
class BadGameObject {
  update(): void {
    const deltaTime = performance.now() - this.lastUpdate // Non-deterministic!
    this.position += this.velocity * deltaTime
  }
}
```

### 2. Handle State Properly

```typescript
// GOOD - State-aware update
class GameSystem implements IGameLoop {
  update(deltaFrames: number, totalFrames: number): void {
    // Only process if game is in correct state
    if (this.engine.getState() !== GameState.PLAYING) {
      return
    }
    
    this.processLogic(deltaFrames)
  }
}
```

### 3. Use Frame Timing for Events

```typescript
// GOOD - Frame-based timing
class TimedSpawner {
  private nextSpawn = 0
  
  update(deltaFrames: number, totalFrames: number): void {
    if (totalFrames >= this.nextSpawn) {
      this.spawnEnemy()
      this.nextSpawn = totalFrames + 120 // Spawn every 2 seconds at 60fps
    }
  }
}
```

### 4. Monitor Performance

```typescript
// GOOD - Performance monitoring
class MonitoredGame extends GameEngine {
  update(deltaFrames: number): void {
    const startTime = performance.now()
    super.update(deltaFrames)
    const duration = performance.now() - startTime
    
    if (duration > 16) {
      console.warn(`Slow update: ${duration.toFixed(2)}ms`)
    }
  }
}
```

### 5. Clean Up Resources

```typescript
// GOOD - Automatic cleanup
class WellManagedGame extends GameEngine {
  update(deltaFrames: number): void {
    super.update(deltaFrames)
    
    // Periodic cleanup
    if (this.getTotalFrames() % 300 === 0) {
      this.performMaintenance()
    }
  }
  
  private performMaintenance(): void {
    for (const [type, group] of this.gameObjectGroups) {
      group.clearDestroyed()
    }
  }
}
```

The game loop is the foundation that enables Clockwork Engine's deterministic behavior. By understanding frame-based updates, proper state management, and system integration, you can build games that are both performant and perfectly reproducible.