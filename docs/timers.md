# ⏱️ Frame-Based Timers

Clockwork Engine provides a deterministic frame-based timer system that replaces JavaScript's native `setTimeout` and `setInterval` functions. This system ensures perfect timing reproducibility across different hardware and enables seamless integration with the recording and replay functionality.

## Overview

The Timer system operates on frame counts rather than wall-clock time, making all timed events deterministic and reproducible. It provides familiar `setTimeout` and `setInterval` APIs while ensuring that all timing behavior is consistent across game runs, platforms, and replay sessions.

## How It Works

### Frame-Based Timing

Instead of milliseconds, timers operate in frames:

```typescript
// Traditional JavaScript (non-deterministic)
setTimeout(callback, 1000) // 1000ms = ~1 second

// Clockwork Timer (deterministic)
timer.setTimeout(callback, 60) // 60 frames = 1 second at 60fps
```

### Deterministic Execution Order

The timer system ensures consistent execution order:
1. Timers are sorted by target frame
2. Timers with the same target frame are sorted by ID
3. All timers execute in this deterministic order

### Callback Safety

The system handles callback errors gracefully:
- Errors in one timer don't affect others
- Failed timers are logged but execution continues
- Repeating timers continue even if one iteration fails

### Real-Time vs Frame Time

The timer system operates on the engine's frame counter:
- Frame time advances only when the game is running (`PLAYING` state)
- Paused games don't advance timer execution
- Perfect synchronization with game state updates

## Key Concepts

### Frame Timing

All timer operations use **frame counts** as the time unit:
- `frames = seconds × target_fps`
- At 60fps: 60 frames = 1 second, 30 frames = 0.5 seconds
- Frame timing is independent of actual rendering rate

### Timer Types

The system supports two timer types:
- **setTimeout**: One-time execution after specified frames
- **setInterval**: Repeating execution every specified frames

### Timer State

Timers maintain state throughout their lifecycle:
- `isActive`: Whether the timer is currently active
- `targetFrame`: When the timer should next execute
- `interval`: Frame interval for repeating timers (undefined for setTimeout)

### Error Handling

The timer system includes comprehensive error handling:
- Individual timer failures don't crash the system
- Error logging for debugging
- Automatic cleanup of failed timers

## Timer API

### Basic Timer Operations

```typescript
const timer = new Timer() // Usually accessed via engine.getTimer()

// One-time timer (like setTimeout)
const timeoutId = timer.setTimeout(() => {
  console.log("This runs once after 60 frames")
}, 60)

// Repeating timer (like setInterval)
const intervalId = timer.setInterval(() => {
  console.log("This runs every 30 frames")
}, 30)

// Cancel any timer
timer.clearTimer(timeoutId)
timer.clearTimer(intervalId)
```

### Timer Management

```typescript
// Get active timer count
const activeCount = timer.getActiveTimerCount()

// Get detailed timer information
const timerInfo = timer.getTimerInfo()
for (const info of timerInfo) {
  console.log(`Timer ${info.id}: ${info.framesRemaining} frames remaining`)
}

// Pause and resume specific timers
timer.pauseTimer(intervalId)
timer.resumeTimer(intervalId)

// Reset all timers
timer.reset()
```

### Engine Integration

```typescript
class MyGame extends GameEngine {
  private spawnTimer: number = 0
  
  setup(): void {
    // Access engine's timer system
    const timer = this.getTimer()
    
    // Schedule initial enemy spawn
    this.spawnTimer = timer.setInterval(() => {
      this.spawnEnemy()
    }, 180) // Every 3 seconds at 60fps
  }
  
  private spawnEnemy(): void {
    const enemy = new Enemy(`enemy-${Date.now()}`, this.getRandomPosition())
    this.registerGameObject(enemy)
  }
}
```

## Code Examples

### Game Event Scheduling

```typescript
class GameEventScheduler {
  constructor(private timer: Timer) {}
  
  scheduleGameEvents(): void {
    // Schedule game start countdown
    this.timer.setTimeout(() => {
      this.showMessage("3...")
    }, 60) // 1 second
    
    this.timer.setTimeout(() => {
      this.showMessage("2...")
    }, 120) // 2 seconds
    
    this.timer.setTimeout(() => {
      this.showMessage("1...")
    }, 180) // 3 seconds
    
    this.timer.setTimeout(() => {
      this.showMessage("GO!")
      this.startGame()
    }, 240) // 4 seconds
    
    // Schedule difficulty increase every 30 seconds
    this.timer.setInterval(() => {
      this.increaseDifficulty()
    }, 1800) // 30 seconds at 60fps
  }
  
  private showMessage(text: string): void {
    console.log(`Game Message: ${text}`)
    // Show UI message
  }
  
  private startGame(): void {
    // Begin gameplay
  }
  
  private increaseDifficulty(): void {
    // Make game harder over time
  }
}
```

### Temporary Effects System

```typescript
class EffectsManager {
  private activeEffects = new Map<string, number>()
  
  constructor(private timer: Timer) {}
  
  applyTemporaryEffect(playerId: string, effect: Effect, durationFrames: number): void {
    // Apply effect immediately
    this.applyEffect(playerId, effect)
    
    // Remove existing timer if player already has this effect
    const existingTimer = this.activeEffects.get(playerId)
    if (existingTimer) {
      this.timer.clearTimer(existingTimer)
    }
    
    // Schedule effect removal
    const timerId = this.timer.setTimeout(() => {
      this.removeEffect(playerId, effect)
      this.activeEffects.delete(playerId)
    }, durationFrames)
    
    this.activeEffects.set(playerId, timerId)
  }
  
  applySpeedBoost(playerId: string, multiplier: number, durationSeconds: number): void {
    const durationFrames = durationSeconds * 60 // Convert to frames
    const effect = new SpeedEffect(multiplier)
    this.applyTemporaryEffect(playerId, effect, durationFrames)
  }
  
  applyShield(playerId: string, durationSeconds: number): void {
    const durationFrames = durationSeconds * 60
    const effect = new ShieldEffect()
    this.applyTemporaryEffect(playerId, effect, durationFrames)
  }
  
  private applyEffect(playerId: string, effect: Effect): void {
    // Apply effect to player
  }
  
  private removeEffect(playerId: string, effect: Effect): void {
    // Remove effect from player
  }
}
```

### Animation System

```typescript
class AnimationSystem {
  private animations = new Map<string, AnimationData>()
  
  constructor(private timer: Timer) {}
  
  animateValue(
    objectId: string,
    property: string,
    from: number,
    to: number,
    durationFrames: number,
    easing: (t: number) => number = (t) => t // Linear by default
  ): void {
    const startFrame = this.getCurrentFrame()
    const frameStep = 1 // Update every frame
    
    const animationId = `${objectId}-${property}`
    this.stopAnimation(animationId) // Cancel existing animation
    
    const timerId = this.timer.setInterval(() => {
      const currentFrame = this.getCurrentFrame()
      const elapsed = currentFrame - startFrame
      const progress = Math.min(elapsed / durationFrames, 1)
      
      const easedProgress = easing(progress)
      const currentValue = from + (to - from) * easedProgress
      
      this.setObjectProperty(objectId, property, currentValue)
      
      if (progress >= 1) {
        // Animation complete
        this.timer.clearTimer(timerId)
        this.animations.delete(animationId)
        this.onAnimationComplete(objectId, property)
      }
    }, frameStep)
    
    this.animations.set(animationId, {
      objectId,
      property,
      timerId,
      from,
      to,
      startFrame
    })
  }
  
  fadeIn(objectId: string, durationFrames: number): void {
    this.animateValue(objectId, 'alpha', 0, 1, durationFrames, this.easeInOut)
  }
  
  slideToPosition(objectId: string, targetX: number, targetY: number, durationFrames: number): void {
    const object = this.getObject(objectId)
    if (!object) return
    
    this.animateValue(objectId, 'x', object.x, targetX, durationFrames)
    this.animateValue(objectId, 'y', object.y, targetY, durationFrames)
  }
  
  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }
  
  private stopAnimation(animationId: string): void {
    const animation = this.animations.get(animationId)
    if (animation) {
      this.timer.clearTimer(animation.timerId)
      this.animations.delete(animationId)
    }
  }
}

interface AnimationData {
  objectId: string
  property: string
  timerId: number
  from: number
  to: number
  startFrame: number
}
```

### State Machine with Timers

```typescript
class AIStateMachine {
  private currentState: AIState = AIState.IDLE
  private stateTimer: number = 0
  
  constructor(
    private enemy: Enemy,
    private timer: Timer
  ) {
    this.enterState(AIState.IDLE)
  }
  
  private enterState(newState: AIState): void {
    this.exitCurrentState()
    this.currentState = newState
    
    switch (newState) {
      case AIState.IDLE:
        this.stateTimer = this.timer.setTimeout(() => {
          this.enterState(AIState.PATROL)
        }, this.getRandomFrames(120, 300)) // 2-5 seconds
        break
        
      case AIState.PATROL:
        this.startPatrolling()
        this.stateTimer = this.timer.setTimeout(() => {
          this.enterState(AIState.IDLE)
        }, this.getRandomFrames(600, 1200)) // 10-20 seconds
        break
        
      case AIState.ALERT:
        this.startAlertBehavior()
        this.stateTimer = this.timer.setTimeout(() => {
          this.enterState(AIState.SEARCH)
        }, 300) // 5 seconds
        break
        
      case AIState.SEARCH:
        this.startSearching()
        this.stateTimer = this.timer.setTimeout(() => {
          this.enterState(AIState.PATROL)
        }, 600) // 10 seconds
        break
        
      case AIState.COMBAT:
        this.startCombat()
        // No automatic state change - combat ends when player dies or escapes
        break
    }
  }
  
  private exitCurrentState(): void {
    if (this.stateTimer > 0) {
      this.timer.clearTimer(this.stateTimer)
      this.stateTimer = 0
    }
    
    // Clean up current state
    switch (this.currentState) {
      case AIState.PATROL:
        this.stopPatrolling()
        break
      case AIState.ALERT:
        this.stopAlertBehavior()
        break
    }
  }
  
  onPlayerSpotted(): void {
    this.enterState(AIState.ALERT)
  }
  
  onPlayerLost(): void {
    this.enterState(AIState.SEARCH)
  }
  
  onCombatStart(): void {
    this.enterState(AIState.COMBAT)
  }
}

enum AIState {
  IDLE = "idle",
  PATROL = "patrol", 
  ALERT = "alert",
  SEARCH = "search",
  COMBAT = "combat"
}
```

### Delayed Execution Queue

```typescript
class DelayedActionQueue {
  private queuedActions: QueuedAction[] = []
  
  constructor(private timer: Timer) {}
  
  queueAction(action: () => void, delayFrames: number, priority: number = 0): number {
    const actionId = this.generateActionId()
    
    const timerId = this.timer.setTimeout(() => {
      this.executeAction(actionId)
    }, delayFrames)
    
    this.queuedActions.push({
      id: actionId,
      action,
      priority,
      timerId,
      scheduledFrame: this.getCurrentFrame() + delayFrames
    })
    
    return actionId
  }
  
  cancelAction(actionId: number): boolean {
    const index = this.queuedActions.findIndex(a => a.id === actionId)
    if (index !== -1) {
      const queuedAction = this.queuedActions[index]
      this.timer.clearTimer(queuedAction.timerId)
      this.queuedActions.splice(index, 1)
      return true
    }
    return false
  }
  
  private executeAction(actionId: number): void {
    const index = this.queuedActions.findIndex(a => a.id === actionId)
    if (index !== -1) {
      const queuedAction = this.queuedActions[index]
      this.queuedActions.splice(index, 1)
      
      try {
        queuedAction.action()
      } catch (error) {
        console.error(`Queued action ${actionId} failed:`, error)
      }
    }
  }
  
  getPendingActions(): QueuedAction[] {
    return [...this.queuedActions].sort((a, b) => a.scheduledFrame - b.scheduledFrame)
  }
  
  clearAllActions(): void {
    for (const action of this.queuedActions) {
      this.timer.clearTimer(action.timerId)
    }
    this.queuedActions = []
  }
}

interface QueuedAction {
  id: number
  action: () => void
  priority: number
  timerId: number
  scheduledFrame: number
}
```

### Cooldown Manager

```typescript
class CooldownManager {
  private cooldowns = new Map<string, CooldownInfo>()
  
  constructor(private timer: Timer) {}
  
  startCooldown(key: string, durationFrames: number): void {
    // Clear existing cooldown if any
    const existing = this.cooldowns.get(key)
    if (existing && existing.timerId) {
      this.timer.clearTimer(existing.timerId)
    }
    
    const timerId = this.timer.setTimeout(() => {
      this.cooldowns.delete(key)
    }, durationFrames)
    
    this.cooldowns.set(key, {
      key,
      startFrame: this.getCurrentFrame(),
      endFrame: this.getCurrentFrame() + durationFrames,
      durationFrames,
      timerId
    })
  }
  
  isOnCooldown(key: string): boolean {
    return this.cooldowns.has(key)
  }
  
  getCooldownProgress(key: string): number {
    const cooldown = this.cooldowns.get(key)
    if (!cooldown) return 0
    
    const currentFrame = this.getCurrentFrame()
    const elapsed = currentFrame - cooldown.startFrame
    return Math.min(elapsed / cooldown.durationFrames, 1)
  }
  
  getRemainingFrames(key: string): number {
    const cooldown = this.cooldowns.get(key)
    if (!cooldown) return 0
    
    const currentFrame = this.getCurrentFrame()
    return Math.max(0, cooldown.endFrame - currentFrame)
  }
  
  // Convenience methods for common abilities
  castSpell(spellName: string, cooldownSeconds: number): boolean {
    if (this.isOnCooldown(spellName)) {
      return false
    }
    
    this.startCooldown(spellName, cooldownSeconds * 60)
    return true
  }
  
  useItem(itemName: string, cooldownFrames: number): boolean {
    if (this.isOnCooldown(itemName)) {
      return false
    }
    
    this.startCooldown(itemName, cooldownFrames)
    return true
  }
}

interface CooldownInfo {
  key: string
  startFrame: number
  endFrame: number
  durationFrames: number
  timerId: number
}
```

## Edge Cases and Gotchas

### Timer Creation During Updates

**Issue**: Creating timers inside timer callbacks can cause timing issues.

**Solution**: The system handles this by using the update start frame:

```typescript
// SAFE - Timer system handles this correctly
timer.setTimeout(() => {
  // This timer will be scheduled from the correct base frame
  timer.setTimeout(() => {
    console.log("Nested timer works correctly")
  }, 30)
}, 60)
```

### Zero-Interval Timers

**Issue**: `setInterval` with 0 frames could cause infinite loops.

**Solution**: The system automatically prevents this:

```typescript
// This won't cause infinite loops
const intervalId = timer.setInterval(() => {
  console.log("Runs once per frame maximum")
}, 0) // Zero interval handled safely
```

### Timer Precision with Large Frame Counts

**Issue**: Very large frame numbers might lose precision with floating-point arithmetic.

**Solution**: Use integer frame counts and be aware of JavaScript's number precision limits:

```typescript
// GOOD - Use reasonable frame counts
const oneHour = 60 * 60 * 60 // 216,000 frames at 60fps
timer.setTimeout(callback, oneHour)

// AVOID - Extremely large numbers may lose precision
const oneYear = 60 * 60 * 60 * 24 * 365 // May lose precision
```

### Memory Leaks from Uncanceled Timers

**Issue**: Timers holding references to objects can prevent garbage collection.

**Solution**: Always cancel timers when objects are destroyed:

```typescript
class GameObject {
  private timers: number[] = []
  
  addTimer(callback: () => void, frames: number): number {
    const timerId = timer.setTimeout(callback, frames)
    this.timers.push(timerId)
    return timerId
  }
  
  destroy(): void {
    // Cancel all timers to prevent memory leaks
    for (const timerId of this.timers) {
      timer.clearTimer(timerId)
    }
    this.timers = []
    
    super.destroy()
  }
}
```

### Error Propagation

**Issue**: Errors in timer callbacks don't propagate to caller.

**Solution**: Handle errors within callbacks:

```typescript
// GOOD - Handle errors explicitly
timer.setTimeout(() => {
  try {
    riskyOperation()
  } catch (error) {
    console.error("Timer callback error:", error)
    handleError(error)
  }
}, 60)
```

## Performance Considerations

### Timer Count Management

Monitor active timer counts to prevent performance issues:

```typescript
class TimerMonitor {
  constructor(private timer: Timer) {}
  
  checkTimerHealth(): void {
    const activeCount = this.timer.getActiveTimerCount()
    const totalCount = this.timer.getTotalTimerCount()
    
    if (activeCount > 1000) {
      console.warn(`High timer count: ${activeCount} active timers`)
    }
    
    if (totalCount > activeCount * 2) {
      console.warn("Many inactive timers, consider cleanup")
    }
  }
  
  getTimerStats(): TimerStats {
    const timerInfo = this.timer.getTimerInfo()
    
    return {
      active: timerInfo.filter(t => t.isActive).length,
      inactive: timerInfo.filter(t => !t.isActive).length,
      repeating: timerInfo.filter(t => t.isRepeating).length,
      nearestExecution: Math.min(...timerInfo.map(t => t.framesRemaining))
    }
  }
}

interface TimerStats {
  active: number
  inactive: number
  repeating: number
  nearestExecution: number
}
```

### Callback Performance

Optimize timer callback performance:

```typescript
class OptimizedTimerCallbacks {
  // GOOD - Lightweight callbacks
  scheduleQuickAction(): void {
    timer.setTimeout(() => {
      this.quickAction() // Fast operation
    }, 30)
  }
  
  // AVOID - Heavy operations in callbacks
  scheduleHeavyAction(): void {
    timer.setTimeout(() => {
      // Don't do expensive operations directly in timer callbacks
      this.processLargeDataset() // This could block the game loop
    }, 30)
  }
  
  // BETTER - Queue heavy work
  scheduleHeavyActionBetter(): void {
    timer.setTimeout(() => {
      // Queue work for next frame
      this.workQueue.add(() => this.processLargeDataset())
    }, 30)
  }
}
```

### Frequent Timer Creation

Cache timer IDs when possible:

```typescript
class EfficientTimerUser {
  private spawnerTimer: number = 0
  
  startSpawning(): void {
    if (this.spawnerTimer > 0) {
      return // Already spawning
    }
    
    this.spawnerTimer = timer.setInterval(() => {
      this.spawnEnemy()
    }, 120) // Every 2 seconds
  }
  
  stopSpawning(): void {
    if (this.spawnerTimer > 0) {
      timer.clearTimer(this.spawnerTimer)
      this.spawnerTimer = 0
    }
  }
}
```

## Best Practices

### 1. Use Frame-Based Thinking

```typescript
// GOOD - Think in frames
const oneSecond = 60    // 60 frames at 60fps
const halfSecond = 30   // 30 frames at 60fps
timer.setTimeout(callback, oneSecond)

// GOOD - Use constants for readability
const SPAWN_INTERVAL = 180 // 3 seconds
const POWER_UP_DURATION = 600 // 10 seconds
```

### 2. Clean Up Resources

```typescript
// GOOD - Proper cleanup
class TimerUser {
  private activeTimers: number[] = []
  
  addTimer(callback: () => void, frames: number): number {
    const id = timer.setTimeout(callback, frames)
    this.activeTimers.push(id)
    return id
  }
  
  cleanup(): void {
    this.activeTimers.forEach(id => timer.clearTimer(id))
    this.activeTimers = []
  }
}
```

### 3. Handle Errors Gracefully

```typescript
// GOOD - Robust error handling
class SafeTimerCallbacks {
  scheduleAction(action: () => void, frames: number): void {
    timer.setTimeout(() => {
      try {
        action()
      } catch (error) {
        console.error("Timer action failed:", error)
        this.handleTimerError(error)
      }
    }, frames)
  }
}
```

### 4. Use Descriptive Comments

```typescript
// GOOD - Clear documentation
class GameMechanics {
  startInvulnerabilityPeriod(player: Player): void {
    const INVULNERABILITY_FRAMES = 120 // 2 seconds of invulnerability
    
    player.setInvulnerable(true)
    timer.setTimeout(() => {
      player.setInvulnerable(false)
    }, INVULNERABILITY_FRAMES)
  }
}
```

### 5. Prefer Constants Over Magic Numbers

```typescript
// GOOD - Named constants
const TIMER_DURATIONS = {
  POWER_UP: 300,      // 5 seconds
  INVULNERABILITY: 120, // 2 seconds
  SPAWN_DELAY: 180,   // 3 seconds
  LEVEL_TRANSITION: 240 // 4 seconds
} as const

// Use in code
timer.setTimeout(callback, TIMER_DURATIONS.POWER_UP)
```

The frame-based timer system provides reliable, deterministic timing that integrates perfectly with Clockwork Engine's architecture. By understanding frame-based timing, proper resource management, and performance considerations, you can create games with precise timing behavior that works consistently across all platforms and replay sessions.