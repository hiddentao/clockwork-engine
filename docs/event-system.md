# ⚡ Event System

Clockwork Engine features a comprehensive event-driven architecture built on a type-safe EventEmitter foundation. The event system coordinates communication between game components, handles user input processing, manages object updates, and enables the recording/replay functionality through a centralized event management system.

## Overview

The event system consists of three main components:
- **EventEmitter**: Generic, type-safe event emitter for component communication
- **GameEventManager**: Central hub for processing game events during each frame
- **Event Sources**: Pluggable sources that provide events (live input, recorded input, etc.)

This architecture enables loose coupling between systems while maintaining deterministic behavior essential for recording and replay functionality.

## How It Works

### Event Flow Architecture

```
Input/Events → EventSource → GameEventManager → Game Objects
                              ↓
                           GameRecorder (optional)
```

### Frame-Based Processing

Events are processed once per frame in a deterministic order:

1. **Event Collection**: EventManager queries EventSource for current frame's events
2. **Event Processing**: Each event is processed immediately 
3. **Recording**: Events are optionally recorded for later replay
4. **State Updates**: Game objects are updated based on processed events

### Event Source Abstraction

The system uses pluggable event sources through the `GameEventSource` interface:
- **UserInputEventSource**: Captures live user input
- **RecordedEventSource**: Plays back recorded events
- Custom sources can be implemented for AI, networking, etc.

## Key Concepts

### Type-Safe Event Emitters

EventEmitter provides compile-time type safety for events:

```typescript
interface MyEvents {
  playerMoved: (player: Player, position: Vector2D) => void
  scoreChanged: (newScore: number, oldScore: number) => void
}

class MyComponent extends EventEmitter<MyEvents> {
  movePlayer(player: Player, position: Vector2D) {
    // Type-safe event emission
    this.emit('playerMoved', player, position)
  }
}
```

### Game Event Types

The system defines standard game event types:

```typescript
enum GameEventType {
  USER_INPUT = "USER_INPUT",      // Player input events
  OBJECT_UPDATE = "OBJECT_UPDATE" // Direct object modifications
}
```

### Event Source Interface

All event sources implement this interface:

```typescript
interface GameEventSource {
  getNextEvents(totalFrames: number): AnyGameEvent[]
  hasMoreEvents(): boolean
  reset(): void
}
```

### Frame-Accurate Timing

Events include frame numbers for deterministic timing:

```typescript
interface GameEvent {
  type: GameEventType
  frame: number      // Frame when event occurred
  timestamp: number  // Wall-clock time (for debugging)
}
```

## EventEmitter API

### Basic Event Operations

```typescript
const emitter = new EventEmitter<MyEvents>()

// Add event listener
emitter.on('playerMoved', (player, position) => {
  console.log(`${player.getId()} moved to ${position.x}, ${position.y}`)
})

// Remove specific listener
emitter.off('playerMoved', myHandler)

// Emit event with type safety
emitter.emit('playerMoved', player, newPosition)

// Clear all listeners
emitter.clearListeners()
```

### Type-Safe Event Definitions

```typescript
interface WeaponEvents {
  fired: (weapon: Weapon, direction: Vector2D, damage: number) => void
  reloaded: (weapon: Weapon, ammoCount: number) => void
  overheated: (weapon: Weapon, cooldownTime: number) => void
}

class Weapon extends EventEmitter<WeaponEvents> {
  fire(direction: Vector2D): void {
    if (this.canFire()) {
      const damage = this.calculateDamage()
      this.createProjectile(direction, damage)
      
      // Type-safe event with automatic parameter validation
      this.emit('fired', this, direction, damage)
    }
  }
}
```

## GameEventManager API

### Initialization and Configuration

```typescript
const inputSource = new UserInputEventSource()
const eventManager = new GameEventManager(inputSource, engine)

// Optional: Set up user input handler
eventManager.onUserInput = (event: UserInputEvent) => {
  this.handlePlayerInput(event)
}

// Optional: Enable recording
const recorder = new GameRecorder()
eventManager.setRecorder(recorder)
```

### Event Source Management

```typescript
// Switch from live input to recorded input
const recordedSource = new RecordedEventSource(recordingData.events)
eventManager.setSource(recordedSource)

// Query current source
const sourceInfo = eventManager.getSourceInfo()
console.log(`Current source: ${sourceInfo.type}, has more: ${sourceInfo.hasMore}`)

// Check for pending events
if (eventManager.hasMoreEvents()) {
  console.log("Events are waiting to be processed")
}
```

### Frame Processing

```typescript
// Called by GameEngine during each frame
eventManager.update(deltaFrames, totalFrames)

// Reset for new game session
eventManager.reset()
```

## Event Sources

### UserInputEventSource

Captures and queues live user input:

```typescript
const inputSource = new UserInputEventSource()

// Queue input events (typically from input handlers)
inputSource.queueInput('keydown', { key: 'w', code: 'KeyW' })
inputSource.queueInput('mouse_move', { x: 100, y: 200, deltaX: 5, deltaY: -3 })

// Check queue status
console.log(`Queued inputs: ${inputSource.getQueueLength()}`)

// Clear specific inputs
inputSource.removeData(data => data.key === 'escape')

// Events are automatically converted and cleared during processing
```

### RecordedEventSource

Plays back recorded events:

```typescript
const recordedSource = new RecordedEventSource(recordingData.events)

// Events are automatically returned based on current frame
const events = recordedSource.getNextEvents(currentFrame)

// Check for remaining events
if (recordedSource.hasMoreEvents()) {
  console.log("More recorded events available")
}
```

### Custom Event Sources

```typescript
class AIEventSource implements GameEventSource {
  private aiDecisions: AnyGameEvent[] = []
  private currentIndex = 0
  
  // Generate AI decisions based on game state
  generateAIEvents(gameState: GameState): void {
    const decision = this.makeAIDecision(gameState)
    this.aiDecisions.push({
      type: GameEventType.USER_INPUT,
      frame: gameState.currentFrame + this.getReactionDelay(),
      timestamp: Date.now(),
      inputType: 'ai_decision',
      params: decision
    })
  }
  
  getNextEvents(totalFrames: number): AnyGameEvent[] {
    const events = []
    while (this.currentIndex < this.aiDecisions.length) {
      const event = this.aiDecisions[this.currentIndex]
      if (event.frame <= totalFrames) {
        events.push(event)
        this.currentIndex++
      } else {
        break
      }
    }
    return events
  }
  
  hasMoreEvents(): boolean {
    return this.currentIndex < this.aiDecisions.length
  }
  
  reset(): void {
    this.currentIndex = 0
    this.aiDecisions = []
  }
}
```

## Code Examples

### Complete Component with Events

```typescript
interface PlayerEvents {
  healthChanged: (player: Player, newHealth: number, maxHealth: number) => void
  levelUp: (player: Player, newLevel: number) => void
  died: (player: Player, cause: string) => void
  itemPickedUp: (player: Player, item: Item) => void
}

class Player extends GameObject<PlayerEvents> {
  private level = 1
  private experience = 0
  
  takeDamage(amount: number, source?: string): void {
    const oldHealth = this.getHealth()
    super.takeDamage(amount)
    
    // Emit health changed event
    this.emit('healthChanged', this, this.getHealth(), this.getMaxHealth())
    
    // Emit death event if health reaches zero
    if (this.getHealth() === 0 && oldHealth > 0) {
      this.emit('died', this, source || 'unknown')
    }
  }
  
  gainExperience(amount: number): void {
    this.experience += amount
    
    const expNeeded = this.getExperienceNeeded(this.level)
    if (this.experience >= expNeeded) {
      this.level++
      this.experience -= expNeeded
      this.emit('levelUp', this, this.level)
    }
  }
  
  pickUpItem(item: Item): void {
    this.inventory.add(item)
    this.emit('itemPickedUp', this, item)
  }
}
```

### Input Handling System

```typescript
class InputHandler {
  constructor(private inputSource: UserInputEventSource) {
    this.setupEventListeners()
  }
  
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      this.inputSource.queueInput('keydown', {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey
      })
    })
    
    document.addEventListener('keyup', (e) => {
      this.inputSource.queueInput('keyup', {
        key: e.key,
        code: e.code
      })
    })
    
    // Mouse events
    document.addEventListener('mousemove', (e) => {
      this.inputSource.queueInput('mousemove', {
        x: e.clientX,
        y: e.clientY,
        deltaX: e.movementX,
        deltaY: e.movementY
      })
    })
    
    document.addEventListener('click', (e) => {
      this.inputSource.queueInput('click', {
        x: e.clientX,
        y: e.clientY,
        button: e.button
      })
    })
  }
}
```

### Game Input Processing

```typescript
class GameController {
  constructor(private engine: GameEngine) {
    this.setupInputHandling()
  }
  
  private setupInputHandling(): void {
    const eventManager = this.engine.getEventManager()
    
    eventManager.onUserInput = (event: UserInputEvent) => {
      this.processInput(event)
    }
  }
  
  private processInput(event: UserInputEvent): void {
    const player = this.getPlayer()
    if (!player) return
    
    switch (event.inputType) {
      case 'keydown':
        this.handleKeyDown(player, event.params)
        break
        
      case 'keyup':
        this.handleKeyUp(player, event.params)
        break
        
      case 'click':
        this.handleMouseClick(player, event.params)
        break
        
      case 'mousemove':
        this.handleMouseMove(player, event.params)
        break
    }
  }
  
  private handleKeyDown(player: Player, params: any): void {
    switch (params.code) {
      case 'KeyW':
        player.startMoving('up')
        break
      case 'KeyS':
        player.startMoving('down')
        break
      case 'KeyA':
        player.startMoving('left')
        break
      case 'KeyD':
        player.startMoving('right')
        break
      case 'Space':
        player.jump()
        break
    }
  }
}
```

### Event-Based UI System

```typescript
class GameUI {
  private healthBar: HealthBar
  private experienceBar: ExperienceBar
  private messageLog: MessageLog
  
  constructor(private player: Player) {
    this.setupPlayerEventListeners()
  }
  
  private setupPlayerEventListeners(): void {
    // Listen to player events
    this.player.on('healthChanged', (player, health, maxHealth) => {
      this.healthBar.update(health / maxHealth)
      
      if (health < maxHealth * 0.2) {
        this.showLowHealthWarning()
      }
    })
    
    this.player.on('levelUp', (player, newLevel) => {
      this.showLevelUpEffect(newLevel)
      this.messageLog.add(`Level up! You are now level ${newLevel}`)
    })
    
    this.player.on('died', (player, cause) => {
      this.showDeathScreen(cause)
      this.messageLog.add(`You died from ${cause}`)
    })
    
    this.player.on('itemPickedUp', (player, item) => {
      this.showItemPickupEffect(item)
      this.messageLog.add(`Picked up ${item.getName()}`)
    })
  }
  
  private showLevelUpEffect(level: number): void {
    // Create visual effect for level up
    this.createFloatingText(`LEVEL ${level}!`, 'gold')
    this.playSound('levelup')
  }
}
```

### Multi-Object Event Coordination

```typescript
class CombatSystem {
  constructor(private engine: GameEngine) {
    this.setupCombatEvents()
  }
  
  private setupCombatEvents(): void {
    // Listen to weapon firing events
    const weaponGroup = this.engine.getGameObjectGroup<Weapon>('Weapon')
    if (weaponGroup) {
      for (const weapon of weaponGroup.getAll()) {
        weapon.on('fired', (weapon, direction, damage) => {
          this.createProjectile(weapon, direction, damage)
          this.playFireSound(weapon.getType())
          this.showMuzzleFlash(weapon.getPosition())
        })
        
        weapon.on('reloaded', (weapon, ammoCount) => {
          this.playReloadSound(weapon.getType())
          this.showReloadEffect(weapon.getPosition())
        })
      }
    }
    
    // Listen to player damage events
    const playerGroup = this.engine.getGameObjectGroup<Player>('Player')
    if (playerGroup) {
      for (const player of playerGroup.getAll()) {
        player.on('healthChanged', (player, health, maxHealth) => {
          if (health < maxHealth) {
            this.createDamageEffect(player.getPosition())
            this.screenShake(0.5, 200) // intensity, duration
          }
        })
      }
    }
  }
}
```

## Edge Cases and Gotchas

### Event Handler Memory Leaks

**Issue**: Event listeners can create memory leaks if not properly cleaned up.

**Solution**: Always remove listeners when objects are destroyed:

```typescript
class TemporaryObject extends GameObject {
  private cleanup: (() => void)[] = []
  
  constructor() {
    super()
    
    // Store cleanup functions for later
    const handler = (event) => this.handleEvent(event)
    someEmitter.on('event', handler)
    this.cleanup.push(() => someEmitter.off('event', handler))
  }
  
  destroy(): void {
    // Clean up all event listeners
    this.cleanup.forEach(fn => fn())
    this.cleanup = []
    
    super.destroy()
  }
}
```

### Event Ordering Dependencies

**Issue**: Events processed in wrong order can cause inconsistent state.

**Solution**: Use frame-based timing to ensure proper ordering:

```typescript
// BAD - Events might process out of order
emitter.emit('playerMoved', player, position)
emitter.emit('checkCollisions', player)

// GOOD - Use frame-based sequencing
eventManager.queueEvent('playerMoved', currentFrame, player, position)
eventManager.queueEvent('checkCollisions', currentFrame + 1, player)
```

### Event Parameter Serialization

**Issue**: Complex objects in events may not serialize properly for recording.

**Solution**: Use serializer for all event parameters:

```typescript
// BAD - Complex object won't record properly
this.recordEvent({
  type: GameEventType.OBJECT_UPDATE,
  params: [complexObject] // Won't serialize correctly
})

// GOOD - Serialize complex parameters
this.recordEvent({
  type: GameEventType.OBJECT_UPDATE,
  params: [serializer.serialize(complexObject)]
})
```

### Async Event Handling

**Issue**: Async event handlers can break deterministic behavior.

**Solution**: Avoid async handlers or use frame-based delays:

```typescript
// BAD - Async handler breaks determinism
emitter.on('event', async (data) => {
  const result = await someAsyncOperation(data)
  this.handleResult(result)
})

// GOOD - Use timer for frame-based delays
emitter.on('event', (data) => {
  timer.setTimeout(() => {
    const result = this.synchronousOperation(data)
    this.handleResult(result)
  }, 30) // 30 frames delay
})
```

### Circular Event Dependencies

**Issue**: Events can create circular dependencies causing infinite loops.

**Solution**: Use event tracking to detect and prevent cycles:

```typescript
class SafeEventEmitter extends EventEmitter {
  private eventStack = new Set<string>()
  
  emit(event: string, ...args: any[]): void {
    const eventKey = `${event}-${JSON.stringify(args)}`
    
    if (this.eventStack.has(eventKey)) {
      console.warn(`Circular event detected: ${eventKey}`)
      return
    }
    
    this.eventStack.add(eventKey)
    try {
      super.emit(event, ...args)
    } finally {
      this.eventStack.delete(eventKey)
    }
  }
}
```

## Performance Considerations

### Event Handler Count

Too many event handlers can impact performance:

```typescript
// Monitor handler count
class PerformanceAwareEmitter extends EventEmitter {
  on(event: string, handler: Function): void {
    super.on(event, handler)
    
    const handlerCount = this.getHandlerCount(event)
    if (handlerCount > 100) {
      console.warn(`High handler count for ${event}: ${handlerCount}`)
    }
  }
}
```

### Event Frequency

High-frequency events can cause performance issues:

```typescript
// Throttle high-frequency events
class ThrottledEmitter extends EventEmitter {
  private lastEmit = new Map<string, number>()
  private throttleMs = 16 // ~60fps
  
  emit(event: string, ...args: any[]): void {
    const now = Date.now()
    const lastTime = this.lastEmit.get(event) || 0
    
    if (now - lastTime >= this.throttleMs) {
      super.emit(event, ...args)
      this.lastEmit.set(event, now)
    }
  }
}
```

### Event Queue Size

Large event queues can consume memory:

```typescript
class BoundedEventSource implements GameEventSource {
  private maxQueueSize = 1000
  
  queueEvent(event: AnyGameEvent): void {
    this.eventQueue.push(event)
    
    if (this.eventQueue.length > this.maxQueueSize) {
      console.warn('Event queue overflow, dropping old events')
      this.eventQueue = this.eventQueue.slice(-this.maxQueueSize)
    }
  }
}
```

## Best Practices

### 1. Use Type-Safe Event Interfaces

```typescript
// GOOD - Type-safe events
interface GameObjectEvents {
  positionChanged: (obj: GameObject, oldPos: Vector2D, newPos: Vector2D) => void
  destroyed: (obj: GameObject, reason: string) => void
}

class GameObject extends EventEmitter<GameObjectEvents> {
  // Type-safe event emission
  setPosition(pos: Vector2D): void {
    const oldPos = this.position
    this.position = pos
    this.emit('positionChanged', this, oldPos, pos) // Type-checked
  }
}
```

### 2. Clean Up Event Listeners

```typescript
// GOOD - Proper cleanup
class Component {
  private eventCleanup: (() => void)[] = []
  
  addListener<T>(emitter: EventEmitter<T>, event: keyof T, handler: T[keyof T]): void {
    emitter.on(event, handler)
    this.eventCleanup.push(() => emitter.off(event, handler))
  }
  
  destroy(): void {
    this.eventCleanup.forEach(cleanup => cleanup())
  }
}
```

### 3. Use Events for Decoupling

```typescript
// GOOD - Decoupled through events
class Player extends GameObject {
  pickUpItem(item: Item): void {
    this.inventory.add(item)
    this.emit('itemPickedUp', this, item) // Let others handle side effects
  }
}

class UI {
  constructor(player: Player) {
    player.on('itemPickedUp', (player, item) => {
      this.showPickupMessage(item.name)
    })
  }
}
```

### 4. Handle Errors Gracefully

```typescript
// GOOD - Error handling in event processing
class RobustEventEmitter extends EventEmitter {
  emit(event: string, ...args: any[]): void {
    const handlers = this.getHandlers(event)
    
    for (const handler of handlers) {
      try {
        handler(...args)
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error)
        // Continue processing other handlers
      }
    }
  }
}
```

### 5. Document Event Contracts

```typescript
/**
 * Events emitted by the Player class
 */
interface PlayerEvents {
  /** Fired when player's health changes
   * @param player - The player instance
   * @param newHealth - Current health value
   * @param maxHealth - Maximum health value
   */
  healthChanged: (player: Player, newHealth: number, maxHealth: number) => void
  
  /** Fired when player levels up
   * @param player - The player instance  
   * @param newLevel - The new level achieved
   */
  levelUp: (player: Player, newLevel: number) => void
}
```

The event system provides the backbone for communication throughout your Clockwork Engine game. By leveraging type-safe events, centralized processing, and pluggable event sources, you can build complex, maintainable games while preserving the deterministic behavior essential for recording and replay functionality.