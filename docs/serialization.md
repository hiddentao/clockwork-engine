# 🔄 Serialization

Clockwork Engine's universal serialization system enables deterministic conversion of any game data to JSON-safe format and back. This system is fundamental to the recording/replay functionality, save/load systems, and network synchronization, ensuring that all game state can be perfectly preserved and reconstructed.

## Overview

The serialization system provides automatic handling of primitives, arrays, objects, and custom classes through a type registration mechanism. It wraps all serialized data with type information to enable perfect reconstruction while maintaining security against code injection attacks.

## How It Works

### Type Wrapping Architecture

All serialized data is wrapped with type metadata:

```typescript
interface SerializedWrapper {
  __type: string  // Type identifier
  __data: any     // Actual serialized data
}
```

### Automatic Type Detection

The serializer automatically handles different data types:
1. **Primitives**: Pass through unchanged (string, number, boolean, null, undefined)
2. **Arrays**: Recursively serialize each element 
3. **Custom Objects**: Use `serialize()` method if available
4. **Plain Objects**: Recursively serialize each property
5. **Registered Types**: Use type registry for reconstruction

### Security Validation

The deserializer includes security checks to prevent code injection:
- Validates type names for dangerous patterns
- Only deserializes registered custom types
- Prevents access to dangerous object properties

## Key Concepts

### Serializable Interface

Custom classes implement the `Serializable` interface:

```typescript
interface Serializable {
  serialize(): any  // Instance method to serialize current state
}

interface SerializableClass {
  new (...args: any[]): Serializable
  deserialize(data: any): Serializable  // Static method to reconstruct
}
```

### Type Registration

Custom classes must be registered before serialization:

```typescript
serializer.registerType("Vector2D", Vector2D)
serializer.registerType("Player", Player)
```

### Recursive Processing

The system recursively processes nested objects, arrays, and custom types to any depth level, maintaining all type relationships.

### Security First

Built-in protections against common serialization attacks:
- Type name validation
- Constructor access prevention
- Prototype pollution protection

## Serializer API

### Type Registration

```typescript
const serializer = new Serializer()

// Register custom types
serializer.registerType("Vector2D", Vector2D)
serializer.registerType("Player", Player)
serializer.registerType("Enemy", Enemy)

// Get registered types
const types = serializer.getRegisteredTypes()
console.log(`Registered types: ${types.join(", ")}`)

// Clear all registrations
serializer.clearRegistry()
```

### Serialization

```typescript
// Serialize any value
const data = { 
  position: new Vector2D(100, 200),
  players: [player1, player2],
  score: 1500,
  active: true
}

const serialized = serializer.serialize(data)
// Can be safely converted to JSON
const json = JSON.stringify(serialized)
```

### Deserialization

```typescript
// Deserialize from JSON
const parsed = JSON.parse(json)
const reconstructed = serializer.deserialize(parsed)

// All objects are properly reconstructed with correct types
console.log(reconstructed.position instanceof Vector2D) // true
console.log(reconstructed.players[0] instanceof Player) // true
```

## Code Examples

### Basic Custom Class Serialization

```typescript
class Vector2D implements Serializable {
  constructor(public x: number = 0, public y: number = 0) {}
  
  // Instance method to serialize current state
  serialize(): any {
    return {
      x: this.x,
      y: this.y
    }
  }
  
  // Static method to reconstruct from serialized data
  static deserialize(data: any): Vector2D {
    return new Vector2D(data.x, data.y)
  }
  
  // Regular class methods work normally
  add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y)
  }
}

// Register the type
serializer.registerType("Vector2D", Vector2D)

// Use normally
const vec = new Vector2D(10, 20)
const serialized = serializer.serialize(vec)
const restored = serializer.deserialize(serialized)

console.log(restored instanceof Vector2D) // true
console.log(restored.x, restored.y) // 10, 20
console.log(restored.add(new Vector2D(5, 5))) // Vector2D(15, 25)
```

### Complex Object Serialization

```typescript
class Player implements Serializable {
  private inventory: Item[] = []
  private stats: PlayerStats
  
  constructor(
    private id: string,
    private position: Vector2D,
    private health: number
  ) {
    this.stats = new PlayerStats()
  }
  
  serialize(): any {
    return {
      id: this.id,
      position: this.position, // Will be auto-serialized
      health: this.health,
      inventory: this.inventory, // Array will be auto-serialized
      stats: this.stats // Custom object will be auto-serialized
    }
  }
  
  static deserialize(data: any): Player {
    const player = new Player(data.id, data.position, data.health)
    player.inventory = data.inventory
    player.stats = data.stats
    return player
  }
  
  getId(): string { return this.id }
  getPosition(): Vector2D { return this.position }
  getHealth(): number { return this.health }
}

class PlayerStats implements Serializable {
  constructor(
    public strength: number = 10,
    public agility: number = 10,
    public intelligence: number = 10
  ) {}
  
  serialize(): any {
    return {
      strength: this.strength,
      agility: this.agility,
      intelligence: this.intelligence
    }
  }
  
  static deserialize(data: any): PlayerStats {
    return new PlayerStats(data.strength, data.agility, data.intelligence)
  }
}
```

### Game State Serialization

```typescript
class GameState implements Serializable {
  constructor(
    public currentLevel: number = 1,
    public score: number = 0,
    public timeElapsed: number = 0,
    public players: Player[] = [],
    public enemies: Enemy[] = [],
    public powerUps: PowerUp[] = []
  ) {}
  
  serialize(): any {
    return {
      currentLevel: this.currentLevel,
      score: this.score,
      timeElapsed: this.timeElapsed,
      players: this.players,    // Array auto-serialization
      enemies: this.enemies,    // Array auto-serialization
      powerUps: this.powerUps   // Array auto-serialization
    }
  }
  
  static deserialize(data: any): GameState {
    const state = new GameState()
    state.currentLevel = data.currentLevel
    state.score = data.score
    state.timeElapsed = data.timeElapsed
    state.players = data.players
    state.enemies = data.enemies
    state.powerUps = data.powerUps
    return state
  }
  
  addPlayer(player: Player): void {
    this.players.push(player)
  }
  
  removeDestroyedEnemies(): void {
    this.enemies = this.enemies.filter(enemy => !enemy.isDestroyed())
  }
}
```

### Save System Implementation

```typescript
class SaveManager {
  constructor(private serializer: Serializer) {
    // Register all game types
    this.registerGameTypes()
  }
  
  private registerGameTypes(): void {
    this.serializer.registerType("Vector2D", Vector2D)
    this.serializer.registerType("Player", Player)
    this.serializer.registerType("Enemy", Enemy)
    this.serializer.registerType("PowerUp", PowerUp)
    this.serializer.registerType("GameState", GameState)
    this.serializer.registerType("PlayerStats", PlayerStats)
  }
  
  saveGame(gameState: GameState, slotName: string): void {
    try {
      const serialized = this.serializer.serialize(gameState)
      const json = JSON.stringify(serialized, null, 2)
      
      // Save to localStorage, file, or database
      localStorage.setItem(`save_${slotName}`, json)
      
      console.log(`Game saved to slot: ${slotName}`)
    } catch (error) {
      console.error("Failed to save game:", error)
      throw new Error(`Save failed: ${error.message}`)
    }
  }
  
  loadGame(slotName: string): GameState {
    try {
      const json = localStorage.getItem(`save_${slotName}`)
      if (!json) {
        throw new Error(`No save found in slot: ${slotName}`)
      }
      
      const parsed = JSON.parse(json)
      const gameState = this.serializer.deserialize(parsed)
      
      if (!(gameState instanceof GameState)) {
        throw new Error("Invalid save data: not a GameState")
      }
      
      console.log(`Game loaded from slot: ${slotName}`)
      return gameState
    } catch (error) {
      console.error("Failed to load game:", error)
      throw new Error(`Load failed: ${error.message}`)
    }
  }
  
  getSaveSlots(): string[] {
    const slots = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('save_')) {
        slots.push(key.substring(5)) // Remove 'save_' prefix
      }
    }
    return slots
  }
  
  deleteSave(slotName: string): void {
    localStorage.removeItem(`save_${slotName}`)
    console.log(`Save deleted: ${slotName}`)
  }
}
```

### Recording Integration

```typescript
class SerializedEventRecorder {
  constructor(private serializer: Serializer) {}
  
  recordObjectUpdate(
    objectType: string, 
    objectId: string, 
    method: string, 
    params: any[]
  ): ObjectUpdateEvent {
    return {
      type: GameEventType.OBJECT_UPDATE,
      frame: this.getCurrentFrame(),
      timestamp: Date.now(),
      objectType,
      objectId,
      method,
      // Serialize all parameters automatically
      params: params.map(param => this.serializer.serialize(param))
    }
  }
  
  processObjectUpdate(event: ObjectUpdateEvent, engine: GameEngine): void {
    const group = engine.getGameObjectGroup(event.objectType)
    const object = group?.getById(event.objectId)
    
    if (object && object[event.method]) {
      // Deserialize parameters before method call
      const deserializedParams = event.params.map(param => 
        this.serializer.deserialize(param)
      )
      
      object[event.method](...deserializedParams)
    }
  }
}
```

### Network Synchronization

```typescript
class NetworkSerializer {
  constructor(private serializer: Serializer) {}
  
  serializeForNetwork(data: any): string {
    const serialized = this.serializer.serialize(data)
    return JSON.stringify(serialized)
  }
  
  deserializeFromNetwork(json: string): any {
    const parsed = JSON.parse(json)
    return this.serializer.deserialize(parsed)
  }
  
  sendGameState(gameState: GameState, connection: WebSocket): void {
    const message = {
      type: 'gameState',
      data: this.serializer.serialize(gameState),
      timestamp: Date.now()
    }
    
    connection.send(JSON.stringify(message))
  }
  
  handleGameStateMessage(message: any): GameState {
    if (message.type === 'gameState') {
      const gameState = this.serializer.deserialize(message.data)
      if (gameState instanceof GameState) {
        return gameState
      }
    }
    throw new Error("Invalid game state message")
  }
}
```

### Debugging and Analysis Tools

```typescript
class SerializationDebugger {
  constructor(private serializer: Serializer) {}
  
  analyzeObject(obj: any): SerializationAnalysis {
    const serialized = this.serializer.serialize(obj)
    const json = JSON.stringify(serialized)
    
    return {
      originalSize: this.estimateObjectSize(obj),
      serializedSize: json.length,
      compressionRatio: json.length / this.estimateObjectSize(obj),
      typeCount: this.countTypes(serialized),
      depth: this.calculateDepth(serialized)
    }
  }
  
  private estimateObjectSize(obj: any): number {
    return JSON.stringify(obj).length // Rough estimate
  }
  
  private countTypes(obj: any): Map<string, number> {
    const counts = new Map<string, number>()
    
    const countRecursive = (value: any) => {
      if (value && typeof value === 'object' && '__type' in value) {
        const type = value.__type
        counts.set(type, (counts.get(type) || 0) + 1)
        countRecursive(value.__data)
      } else if (Array.isArray(value)) {
        value.forEach(countRecursive)
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach(countRecursive)
      }
    }
    
    countRecursive(obj)
    return counts
  }
  
  private calculateDepth(obj: any): number {
    const calculateRecursive = (value: any, currentDepth: number): number => {
      if (value && typeof value === 'object') {
        const childDepths = Object.values(value).map(child => 
          calculateRecursive(child, currentDepth + 1)
        )
        return Math.max(currentDepth, ...childDepths)
      }
      return currentDepth
    }
    
    return calculateRecursive(obj, 0)
  }
}

interface SerializationAnalysis {
  originalSize: number
  serializedSize: number
  compressionRatio: number
  typeCount: Map<string, number>
  depth: number
}
```

## Edge Cases and Gotchas

### Circular References

**Issue**: Circular object references cause infinite recursion.

**Solution**: Implement reference tracking or avoid circular structures:

```typescript
class SafeSerializer extends Serializer {
  serialize(value: any, visited = new WeakSet()): any {
    if (value && typeof value === 'object') {
      if (visited.has(value)) {
        return { __type: 'CircularReference', __id: this.getObjectId(value) }
      }
      visited.add(value)
    }
    
    // Continue with normal serialization
    return super.serialize(value)
  }
}
```

### Type Registration Order

**Issue**: Deserialization fails if types aren't registered in the correct order.

**Solution**: Register all types before any deserialization:

```typescript
class TypeManager {
  private registrationOrder: Array<{name: string, constructor: any}> = []
  
  registerType(name: string, constructor: any): void {
    this.registrationOrder.push({name, constructor})
  }
  
  registerAllTypes(serializer: Serializer): void {
    // Register in deterministic order
    for (const {name, constructor} of this.registrationOrder) {
      serializer.registerType(name, constructor)
    }
  }
}
```

### Version Compatibility

**Issue**: Serialized data from older versions may not deserialize correctly.

**Solution**: Include version information and migration logic:

```typescript
class VersionedSerializer extends Serializer {
  private version = "1.2.0"
  
  serialize(value: any): any {
    const serialized = super.serialize(value)
    return {
      __version: this.version,
      __data: serialized
    }
  }
  
  deserialize(value: any): any {
    if (value.__version && value.__version !== this.version) {
      value = this.migrateData(value.__data, value.__version, this.version)
    }
    
    return super.deserialize(value.__data || value)
  }
  
  private migrateData(data: any, fromVersion: string, toVersion: string): any {
    // Implement version migration logic
    return data
  }
}
```

### Large Object Performance

**Issue**: Serializing very large objects can be slow.

**Solution**: Implement chunked or streaming serialization:

```typescript
class ChunkedSerializer extends Serializer {
  serializeChunked(value: any, chunkSize = 1000): any[] {
    const serialized = this.serialize(value)
    const json = JSON.stringify(serialized)
    
    const chunks = []
    for (let i = 0; i < json.length; i += chunkSize) {
      chunks.push(json.substring(i, i + chunkSize))
    }
    
    return chunks
  }
  
  deserializeChunked(chunks: string[]): any {
    const json = chunks.join('')
    const parsed = JSON.parse(json)
    return this.deserialize(parsed)
  }
}
```

### Security Validation

**Issue**: Malicious serialized data could execute arbitrary code.

**Solution**: The serializer includes built-in security checks:

```typescript
// These are automatically blocked by the deserializer
const maliciousData = {
  __type: "constructor",           // Blocked
  __data: "malicious code"
}

const dangerous = {
  __type: "eval",                  // Blocked
  __data: "alert('pwned')"
}

const prototypePollution = {
  __type: "__proto__",             // Blocked
  __data: { "isAdmin": true }
}
```

### Memory Leaks with Large Registries

**Issue**: Type registry can accumulate unused types over time.

**Solution**: Periodically clean up unused registrations:

```typescript
class ManagedSerializer extends Serializer {
  private usageTracking = new Map<string, number>()
  
  serialize(value: any): any {
    const serialized = super.serialize(value)
    this.trackTypeUsage(serialized)
    return serialized
  }
  
  private trackTypeUsage(obj: any): void {
    if (obj && typeof obj === 'object' && '__type' in obj) {
      const type = obj.__type
      this.usageTracking.set(type, (this.usageTracking.get(type) || 0) + 1)
    }
  }
  
  cleanupUnusedTypes(): void {
    const registeredTypes = this.getRegisteredTypes()
    for (const type of registeredTypes) {
      if ((this.usageTracking.get(type) || 0) === 0) {
        console.log(`Removing unused type: ${type}`)
        // Remove from registry (implementation dependent)
      }
    }
  }
}
```

## Performance Considerations

### Serialization Speed

For frequently serialized objects, consider caching:

```typescript
class CachingSerializer extends Serializer {
  private serializationCache = new Map<any, any>()
  private cacheHits = 0
  private cacheMisses = 0
  
  serialize(value: any): any {
    if (this.serializationCache.has(value)) {
      this.cacheHits++
      return this.serializationCache.get(value)
    }
    
    const serialized = super.serialize(value)
    this.serializationCache.set(value, serialized)
    this.cacheMisses++
    
    return serialized
  }
  
  getCacheStats(): { hits: number, misses: number, ratio: number } {
    const total = this.cacheHits + this.cacheMisses
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      ratio: total > 0 ? this.cacheHits / total : 0
    }
  }
}
```

### Memory Usage

Monitor memory usage for large serialization operations:

```typescript
class MemoryAwareSerializer extends Serializer {
  serialize(value: any): any {
    const startMemory = this.getMemoryUsage()
    const result = super.serialize(value)
    const endMemory = this.getMemoryUsage()
    
    const memoryDelta = endMemory - startMemory
    if (memoryDelta > 10 * 1024 * 1024) { // 10MB
      console.warn(`Large memory usage during serialization: ${memoryDelta / 1024 / 1024}MB`)
    }
    
    return result
  }
  
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    return 0 // Browser environment
  }
}
```

## Best Practices

### 1. Register Types Early

```typescript
// GOOD - Register all types during initialization
class GameInitializer {
  setupSerialization(serializer: Serializer): void {
    // Register all game types first
    serializer.registerType("Vector2D", Vector2D)
    serializer.registerType("Player", Player)
    serializer.registerType("Enemy", Enemy)
    // ... all other types
  }
}
```

### 2. Keep Serialization Simple

```typescript
// GOOD - Simple, focused serialization
class SimpleObject implements Serializable {
  serialize(): any {
    return {
      id: this.id,
      position: this.position,
      health: this.health
    }
  }
  
  static deserialize(data: any): SimpleObject {
    return new SimpleObject(data.id, data.position, data.health)
  }
}

// AVOID - Complex serialization with side effects
class ComplexObject implements Serializable {
  serialize(): any {
    // Don't do expensive operations during serialization
    this.updateDatabase()
    this.sendNetworkRequest()
    
    return {
      computed: this.expensiveCalculation(), // Don't compute during serialization
      // ...
    }
  }
}
```

### 3. Handle Errors Gracefully

```typescript
// GOOD - Robust error handling
class RobustSerializer extends Serializer {
  serialize(value: any): any {
    try {
      return super.serialize(value)
    } catch (error) {
      console.error("Serialization failed:", error)
      return { __type: "SerializationError", __message: error.message }
    }
  }
  
  deserialize(value: any): any {
    try {
      return super.deserialize(value)
    } catch (error) {
      console.error("Deserialization failed:", error)
      return null // or some default value
    }
  }
}
```

### 4. Validate Serialized Data

```typescript
// GOOD - Validate before using deserialized data
class ValidatingDeserializer {
  deserializePlayer(data: any): Player | null {
    const deserialized = serializer.deserialize(data)
    
    if (!(deserialized instanceof Player)) {
      console.error("Deserialized data is not a Player instance")
      return null
    }
    
    // Additional validation
    if (!deserialized.getId() || deserialized.getHealth() < 0) {
      console.error("Player has invalid data")
      return null
    }
    
    return deserialized
  }
}
```

### 5. Version Your Data

```typescript
// GOOD - Include version information
class VersionedClass implements Serializable {
  private static VERSION = 2
  
  serialize(): any {
    return {
      __version: VersionedClass.VERSION,
      id: this.id,
      data: this.data
    }
  }
  
  static deserialize(data: any): VersionedClass {
    const version = data.__version || 1
    
    if (version !== this.VERSION) {
      data = this.migrateFromVersion(data, version)
    }
    
    return new VersionedClass(data.id, data.data)
  }
  
  private static migrateFromVersion(data: any, fromVersion: number): any {
    // Handle version migrations
    return data
  }
}
```

The serialization system is essential for maintaining game state consistency across all of Clockwork Engine's features. By understanding type registration, security considerations, and performance implications, you can build games with robust data persistence and perfect replay capabilities.