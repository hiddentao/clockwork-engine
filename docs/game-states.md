# 🎮 Game States

Clockwork Engine implements a strict state machine that controls game execution and ensures predictable behavior throughout the game lifecycle. Understanding game states is essential for proper initialization, state transitions, and game flow management.

## Overview

The game engine operates in one of four distinct states at any given time. State transitions are strictly controlled and validated, preventing invalid operations and ensuring consistent behavior across all game systems.

## State Machine

```
    ┌─────────┐
    │ READY   │────────────┐
    └─────────┘            │
         │                 │
      start()              │ reset()
         │                 │
         ▼                 │
    ┌─────────┐            │
    │ PLAYING │◄───────────┘
    └─────────┘
         │ ▲
    pause()│ │resume()
         ▼ │
    ┌─────────┐
    │ PAUSED  │
    └─────────┘
         │
      end()
         ▼
    ┌─────────┐
    │ ENDED   │
    └─────────┘
```

## Game States

### READY

**Purpose**: Initial state after engine creation or reset, prepared for game start.

**Characteristics**:
- Game objects can be created and registered
- No game loop processing occurs
- Event system is initialized but not processing
- Timer system is reset but not running
- Perfect state for setup and initialization

**Valid Operations**:
- `setup()` - Initialize game objects and systems
- `registerGameObject()` - Add objects to the game
- `start()` - Transition to PLAYING state
- `reset()` - Re-initialize with new seed (stays in READY)

**Transitions**:
- `start()` → PLAYING

```typescript
class MyGame extends GameEngine {
  setup(): void {
    // Called when in READY state
    const player = new Player("player-1", new Vector2D(100, 100))
    this.registerGameObject(player) // Valid in READY state
  }
}

const game = new MyGame()
game.reset("my-seed") // Engine is in READY state
console.log(game.getState()) // GameState.READY
game.start() // Transition to PLAYING
```

### PLAYING

**Purpose**: Active gameplay state where all systems process updates.

**Characteristics**:
- Game loop is active and processing updates
- All systems update each frame (events, timers, objects)
- Frame counter advances
- Input is processed and affects game state
- Recording captures all events (if active)

**Valid Operations**:
- `update()` - Process frame updates
- `pause()` - Transition to PAUSED state
- `end()` - Transition to ENDED state
- All gameplay operations (movement, collisions, etc.)

**Transitions**:
- `pause()` → PAUSED
- `end()` → ENDED

```typescript
const game = new MyGame()
game.reset("seed")
game.start()

console.log(game.getState()) // GameState.PLAYING

// Game loop processes while PLAYING
function gameLoop(deltaTime: number): void {
  if (game.getState() === GameState.PLAYING) {
    const deltaFrames = (deltaTime / 1000) * 60
    game.update(deltaFrames) // Updates all systems
  }
}
```

### PAUSED

**Purpose**: Suspended gameplay state where game time is frozen.

**Characteristics**:
- Game loop processing is suspended
- Frame counter does not advance
- Timer system is paused
- Game state is preserved exactly
- No object updates occur

**Valid Operations**:
- `resume()` - Return to PLAYING state
- `end()` - Transition to ENDED state
- State inspection and debugging
- UI updates (pause menu, etc.)

**Transitions**:
- `resume()` → PLAYING
- `end()` → ENDED

```typescript
const game = new MyGame()
game.start()
// Game is running...

game.pause()
console.log(game.getState()) // GameState.PAUSED

// Game loop respects paused state
function gameLoop(deltaTime: number): void {
  if (game.getState() === GameState.PLAYING) {
    game.update(deltaFrames) // Won't execute while paused
  } else if (game.getState() === GameState.PAUSED) {
    // Handle pause menu, etc.
    updatePauseMenu()
  }
}

game.resume() // Back to PLAYING
```

### ENDED

**Purpose**: Final state indicating game completion or termination.

**Characteristics**:
- Game loop processing stops
- All systems are inactive
- Game state is final and immutable
- Suitable for displaying results, scores, etc.

**Valid Operations**:
- `reset()` - Return to READY state with new initialization
- State inspection for final results
- Save game results or statistics

**Transitions**:
- `reset()` → READY

```typescript
const game = new MyGame()
game.start()
// Gameplay...

game.end()
console.log(game.getState()) // GameState.ENDED

// Can reset to start new game
game.reset("new-seed")
console.log(game.getState()) // GameState.READY
```

## State Transition Examples

### Complete Game Lifecycle

```typescript
class GameManager {
  private game: MyGame
  
  constructor() {
    this.game = new MyGame()
  }
  
  newGame(seed: string): void {
    // Start fresh game
    this.game.reset(seed)
    console.log(`New game initialized with seed: ${seed}`)
    
    // Engine is now in READY state
    this.game.start()
    console.log("Game started")
  }
  
  togglePause(): void {
    const state = this.game.getState()
    
    if (state === GameState.PLAYING) {
      this.game.pause()
      console.log("Game paused")
      this.showPauseMenu()
    } else if (state === GameState.PAUSED) {
      this.game.resume()
      console.log("Game resumed")
      this.hidePauseMenu()
    }
  }
  
  endGame(): void {
    const state = this.game.getState()
    
    if (state === GameState.PLAYING || state === GameState.PAUSED) {
      this.game.end()
      console.log("Game ended")
      this.showGameOverScreen()
    }
  }
  
  getCurrentState(): GameState {
    return this.game.getState()
  }
}
```

### State-Aware Update Loop

```typescript
class StateAwareGameLoop {
  private game: GameEngine
  private lastTime = 0
  
  constructor(game: GameEngine) {
    this.game = game
  }
  
  update(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    
    const state = this.game.getState()
    
    switch (state) {
      case GameState.READY:
        // Maybe show loading screen
        this.updateLoadingScreen()
        break
        
      case GameState.PLAYING:
        // Normal gameplay updates
        const deltaFrames = (deltaTime / 1000) * 60
        this.game.update(deltaFrames)
        this.updateGameplayUI()
        break
        
      case GameState.PAUSED:
        // Handle pause menu
        this.updatePauseMenu()
        break
        
      case GameState.ENDED:
        // Show game over screen
        this.updateGameOverScreen()
        break
    }
    
    // Always update renderer
    this.renderer.render()
  }
}
```

### Recording and State Management

```typescript
class RecordableGame extends GameEngine {
  private recorder = new GameRecorder()
  
  startRecordedGame(seed: string, description?: string): void {
    // Reset and setup for recording
    this.reset(seed)
    
    // Start recording before game starts
    this.recorder.startRecording(this.getEventManager(), seed, description)
    
    // Begin gameplay
    this.start()
    console.log("Started recorded game session")
  }
  
  stopRecording(): GameRecording | null {
    const state = this.getState()
    
    if (state === GameState.PLAYING || state === GameState.PAUSED) {
      this.recorder.stopRecording()
      const recording = this.recorder.getCurrentRecording()
      
      // End the game session
      this.end()
      
      console.log("Recording stopped and game ended")
      return recording
    }
    
    return null
  }
  
  playRecording(recording: GameRecording): void {
    if (this.getState() !== GameState.READY) {
      this.reset(recording.seed) // Ensure we're in READY state
    }
    
    const replayManager = new ReplayManager(this)
    replayManager.replay(recording)
    
    console.log("Started replay session")
  }
}
```

## State Validation and Error Handling

### Strict State Enforcement

The engine enforces strict state transitions and throws descriptive errors for invalid operations:

```typescript
try {
  const game = new MyGame()
  // game is in READY state by default
  
  game.pause() // Invalid: Can't pause from READY state
} catch (error) {
  console.error(error.message) 
  // "Cannot pause game: expected PLAYING state, got READY"
}
```

### Safe State Operations

```typescript
class SafeGameController {
  constructor(private game: GameEngine) {}
  
  safeStart(): boolean {
    if (this.game.getState() === GameState.READY) {
      this.game.start()
      return true
    }
    console.warn("Cannot start: game is not in READY state")
    return false
  }
  
  safePause(): boolean {
    if (this.game.getState() === GameState.PLAYING) {
      this.game.pause()
      return true
    }
    console.warn("Cannot pause: game is not in PLAYING state")
    return false
  }
  
  safeResume(): boolean {
    if (this.game.getState() === GameState.PAUSED) {
      this.game.resume()
      return true
    }
    console.warn("Cannot resume: game is not in PAUSED state")
    return false
  }
  
  safeEnd(): boolean {
    const state = this.game.getState()
    if (state === GameState.PLAYING || state === GameState.PAUSED) {
      this.game.end()
      return true
    }
    console.warn(`Cannot end: game is in ${state} state`)
    return false
  }
}
```

## State-Based Game Features

### Save System Integration

```typescript
class StatefulSaveSystem {
  saveGame(game: GameEngine, filename: string): boolean {
    const state = game.getState()
    
    if (state === GameState.PLAYING || state === GameState.PAUSED) {
      const saveData = {
        state: state,
        totalFrames: game.getTotalFrames(),
        gameData: this.serializeGameState(game),
        timestamp: Date.now()
      }
      
      this.writeSaveFile(filename, saveData)
      return true
    }
    
    console.error("Cannot save: game must be PLAYING or PAUSED")
    return false
  }
  
  loadGame(game: GameEngine, filename: string): boolean {
    const saveData = this.readSaveFile(filename)
    if (!saveData) return false
    
    // Reset game to load saved state
    game.reset(saveData.seed)
    
    // Restore game state
    this.deserializeGameState(game, saveData.gameData)
    
    // Restore appropriate state
    if (saveData.state === GameState.PLAYING) {
      game.start()
    } else if (saveData.state === GameState.PAUSED) {
      game.start()
      game.pause()
    }
    
    return true
  }
}
```

### Level Transition System

```typescript
class LevelManager {
  private currentLevel = 1
  
  constructor(private game: GameEngine) {}
  
  startLevel(levelNumber: number): void {
    this.currentLevel = levelNumber
    
    // Generate deterministic seed for this level
    const seed = `level-${levelNumber}-${Date.now()}`
    
    // Reset and setup new level
    this.game.reset(seed)
    this.setupLevel(levelNumber)
    this.game.start()
    
    console.log(`Started level ${levelNumber}`)
  }
  
  completeLevel(): void {
    const state = this.game.getState()
    
    if (state === GameState.PLAYING) {
      this.game.end()
      this.showLevelCompleteScreen()
      
      // Automatically advance to next level after delay
      setTimeout(() => {
        this.startLevel(this.currentLevel + 1)
      }, 3000)
    }
  }
  
  failLevel(): void {
    const state = this.game.getState()
    
    if (state === GameState.PLAYING) {
      this.game.end()
      this.showGameOverScreen()
    }
  }
  
  private setupLevel(levelNumber: number): void {
    // Configure level-specific content
    const difficulty = Math.min(levelNumber * 0.1, 1.0)
    this.spawnEnemies(5 + levelNumber)
    this.placePowerUps(3)
  }
}
```

### Menu Integration

```typescript
class GameMenuSystem {
  constructor(private game: GameEngine) {}
  
  showMainMenu(): void {
    const state = this.game.getState()
    
    if (state !== GameState.READY) {
      // End current game to return to main menu
      if (state === GameState.PLAYING || state === GameState.PAUSED) {
        this.game.end()
      }
      // Reset to clean state
      this.game.reset()
    }
    
    this.displayMainMenu()
  }
  
  handleMenuAction(action: string): void {
    const state = this.game.getState()
    
    switch (action) {
      case 'newGame':
        if (state === GameState.READY) {
          this.game.start()
          this.hideAllMenus()
        }
        break
        
      case 'resume':
        if (state === GameState.PAUSED) {
          this.game.resume()
          this.hidePauseMenu()
        }
        break
        
      case 'restart':
        if (state !== GameState.READY) {
          const seed = this.getCurrentSeed()
          this.game.reset(seed)
          this.game.start()
          this.hideAllMenus()
        }
        break
        
      case 'quit':
        if (state === GameState.PLAYING || state === GameState.PAUSED) {
          this.game.end()
          this.showMainMenu()
        }
        break
    }
  }
}
```

## Best Practices

### 1. Always Check State Before Operations

```typescript
// GOOD - Check state before operations
class StateAwareController {
  movePlayer(direction: Vector2D): void {
    if (this.game.getState() === GameState.PLAYING) {
      this.player.move(direction)
    }
  }
}

// AVOID - Assume game is in correct state
class UnsafeController {
  movePlayer(direction: Vector2D): void {
    this.player.move(direction) // Might fail if not PLAYING
  }
}
```

### 2. Use State Events for UI Updates

```typescript
class UIManager {
  constructor(game: GameEngine) {
    game.on('stateChange', (newState, oldState) => {
      this.handleStateChange(newState, oldState)
    })
  }
  
  private handleStateChange(newState: GameState, oldState: GameState): void {
    console.log(`State changed: ${oldState} → ${newState}`)
    
    switch (newState) {
      case GameState.READY:
        this.showLoadingScreen()
        break
      case GameState.PLAYING:
        this.showGameplayUI()
        break
      case GameState.PAUSED:
        this.showPauseMenu()
        break
      case GameState.ENDED:
        this.showGameOverScreen()
        break
    }
  }
}
```

### 3. Handle State Transitions Gracefully

```typescript
class GracefulTransitions {
  pauseGame(game: GameEngine): void {
    const state = game.getState()
    
    switch (state) {
      case GameState.PLAYING:
        game.pause()
        this.showPauseMenu()
        break
        
      case GameState.PAUSED:
        // Already paused, just show menu
        this.showPauseMenu()
        break
        
      default:
        console.log(`Cannot pause from ${state} state`)
        break
    }
  }
}
```

### 4. Document State Requirements

```typescript
/**
 * Player movement system
 * @requires GameState.PLAYING - Only processes movement during active gameplay
 */
class MovementSystem {
  update(deltaFrames: number): void {
    // Document and enforce state requirements
    if (this.game.getState() !== GameState.PLAYING) {
      return // Skip processing if not playing
    }
    
    this.processMovement(deltaFrames)
  }
}
```

### 5. Provide State Feedback

```typescript
class StateDebugger {
  logStateInfo(game: GameEngine): void {
    const state = game.getState()
    const frame = game.getTotalFrames()
    
    console.log(`Game State: ${state}, Frame: ${frame}`)
    
    // Additional debug info based on state
    switch (state) {
      case GameState.PLAYING:
        console.log(`Objects: ${this.getObjectCount(game)}`)
        console.log(`Active timers: ${game.getTimer().getActiveTimerCount()}`)
        break
        
      case GameState.PAUSED:
        console.log("Game is paused - state preserved")
        break
        
      case GameState.ENDED:
        console.log("Game ended - final results available")
        break
    }
  }
}
```

Understanding and properly managing game states is crucial for building robust games with Clockwork Engine. The state machine ensures predictable behavior, enables proper resource management, and provides clear boundaries for different phases of your game's lifecycle.