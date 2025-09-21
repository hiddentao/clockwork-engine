# 🎲 Deterministic PRNG

Clockwork Engine uses a deterministic pseudo-random number generator (PRNG) based on the Alea algorithm to ensure that random events are perfectly reproducible across game sessions. This is fundamental to the engine's deterministic behavior and enables reliable recording, replay, and testing capabilities.

## Overview

The `PRNG` class wraps the Alea algorithm, providing a seeded random number generator that produces the same sequence of values when initialized with the same seed. This enables games to have randomness while maintaining complete reproducibility for testing, debugging, and replay functionality.

## How It Works

### Alea Algorithm

The Alea algorithm is a high-quality seeded PRNG that:
- Produces uniformly distributed random numbers
- Has a long period (approximately 2^116)
- Generates the same sequence for identical seeds
- Provides good statistical properties for game randomness
- Performs efficiently for real-time applications

### Seed-Based Initialization

The PRNG is initialized with a string seed that determines the entire random sequence:

```typescript
const prng = new PRNG("my-seed")
const value1 = prng.random() // Always the same for this seed
const value2 = prng.random() // Always the same second value
```

### State Preservation

The PRNG maintains internal state that advances with each call, ensuring each random value is different while maintaining deterministic behavior across identical seed sequences.

## Key Concepts

### Deterministic Randomness

Unlike `Math.random()`, the PRNG produces **deterministic randomness**:
- Same seed = Same sequence of random numbers
- Perfect reproducibility across platforms and runs
- No dependency on system clock or hardware

### Seed String

Seeds are string values that completely determine the random sequence:
- Can be any string: "level-1", "player-session-123", etc.
- Identical seeds produce identical sequences
- Different seeds produce completely different sequences

### Internal State

The PRNG maintains state that advances with each call:
- Each call to `random()` changes internal state
- State determines the next random value
- State is deterministic based on seed and call count

### Range Methods

The PRNG provides convenience methods for common random ranges:
- `random()`: 0.0 to 1.0 (exclusive)
- `randomInt(min, max)`: Integer in range (inclusive)
- `randomFloat(min, max)`: Float in range
- `randomBoolean()`: True or false
- `randomChoice(array)`: Pick element from array

## PRNG API

### Initialization

```typescript
// Initialize without seed (will use default)
const prng = new PRNG()

// Initialize with specific seed
const prng = new PRNG("my-game-seed")

// Reset with new seed
prng.reset("new-seed")
```

### Basic Random Generation

```typescript
// Random float between 0.0 and 1.0 (exclusive of 1.0)
const value = prng.random()

// Random integer between min and max (inclusive)
const dice = prng.randomInt(1, 6)

// Random float in range
const speed = prng.randomFloat(50.0, 100.0)

// Random boolean
const coinFlip = prng.randomBoolean()
```

### Array Operations

```typescript
// Pick random element from array
const colors = ['red', 'green', 'blue', 'yellow']
const randomColor = prng.randomChoice(colors)

// Note: randomChoice throws error for empty arrays
try {
  const pick = prng.randomChoice([])
} catch (error) {
  console.log("Cannot choose from empty array")
}
```

## Code Examples

### Game Engine Integration

```typescript
class MyGame extends GameEngine {
  setup(): void {
    // Engine PRNG is automatically initialized with the seed
    const prng = this.getPRNG()
    
    // Use for game initialization
    const playerStartX = prng.randomInt(50, 750)
    const playerStartY = prng.randomInt(50, 550)
    
    const player = new Player(
      "player-1", 
      new Vector2D(playerStartX, playerStartY)
    )
    this.registerGameObject(player)
    
    // Generate random enemies
    this.spawnRandomEnemies(prng)
  }
  
  private spawnRandomEnemies(prng: PRNG): void {
    const enemyCount = prng.randomInt(3, 8)
    
    for (let i = 0; i < enemyCount; i++) {
      const x = prng.randomInt(100, 700)
      const y = prng.randomInt(100, 500)
      const enemyType = prng.randomChoice(['grunt', 'heavy', 'fast'])
      
      const enemy = new Enemy(`enemy-${i}`, new Vector2D(x, y), enemyType)
      this.registerGameObject(enemy)
    }
  }
}
```

### Random Level Generation

```typescript
class LevelGenerator {
  constructor(private prng: PRNG) {}
  
  generateLevel(width: number, height: number): Level {
    const level = new Level(width, height)
    
    // Generate random terrain
    this.generateTerrain(level)
    
    // Place random obstacles
    this.placeObstacles(level)
    
    // Add random power-ups
    this.placePowerUps(level)
    
    return level
  }
  
  private generateTerrain(level: Level): void {
    for (let x = 0; x < level.width; x++) {
      for (let y = 0; y < level.height; y++) {
        // Use noise-like generation with PRNG
        const terrainValue = this.prng.random()
        
        if (terrainValue < 0.1) {
          level.setTile(x, y, TerrainType.WATER)
        } else if (terrainValue < 0.3) {
          level.setTile(x, y, TerrainType.FOREST)
        } else if (terrainValue < 0.8) {
          level.setTile(x, y, TerrainType.GRASS)
        } else {
          level.setTile(x, y, TerrainType.MOUNTAIN)
        }
      }
    }
  }
  
  private placeObstacles(level: Level): void {
    const obstacleCount = this.prng.randomInt(10, 20)
    
    for (let i = 0; i < obstacleCount; i++) {
      const x = this.prng.randomInt(0, level.width - 1)
      const y = this.prng.randomInt(0, level.height - 1)
      
      // Don't place obstacles on water
      if (level.getTile(x, y) !== TerrainType.WATER) {
        level.addObstacle(x, y, this.prng.randomChoice([
          ObstacleType.ROCK,
          ObstacleType.TREE,
          ObstacleType.WALL
        ]))
      }
    }
  }
}
```

### Random AI Behavior

```typescript
class RandomAI {
  constructor(private prng: PRNG) {}
  
  decideAction(enemy: Enemy, gameState: GameState): AIAction {
    // Weighted random decision making
    const decision = this.prng.random()
    
    if (decision < 0.4) {
      return this.moveRandomly(enemy)
    } else if (decision < 0.7) {
      return this.moveTowardPlayer(enemy, gameState)
    } else if (decision < 0.9) {
      return this.attackIfInRange(enemy, gameState)
    } else {
      return this.wait()
    }
  }
  
  private moveRandomly(enemy: Enemy): AIAction {
    const directions = [
      new Vector2D(0, -1), // Up
      new Vector2D(1, 0),  // Right
      new Vector2D(0, 1),  // Down
      new Vector2D(-1, 0)  // Left
    ]
    
    const direction = this.prng.randomChoice(directions)
    const distance = this.prng.randomFloat(10, 50)
    
    return {
      type: 'move',
      direction: direction.multiply(distance)
    }
  }
  
  private moveTowardPlayer(enemy: Enemy, gameState: GameState): AIAction {
    const player = gameState.getPlayer()
    if (!player) return this.wait()
    
    const direction = player.getPosition().subtract(enemy.getPosition()).normalize()
    
    // Add some randomness to movement
    const randomOffset = new Vector2D(
      this.prng.randomFloat(-0.3, 0.3),
      this.prng.randomFloat(-0.3, 0.3)
    )
    
    const finalDirection = direction.add(randomOffset).normalize()
    const speed = this.prng.randomFloat(20, 40)
    
    return {
      type: 'move',
      direction: finalDirection.multiply(speed)
    }
  }
}
```

### Random Event System

```typescript
class RandomEventManager {
  private events: RandomEvent[] = []
  
  constructor(private prng: PRNG) {
    this.setupEvents()
  }
  
  private setupEvents(): void {
    this.events = [
      { name: 'meteor_shower', probability: 0.05, effect: this.meteorShower },
      { name: 'treasure_drop', probability: 0.15, effect: this.treasureDrop },
      { name: 'enemy_wave', probability: 0.08, effect: this.enemyWave },
      { name: 'healing_spring', probability: 0.12, effect: this.healingSpring },
      { name: 'speed_boost', probability: 0.20, effect: this.speedBoost }
    ]
  }
  
  triggerRandomEvent(gameState: GameState): void {
    const eventRoll = this.prng.random()
    let cumulativeProbability = 0
    
    for (const event of this.events) {
      cumulativeProbability += event.probability
      
      if (eventRoll < cumulativeProbability) {
        console.log(`Triggering random event: ${event.name}`)
        event.effect.call(this, gameState)
        break
      }
    }
  }
  
  private meteorShower(gameState: GameState): void {
    const meteorCount = this.prng.randomInt(5, 15)
    
    for (let i = 0; i < meteorCount; i++) {
      const x = this.prng.randomInt(0, gameState.worldWidth)
      const y = this.prng.randomInt(0, gameState.worldHeight)
      const size = this.prng.randomFloat(10, 30)
      
      gameState.addMeteor(new Vector2D(x, y), size)
    }
  }
  
  private treasureDrop(gameState: GameState): void {
    const treasureTypes = ['gold', 'gem', 'artifact', 'weapon']
    const treasureType = this.prng.randomChoice(treasureTypes)
    
    const x = this.prng.randomInt(50, gameState.worldWidth - 50)
    const y = this.prng.randomInt(50, gameState.worldHeight - 50)
    
    gameState.addTreasure(new Vector2D(x, y), treasureType)
  }
}

interface RandomEvent {
  name: string
  probability: number
  effect: (gameState: GameState) => void
}
```

### Deterministic Procedural Generation

```typescript
class ProceduralDungeon {
  constructor(private prng: PRNG) {}
  
  generateDungeon(seed: string, width: number, height: number): Dungeon {
    // Re-initialize with specific seed for this dungeon
    this.prng.reset(`dungeon-${seed}`)
    
    const dungeon = new Dungeon(width, height)
    
    // Generate with deterministic randomness
    this.generateRooms(dungeon)
    this.generateCorridors(dungeon)
    this.placeTreasures(dungeon)
    this.placeMonsters(dungeon)
    
    return dungeon
  }
  
  private generateRooms(dungeon: Dungeon): void {
    const roomCount = this.prng.randomInt(8, 15)
    
    for (let i = 0; i < roomCount; i++) {
      const attempts = 50 // Prevent infinite loops
      
      for (let attempt = 0; attempt < attempts; attempt++) {
        const width = this.prng.randomInt(4, 10)
        const height = this.prng.randomInt(4, 8)
        const x = this.prng.randomInt(1, dungeon.width - width - 1)
        const y = this.prng.randomInt(1, dungeon.height - height - 1)
        
        const room = new Room(x, y, width, height)
        
        if (!dungeon.overlapsExistingRoom(room)) {
          dungeon.addRoom(room)
          break
        }
      }
    }
  }
  
  private placeTreasures(dungeon: Dungeon): void {
    const rooms = dungeon.getRooms()
    
    for (const room of rooms) {
      // 30% chance each room has treasure
      if (this.prng.random() < 0.3) {
        const x = this.prng.randomInt(room.x + 1, room.x + room.width - 2)
        const y = this.prng.randomInt(room.y + 1, room.y + room.height - 2)
        
        const treasureValue = this.prng.randomInt(50, 500)
        dungeon.placeTreasure(x, y, treasureValue)
      }
    }
  }
}
```

## Edge Cases and Gotchas

### Seed Consistency

**Issue**: Different seed formats may produce unexpected results.

**Solution**: Use consistent seed formatting:

```typescript
// GOOD - Consistent seed format
const gameSeed = `game-${levelNumber}-${difficulty}-${playerId}`
prng.reset(gameSeed)

// AVOID - Inconsistent seeds
prng.reset(Math.random().toString()) // Non-deterministic!
prng.reset(`${Date.now()}`) // Time-dependent!
```

### State Synchronization

**Issue**: PRNG state can get out of sync between systems.

**Solution**: Use separate PRNG instances or careful state management:

```typescript
// GOOD - Separate PRNGs for different systems
class Game {
  private levelPRNG = new PRNG(`level-${this.seed}`)
  private aiPRNG = new PRNG(`ai-${this.seed}`)
  private effectsPRNG = new PRNG(`effects-${this.seed}`)
  
  generateLevel(): void {
    // Level generation uses its own PRNG
    this.levelGenerator.generate(this.levelPRNG)
  }
  
  updateAI(): void {
    // AI uses separate PRNG, won't affect level generation
    this.aiSystem.update(this.aiPRNG)
  }
}
```

### Empty Array Handling

**Issue**: `randomChoice()` throws error for empty arrays.

**Solution**: Always check array length:

```typescript
// GOOD - Safe random choice
function safeRandomChoice<T>(prng: PRNG, array: T[], fallback: T): T {
  if (array.length === 0) {
    return fallback
  }
  return prng.randomChoice(array)
}

// Usage
const availableActions = getAvailableActions()
const action = safeRandomChoice(prng, availableActions, 'wait')
```

### Floating Point Precision

**Issue**: Floating-point operations may cause slight variations across platforms.

**Solution**: Use integer operations when exact precision is required:

```typescript
// GOOD - Integer-based probability
function rollPercentage(prng: PRNG, successPercent: number): boolean {
  const roll = prng.randomInt(1, 100)
  return roll <= successPercent
}

// AVOID - Floating-point comparison (may vary slightly)
function rollFloatPercentage(prng: PRNG, successPercent: number): boolean {
  return prng.random() < (successPercent / 100.0)
}
```

### Initialization Timing

**Issue**: Using PRNG before initialization can cause inconsistent behavior.

**Solution**: Always initialize before use:

```typescript
// GOOD - Explicit initialization
class RandomSystem {
  private prng = new PRNG()
  
  initialize(seed: string): void {
    this.prng.reset(seed)
  }
  
  generateValue(): number {
    if (!this.isInitialized()) {
      throw new Error("RandomSystem must be initialized before use")
    }
    return this.prng.random()
  }
}
```

## Performance Considerations

### PRNG Performance

The Alea algorithm is fast but not free:

```typescript
// Monitor PRNG usage in performance-critical sections
class PerformanceAwarePRNG extends PRNG {
  private callCount = 0
  private totalTime = 0
  
  random(): number {
    const start = performance.now()
    const result = super.random()
    this.totalTime += performance.now() - start
    this.callCount++
    
    if (this.callCount % 10000 === 0) {
      console.log(`PRNG avg time: ${this.totalTime / this.callCount}ms per call`)
    }
    
    return result
  }
}
```

### Caching Random Values

For expensive operations, consider caching:

```typescript
class CachedRandomGenerator {
  private randomCache: number[] = []
  private cacheIndex = 0
  
  constructor(private prng: PRNG, private cacheSize = 1000) {
    this.fillCache()
  }
  
  private fillCache(): void {
    this.randomCache = []
    for (let i = 0; i < this.cacheSize; i++) {
      this.randomCache.push(this.prng.random())
    }
    this.cacheIndex = 0
  }
  
  random(): number {
    if (this.cacheIndex >= this.randomCache.length) {
      this.fillCache()
    }
    return this.randomCache[this.cacheIndex++]
  }
}
```

### Bulk Operations

Generate multiple values efficiently:

```typescript
class BulkRandomGenerator {
  constructor(private prng: PRNG) {}
  
  randomIntArray(count: number, min: number, max: number): number[] {
    const results = new Array(count)
    for (let i = 0; i < count; i++) {
      results[i] = this.prng.randomInt(min, max)
    }
    return results
  }
  
  randomPositions(count: number, bounds: { width: number, height: number }): Vector2D[] {
    const positions = new Array(count)
    for (let i = 0; i < count; i++) {
      positions[i] = new Vector2D(
        this.prng.randomInt(0, bounds.width),
        this.prng.randomInt(0, bounds.height)
      )
    }
    return positions
  }
}
```

## Best Practices

### 1. Use Descriptive Seeds

```typescript
// GOOD - Descriptive seeds
const levelSeed = `level-${worldId}-${levelId}-${difficulty}`
const playerSeed = `player-${playerId}-${sessionId}`

// AVOID - Generic or unclear seeds
const seed1 = "random123"
const seed2 = "abc"
```

### 2. Separate PRNGs by Purpose

```typescript
// GOOD - Purpose-specific PRNGs
class GameSystems {
  private worldPRNG = new PRNG(`world-${this.seed}`)
  private combatPRNG = new PRNG(`combat-${this.seed}`)
  private lootPRNG = new PRNG(`loot-${this.seed}`)
  
  // Each system has independent randomness
}
```

### 3. Document Random Behavior

```typescript
// GOOD - Documented random behavior
class Enemy {
  /**
   * Determines attack behavior using weighted probabilities:
   * - 40% basic attack
   * - 30% special attack
   * - 20% defensive move
   * - 10% ultimate ability
   */
  chooseAttack(prng: PRNG): AttackType {
    const roll = prng.random()
    if (roll < 0.4) return AttackType.BASIC
    if (roll < 0.7) return AttackType.SPECIAL  
    if (roll < 0.9) return AttackType.DEFENSIVE
    return AttackType.ULTIMATE
  }
}
```

### 4. Test Random Behavior

```typescript
// GOOD - Test random behavior
describe('Enemy Attack Selection', () => {
  it('should distribute attacks according to probabilities', () => {
    const prng = new PRNG('test-seed')
    const enemy = new Enemy()
    const attackCounts = new Map<AttackType, number>()
    
    // Run many iterations to test distribution
    for (let i = 0; i < 10000; i++) {
      const attack = enemy.chooseAttack(prng)
      attackCounts.set(attack, (attackCounts.get(attack) || 0) + 1)
    }
    
    // Verify approximate distribution
    expect(attackCounts.get(AttackType.BASIC)).toBeCloseTo(4000, -2)
    expect(attackCounts.get(AttackType.SPECIAL)).toBeCloseTo(3000, -2)
  })
})
```

### 5. Handle Edge Cases

```typescript
// GOOD - Robust random operations
class SafeRandomUtils {
  static safeRandomChoice<T>(prng: PRNG, array: T[], defaultValue?: T): T | undefined {
    if (array.length === 0) {
      return defaultValue
    }
    return prng.randomChoice(array)
  }
  
  static clampedRandomInt(prng: PRNG, min: number, max: number): number {
    if (min > max) {
      [min, max] = [max, min] // Swap if reversed
    }
    return prng.randomInt(min, max)
  }
}
```

The deterministic PRNG system ensures that your games have engaging randomness while maintaining the reproducible behavior essential for testing, debugging, and replay functionality. By understanding seeding, state management, and best practices, you can create games with rich random elements that behave consistently across all playthroughs.