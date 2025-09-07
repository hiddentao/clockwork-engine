# 🎮 Game Objects

The Game Object system is the foundation for all entities in your Clockwork Engine games. It provides a robust, type-safe architecture for creating, managing, and organizing game entities with automatic lifecycle management, event handling, and deterministic behavior.

## Overview

Game Objects in Clockwork Engine are structured around two main concepts:
- **GameObject**: Abstract base class for all game entities
- **GameObjectGroup**: Collection manager for organizing objects by type

This system automatically handles object registration, type grouping, lifecycle management, and provides a consistent interface for all game entities.

## How It Works

### Automatic Type Registration
When you create a GameObject, it automatically registers with the engine and is grouped by its type:

```typescript
class Player extends GameObject {
  getType(): string {
    return "Player" // Objects are grouped by this string
  }
}

// Automatically creates/joins "Player" group
const player = new Player("player-1", new Vector2D(100, 100), new Vector2D(32, 32))
```

### Lifecycle Management
The engine handles the complete object lifecycle:

1. **Creation**: Object registers with engine and joins appropriate group
2. **Updates**: Object receives frame-based updates via group processing
3. **Events**: Object emits events for state changes
4. **Destruction**: Destroyed objects are filtered from processing but retained for cleanup
5. **Cleanup**: Destroyed objects are periodically removed from groups

## Key Concepts

### Abstract GameObject Base Class
All game entities extend the abstract GameObject class, providing consistent interface and behavior:

```typescript
abstract class GameObject<T extends GameObjectEvents = GameObjectEvents>
  extends EventEmitter<T>
  implements IPositionable, ICollisionSource
```

### Type-Based Grouping
Objects are automatically organized into groups based on their `getType()` return value:

```typescript
// These objects automatically join separate groups
class Player extends GameObject { getType() { return "Player" } }
class Enemy extends GameObject { getType() { return "Enemy" } }
class Bullet extends GameObject { getType() { return "Bullet" } }
```

### Event System Integration
GameObjects inherit from EventEmitter and automatically emit standard events:

```typescript
// Standard events all GameObjects emit
interface GameObjectEvents {
  positionChanged: (gameObject: GameObject, oldPosition: Vector2D, newPosition: Vector2D) => void
  healthChanged: (gameObject: GameObject, health: number, maxHealth: number) => void
  destroyed: (gameObject: GameObject) => void
}
```

## GameObject API

### Constructor

```typescript
constructor(
  id: string,              // Unique identifier
  position: Vector2D,      // Initial position
  size: Vector2D,          // Object dimensions
  health = 0,              // Initial health
  engine?: GameEngineInterface  // Optional auto-registration
)
```

### Abstract Methods (Must Implement)

```typescript
abstract getType(): string  // Return type identifier for grouping
```

### Core Properties and Methods

#### Position and Movement

```typescript
// Position
getPosition(): Vector2D
setPosition(position: Vector2D): void  // Emits positionChanged event

// Size  
getSize(): Vector2D
setSize(size: Vector2D): void

// Velocity (used by default update method)
getVelocity(): Vector2D
setVelocity(velocity: Vector2D): void

// Rotation
getRotation(): number
setRotation(rotation: number): void
```

#### Health System

```typescript
getHealth(): number
getMaxHealth(): number
setHealth(health: number): void     // Emits healthChanged event
takeDamage(amount: number): void    // Emits healthChanged event
heal(amount: number): void          // Emits healthChanged event
```

#### Lifecycle

```typescript
getId(): string                     // Get unique identifier
isDestroyed(): boolean             // Check if destroyed
destroy(): void                    // Mark for destruction, emits destroyed event
update(deltaFrames: number): void  // Called each frame by GameObjectGroup
```

#### Engine Integration

```typescript
getEngine(): GameEngineInterface | undefined
registerWithEngine(engine: GameEngineInterface): void
getCollisionSourceId(): string  // For collision detection integration
```

#### Serialization

```typescript
serialize(): SerializedGameObject           // Serialize current state
static deserialize(data: any): GameObject   // Reconstruct from serialized data
```

## GameObjectGroup API

### Collection Management

```typescript
add(gameObject: T): T                    // Add object to group
remove(gameObject: T): boolean           // Remove specific object
has(gameObject: T): boolean              // Check if object exists
hasId(id: string): boolean               // Check if ID exists
getById(id: string): T | undefined       // Get object by ID
clear(): void                            // Remove all objects
```

### Query and Statistics

```typescript
getAll(): T[]                   // Get all active (non-destroyed) objects
size(): number                  // Total count (including destroyed)
activeSize(): number            // Count of active objects only
clearDestroyed(): number        // Remove destroyed objects, return count removed
```

### Game Loop Integration

```typescript
update(deltaFrames: number, totalFrames: number): void  // Update all objects
```

## Code Examples

### Creating a Simple Game Object

```typescript
class Bullet extends GameObject {
  private damage: number
  private speed: number
  
  constructor(id: string, position: Vector2D, direction: Vector2D, damage: number) {
    super(id, position, new Vector2D(4, 4), 1) // Small size, 1 health
    
    this.damage = damage
    this.speed = 300
    this.setVelocity(direction.normalize().multiply(this.speed))
  }
  
  getType(): string {
    return "Bullet"
  }
  
  getDamage(): number {
    return this.damage
  }
  
  update(deltaFrames: number): void {
    super.update(deltaFrames) // Handles movement
    
    // Destroy if off-screen (example bounds check)
    const pos = this.getPosition()
    if (pos.x < 0 || pos.x > 800 || pos.y < 0 || pos.y > 600) {
      this.destroy()
    }
  }
  
  serialize() {
    return {
      ...super.serialize(),
      damage: this.damage,
      speed: this.speed
    }
  }
  
  static deserialize(data: any): Bullet {
    const bullet = new Bullet(
      data.id,
      new Vector2D(data.position.x, data.position.y),
      new Vector2D(data.velocity.x, data.velocity.y).normalize(),
      data.damage
    )
    bullet.setHealth(data.health)
    return bullet
  }
}
```

### Complex Game Object with Custom Events

```typescript
interface PlayerEvents extends GameObjectEvents {
  levelUp: (player: Player, newLevel: number) => void
  experienceGained: (player: Player, amount: number, total: number) => void
}

class Player extends GameObject<PlayerEvents> {
  private level: number = 1
  private experience: number = 0
  private experienceToNext: number = 100
  
  constructor(id: string, position: Vector2D) {
    super(id, position, new Vector2D(32, 32), 100)
  }
  
  getType(): string {
    return "Player"
  }
  
  gainExperience(amount: number): void {
    this.experience += amount
    this.emit("experienceGained", this, amount, this.experience)
    
    while (this.experience >= this.experienceToNext) {
      this.levelUp()
    }
  }
  
  private levelUp(): void {
    this.experience -= this.experienceToNext
    this.level++
    this.experienceToNext = Math.floor(this.experienceToNext * 1.2)
    
    // Increase max health on level up
    this.maxHealth += 10
    this.setHealth(this.maxHealth)
    
    this.emit("levelUp", this, this.level)
  }
  
  getLevel(): number {
    return this.level
  }
  
  serialize() {
    return {
      ...super.serialize(),
      level: this.level,
      experience: this.experience,
      experienceToNext: this.experienceToNext
    }
  }
}
```

### Working with GameObjectGroups

```typescript
class MyGame extends GameEngine {
  setup(): void {
    // Create objects - they auto-register and group themselves
    const player = new Player("player-1", new Vector2D(100, 100))
    const enemy1 = new Enemy("enemy-1", new Vector2D(200, 200))
    const enemy2 = new Enemy("enemy-2", new Vector2D(300, 150))
  }
  
  update(deltaFrames: number): void {
    super.update(deltaFrames)
    
    // Get typed groups
    const players = this.getGameObjectGroup<Player>("Player")
    const enemies = this.getGameObjectGroup<Enemy>("Enemy")
    const bullets = this.getGameObjectGroup<Bullet>("Bullet")
    
    if (players && enemies && bullets) {
      this.checkCollisions(players, enemies, bullets)
    }
  }
  
  private checkCollisions(
    players: GameObjectGroup<Player>,
    enemies: GameObjectGroup<Enemy>, 
    bullets: GameObjectGroup<Bullet>
  ): void {
    // Type-safe access to grouped objects
    for (const bullet of bullets.getAll()) {
      for (const enemy of enemies.getAll()) {
        if (this.checkCollision(bullet, enemy)) {
          enemy.takeDamage(bullet.getDamage())
          bullet.destroy()
        }
      }
    }
  }
}
```

### Event Handling

```typescript
class GameUI {
  constructor(private engine: GameEngine) {
    this.setupEventListeners()
  }
  
  private setupEventListeners(): void {
    const playerGroup = this.engine.getGameObjectGroup<Player>("Player")
    const player = playerGroup?.getById("player-1")
    
    if (player) {
      // Listen to standard events
      player.on("healthChanged", (player, health, maxHealth) => {
        this.updateHealthBar(health / maxHealth)
      })
      
      player.on("positionChanged", (player, oldPos, newPos) => {
        this.updateMinimap(player.getId(), newPos)
      })
      
      // Listen to custom events
      player.on("levelUp", (player, newLevel) => {
        this.showLevelUpEffect(newLevel)
      })
      
      player.on("experienceGained", (player, amount, total) => {
        this.updateExperienceBar(total)
      })
    }
  }
}
```

### Serialization and Deserialization

```typescript
class GameSaveManager {
  saveGame(engine: GameEngine): string {
    const gameData = {
      players: [],
      enemies: [],
      bullets: []
    }
    
    // Serialize each group
    const playerGroup = engine.getGameObjectGroup<Player>("Player")
    if (playerGroup) {
      gameData.players = playerGroup.getAll().map(p => p.serialize())
    }
    
    const enemyGroup = engine.getGameObjectGroup<Enemy>("Enemy")  
    if (enemyGroup) {
      gameData.enemies = enemyGroup.getAll().map(e => e.serialize())
    }
    
    return JSON.stringify(gameData)
  }
  
  loadGame(engine: GameEngine, saveData: string): void {
    const gameData = JSON.parse(saveData)
    
    // Deserialize and recreate objects
    for (const playerData of gameData.players) {
      const player = Player.deserialize(playerData)
      engine.registerGameObject(player)
    }
    
    for (const enemyData of gameData.enemies) {
      const enemy = Enemy.deserialize(enemyData)  
      engine.registerGameObject(enemy)
    }
  }
}
```

## Edge Cases and Gotchas

### Object Registration Timing

**Issue**: Objects created before engine initialization may not register properly.

**Solution**: Always initialize engine before creating objects, or register manually:

```typescript
// GOOD - Engine ready
engine.reset("seed")
const player = new Player("player-1", position) // Auto-registers

// ALTERNATIVE - Manual registration
const player = new Player("player-1", position)
player.registerWithEngine(engine)
```

### Type String Consistency

**Issue**: Inconsistent type strings prevent proper grouping.

**Solution**: Use constants or enums for type strings:

```typescript
const GAME_OBJECT_TYPES = {
  PLAYER: "Player",
  ENEMY: "Enemy", 
  BULLET: "Bullet"
} as const

class Player extends GameObject {
  getType(): string {
    return GAME_OBJECT_TYPES.PLAYER // Consistent reference
  }
}
```

### Destroyed Object Cleanup

**Issue**: Destroyed objects remain in groups until cleanup, consuming memory.

**Solution**: Periodically clean up destroyed objects:

```typescript
// In your game loop or at level transitions
for (const [type, group] of this.gameObjectGroups.entries()) {
  const removedCount = group.clearDestroyed()
  console.log(`Cleaned up ${removedCount} destroyed ${type} objects`)
}
```

### Circular References in Events

**Issue**: Event handlers can create circular references preventing garbage collection.

**Solution**: Always remove event listeners when objects are destroyed:

```typescript
class Player extends GameObject {
  destroy(): void {
    this.removeAllListeners() // Clear all event listeners
    super.destroy()
  }
}
```

### Serialization of Complex Objects

**Issue**: Complex nested objects may not serialize properly.

**Solution**: Implement custom serialization for complex types:

```typescript
class ComplexGameObject extends GameObject {
  private customData: ComplexType
  
  serialize() {
    return {
      ...super.serialize(),
      customData: this.customData.serialize() // Custom serialization
    }
  }
  
  static deserialize(data: any): ComplexGameObject {
    const obj = new ComplexGameObject(data.id, ...)
    obj.customData = ComplexType.deserialize(data.customData)
    return obj
  }
}
```

## Performance Considerations

### Group Size and Updates
Large groups with many objects can impact performance during updates.

**Optimization**: Consider spatial partitioning for objects that don't need every-frame updates:

```typescript
class BackgroundObject extends GameObject {
  private updateCounter: number = 0
  
  update(deltaFrames: number): void {
    // Update less frequently for background objects
    this.updateCounter += deltaFrames
    if (this.updateCounter >= 5) { // Every 5 frames
      super.update(this.updateCounter)
      this.updateCounter = 0
    }
  }
}
```

### Memory Usage with Large Object Counts
Thousands of objects can consume significant memory.

**Optimization**: Use object pooling for frequently created/destroyed objects:

```typescript
class BulletPool {
  private pool: Bullet[] = []
  private activeCount: number = 0
  
  getBullet(): Bullet {
    if (this.pool.length > this.activeCount) {
      return this.pool[this.activeCount++]
    }
    
    const bullet = new Bullet(`bullet-${this.pool.length}`, new Vector2D(), new Vector2D(), 10)
    this.pool.push(bullet)
    this.activeCount++
    return bullet
  }
  
  returnBullet(bullet: Bullet): void {
    // Move to end of active section
    const index = this.pool.indexOf(bullet)
    if (index !== -1 && index < this.activeCount) {
      this.pool[index] = this.pool[this.activeCount - 1]
      this.pool[this.activeCount - 1] = bullet
      this.activeCount--
    }
  }
}
```

### Event Handler Performance
Many event handlers can slow down object operations.

**Optimization**: Batch events or use more specific event filtering:

```typescript
// Instead of listening to every position change
player.on("positionChanged", handler) // Called frequently

// Use custom events for significant changes only
player.emitSignificantMovement(oldZone, newZone) // Called rarely
```

## Best Practices

### 1. Use Descriptive Type Names

```typescript
// GOOD - Clear, consistent type names
class PlayerCharacter extends GameObject {
  getType() { return "PlayerCharacter" }
}

class EnemyTank extends GameObject {
  getType() { return "EnemyTank" }
}

// BAD - Generic or inconsistent names
class Player extends GameObject {
  getType() { return "player" } // Inconsistent casing
}
```

### 2. Implement Proper Serialization

```typescript
// GOOD - Complete serialization
class Enemy extends GameObject {
  serialize() {
    return {
      ...super.serialize(),
      aiState: this.aiState,
      target: this.target?.getId(), // Serialize references as IDs
      lastAction: this.lastAction
    }
  }
  
  static deserialize(data: any, engine: GameEngine): Enemy {
    const enemy = new Enemy(data.id, ...)
    enemy.aiState = data.aiState
    // Resolve target reference
    enemy.target = engine.getGameObjectGroup("Player")?.getById(data.target)
    return enemy
  }
}
```

### 3. Use Type-Safe Event Handling

```typescript
// GOOD - Custom event interfaces
interface WeaponEvents extends GameObjectEvents {
  fired: (weapon: Weapon, direction: Vector2D) => void
  reloaded: (weapon: Weapon, ammo: number) => void
}

class Weapon extends GameObject<WeaponEvents> {
  fire(direction: Vector2D): void {
    if (this.canFire()) {
      this.createBullet(direction)
      this.emit("fired", this, direction)
    }
  }
}
```

### 4. Handle Object Dependencies

```typescript
// GOOD - Graceful handling of missing dependencies
class AI extends GameObject {
  update(deltaFrames: number): void {
    const playerGroup = this.getEngine()?.getGameObjectGroup<Player>("Player")
    const nearestPlayer = this.findNearestPlayer(playerGroup?.getAll() || [])
    
    if (nearestPlayer) {
      this.moveToward(nearestPlayer.getPosition())
    } else {
      this.patrol() // Fallback behavior
    }
  }
}
```

### 5. Clean Up Resources

```typescript
// GOOD - Proper cleanup
class ParticleEffect extends GameObject {
  private particles: Particle[] = []
  
  destroy(): void {
    // Clean up resources before destruction
    for (const particle of this.particles) {
      particle.dispose()
    }
    this.particles = []
    
    super.destroy()
  }
}
```

The Game Object system provides a robust foundation for creating complex, interactive games while maintaining deterministic behavior and clean architecture. By following these patterns and best practices, you can build scalable game systems that are easy to maintain and extend.