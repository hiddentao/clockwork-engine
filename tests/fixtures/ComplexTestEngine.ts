import { GameEngine } from "../../src/GameEngine"
import { Serializer } from "../../src/Serializer"
import { Vector2D } from "../../src/geometry/Vector2D"
import { TestEnemy } from "./TestEnemy"
import { TestPlayer } from "./TestPlayer"
import { type PowerUpType, TestPowerUp } from "./TestPowerUp"
import { TestProjectile } from "./TestProjectile"

export class ComplexTestEngine extends GameEngine {
  private projectileIdCounter = 0
  private powerUpIdCounter = 0
  private enemyIdCounter = 0
  private playerIdCounter = 0
  private serializer: Serializer

  constructor() {
    super()
    this.serializer = new Serializer()
    this.registerSerializationTypes()
  }

  setup(): void {
    // Engine setup is called automatically on reset
    // We don't create any objects by default to allow tests full control
  }

  private registerSerializationTypes(): void {
    this.serializer.registerType("TestPlayer", TestPlayer)
    this.serializer.registerType("TestEnemy", TestEnemy)
    this.serializer.registerType("TestProjectile", TestProjectile)
    this.serializer.registerType("TestPowerUp", TestPowerUp)
    this.serializer.registerType("Vector2D", Vector2D)
  }

  getSerializer(): Serializer {
    return this.serializer
  }

  // Capture current engine state for comparison
  captureState(): any {
    const state: any = {
      totalFrames: this.getTotalFrames(),
      gameState: this.getState(),
      prngState: this.getPRNG().getState
        ? this.getPRNG().getState()
        : "unavailable",
      objects: {},
    }

    // Capture all game object groups and their states
    const groupTypes = [
      "Player",
      "Enemy",
      "TestProjectile",
      "TestPowerUp",
      "PowerUp",
    ]

    for (const groupType of groupTypes) {
      const group = this.getGameObjectGroup(groupType)
      if (group) {
        const objects = group.getAll()
        state.objects[groupType] = objects.map((obj) => ({
          id: obj.getId(),
          type: obj.getType(),
          position: obj.getPosition(),
          velocity: obj.getVelocity(),
          rotation: obj.getRotation(),
          health: obj.getHealth(),
          maxHealth: obj.getMaxHealth(),
          isDestroyed: obj.isDestroyed(),
        }))
      }
    }

    return state
  }

  // Player creation and management
  createTestPlayer(id: string, position: Vector2D): TestPlayer {
    return new TestPlayer(id, { x: position.x, y: position.y }, this)
  }

  createAutoPlayer(position?: Vector2D): TestPlayer {
    const pos = position || new Vector2D(0, 0)
    return this.createTestPlayer(`player-${this.playerIdCounter++}`, pos)
  }

  getPlayer(id: string): TestPlayer | undefined {
    return this.getGameObjectGroup("Player")?.getById(id) as
      | TestPlayer
      | undefined
  }

  getAllPlayers(): TestPlayer[] {
    const group = this.getGameObjectGroup("Player")
    return group ? (group.getAll() as TestPlayer[]) : []
  }

  getActivePlayers(): TestPlayer[] {
    return this.getAllPlayers().filter((player) => !player.isDestroyed())
  }

  // Enemy creation and management
  createTestEnemy(id: string, position: Vector2D): TestEnemy {
    return new TestEnemy(id, { x: position.x, y: position.y }, this)
  }

  createAutoEnemy(position?: Vector2D): TestEnemy {
    const pos = position || new Vector2D(100, 100)
    return this.createTestEnemy(`enemy-${this.enemyIdCounter++}`, pos)
  }

  getEnemy(id: string): TestEnemy | undefined {
    return this.getGameObjectGroup("Enemy")?.getById(id) as
      | TestEnemy
      | undefined
  }

  getAllEnemies(): TestEnemy[] {
    const group = this.getGameObjectGroup("Enemy")
    return group ? (group.getAll() as TestEnemy[]) : []
  }

  getActiveEnemies(): TestEnemy[] {
    return this.getAllEnemies().filter((enemy) => !enemy.isDestroyed())
  }

  // Projectile creation and management
  createTestProjectile(
    id: string,
    position: Vector2D,
    velocity: Vector2D,
    damage = 10,
    lifespan = 100,
    ownerId = "",
  ): TestProjectile {
    return new TestProjectile(
      id,
      position,
      velocity,
      damage,
      lifespan,
      ownerId,
      this,
    )
  }

  createAutoProjectile(
    position: Vector2D,
    velocity: Vector2D,
    damage = 10,
    ownerId = "",
  ): TestProjectile {
    return this.createTestProjectile(
      `projectile-${this.projectileIdCounter++}`,
      position,
      velocity,
      damage,
      100,
      ownerId,
    )
  }

  fireProjectile(
    source: TestPlayer | TestEnemy,
    target: Vector2D,
  ): TestProjectile {
    const direction = target.subtract(source.getPosition()).normalize()
    const velocity = direction.scale(10)
    const startPos = source
      .getPosition()
      .add(direction.scale(source.getSize().x))

    return this.createAutoProjectile(startPos, velocity, 25, source.getId())
  }

  getProjectile(id: string): TestProjectile | undefined {
    return this.getGameObjectGroup("Projectile")?.getById(id) as
      | TestProjectile
      | undefined
  }

  getAllProjectiles(): TestProjectile[] {
    const group = this.getGameObjectGroup("Projectile")
    return group ? (group.getAll() as TestProjectile[]) : []
  }

  getActiveProjectiles(): TestProjectile[] {
    return this.getAllProjectiles().filter((proj) => !proj.isDestroyed())
  }

  // Power-up creation and management
  createTestPowerUp(
    id: string,
    position: Vector2D,
    powerType: PowerUpType = "health",
    value = 50,
    duration = 0,
    respawnTime = 0,
  ): TestPowerUp {
    return new TestPowerUp(
      id,
      position,
      powerType,
      value,
      duration,
      respawnTime,
      this,
    )
  }

  createAutoPowerUp(
    position: Vector2D,
    powerType: PowerUpType = "health",
  ): TestPowerUp {
    return this.createTestPowerUp(
      `powerup-${this.powerUpIdCounter++}`,
      position,
      powerType,
    )
  }

  spawnPowerUpAtRandom(powerType: PowerUpType = "health"): TestPowerUp {
    const x = this.getPRNG().random() * 500
    const y = this.getPRNG().random() * 500
    return this.createAutoPowerUp(new Vector2D(x, y), powerType)
  }

  getPowerUp(id: string): TestPowerUp | undefined {
    return this.getGameObjectGroup("PowerUp")?.getById(id) as
      | TestPowerUp
      | undefined
  }

  getAllPowerUps(): TestPowerUp[] {
    const group = this.getGameObjectGroup("PowerUp")
    return group ? (group.getAll() as TestPowerUp[]) : []
  }

  getActivePowerUps(): TestPowerUp[] {
    return this.getAllPowerUps().filter(
      (powerUp) => !powerUp.isDestroyed() && powerUp.isAvailable(),
    )
  }

  // Complex scenario helpers
  setupBattleScene(playerCount = 3, enemyCount = 5): void {
    // Clear existing objects
    this.clearAllObjects()

    // Create players in a line
    for (let i = 0; i < playerCount; i++) {
      const player = this.createAutoPlayer(new Vector2D(50 + i * 30, 100))
      player.setLevel(1 + i) // Different levels for variety
    }

    // Create enemies in formation
    for (let i = 0; i < enemyCount; i++) {
      const row = Math.floor(i / 3)
      const col = i % 3
      const enemy = this.createAutoEnemy(
        new Vector2D(300 + col * 40, 150 + row * 40),
      )
      enemy.setAggression(3 + (i % 5)) // Varying aggression levels
    }

    // Add some power-ups
    this.createAutoPowerUp(new Vector2D(200, 50), "health")
    this.createAutoPowerUp(new Vector2D(200, 200), "speed")
    this.createAutoPowerUp(new Vector2D(100, 300), "damage")
  }

  setupChaosScene(objectCount = 50): void {
    this.clearAllObjects()

    const halfCount = Math.floor(objectCount / 2)

    // Create many players
    for (let i = 0; i < halfCount; i++) {
      const x = this.getPRNG().random() * 400
      const y = this.getPRNG().random() * 400
      const player = this.createAutoPlayer(new Vector2D(x, y))

      // Random velocities
      const vx = (this.getPRNG().random() - 0.5) * 4
      const vy = (this.getPRNG().random() - 0.5) * 4
      player.setVelocity(new Vector2D(vx, vy))
    }

    // Create many enemies
    for (let i = 0; i < halfCount; i++) {
      const x = this.getPRNG().random() * 400
      const y = this.getPRNG().random() * 400
      const enemy = this.createAutoEnemy(new Vector2D(x, y))

      // Random properties
      enemy.setAggression(this.getPRNG().randomInt(1, 10))
      const vx = (this.getPRNG().random() - 0.5) * 3
      const vy = (this.getPRNG().random() - 0.5) * 3
      enemy.setVelocity(new Vector2D(vx, vy))
    }

    // Scatter power-ups
    for (let i = 0; i < 10; i++) {
      const x = this.getPRNG().random() * 400
      const y = this.getPRNG().random() * 400
      const types: PowerUpType[] = ["health", "speed", "damage", "experience"]
      const type = types[this.getPRNG().randomInt(0, types.length - 1)]
      this.createAutoPowerUp(new Vector2D(x, y), type)
    }
  }

  setupSurvivalScene(): void {
    this.clearAllObjects()

    // Single player
    const player = this.createAutoPlayer(new Vector2D(200, 200))
    player.setLevel(1)

    // Schedule enemy waves
    this.scheduleEnemyWaves()

    // Schedule power-up spawns
    this.schedulePowerUpSpawns()
  }

  private scheduleEnemyWaves(): void {
    let waveNumber = 1

    const spawnWave = () => {
      const enemyCount = 3 + waveNumber

      for (let i = 0; i < enemyCount; i++) {
        // Spawn enemies at edges
        let x, y
        const edge = this.getPRNG().randomInt(0, 3)

        switch (edge) {
          case 0: // Top
            x = this.getPRNG().random() * 400
            y = -20
            break
          case 1: // Right
            x = 420
            y = this.getPRNG().random() * 400
            break
          case 2: // Bottom
            x = this.getPRNG().random() * 400
            y = 420
            break
          default: // Left
            x = -20
            y = this.getPRNG().random() * 400
        }

        const enemy = this.createAutoEnemy(new Vector2D(x, y))
        enemy.setAggression(Math.min(10, 2 + waveNumber))

        // Move towards center
        const direction = new Vector2D(200, 200)
          .subtract(new Vector2D(x, y))
          .normalize()
        enemy.setVelocity(direction.scale(1 + waveNumber * 0.2))
      }

      waveNumber++

      // Schedule next wave
      const nextWaveDelay = Math.max(300, 900 - waveNumber * 60) // Waves get faster
      this.setTimeout(spawnWave, nextWaveDelay)
    }

    // Start first wave after 3 seconds
    this.setTimeout(spawnWave, 180)
  }

  private schedulePowerUpSpawns(): void {
    const spawnPowerUp = () => {
      const types: PowerUpType[] = ["health", "speed", "damage"]
      const type = types[this.getPRNG().randomInt(0, types.length - 1)]

      const x = 50 + this.getPRNG().random() * 300
      const y = 50 + this.getPRNG().random() * 300

      this.createAutoPowerUp(new Vector2D(x, y), type)

      // Schedule next spawn
      const nextSpawn = 300 + this.getPRNG().random() * 600 // 5-15 seconds
      this.setTimeout(spawnPowerUp, nextSpawn)
    }

    // Start spawning after 5 seconds
    this.setTimeout(spawnPowerUp, 300)
  }

  // Utility methods
  clearAllObjects(): void {
    for (const type of this.getRegisteredTypes()) {
      const group = this.getGameObjectGroup(type)
      if (group) {
        group.getAll().forEach((obj) => obj.destroy())
      }
    }
    this.clearDestroyed()
  }

  getTotalObjectCount(): number {
    let count = 0
    for (const type of this.getRegisteredTypes()) {
      const group = this.getGameObjectGroup(type)
      if (group) {
        count += group.activeSize()
      }
    }
    return count
  }

  getObjectCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const type of this.getRegisteredTypes()) {
      const group = this.getGameObjectGroup(type)
      counts[type] = group ? group.activeSize() : 0
    }
    return counts
  }

  // Reset counters when engine resets
  reset(seed?: string): void {
    super.reset(seed)
    this.projectileIdCounter = 0
    this.powerUpIdCounter = 0
    this.enemyIdCounter = 0
    this.playerIdCounter = 0
  }

  // Test-specific methods for collision detection and interactions
  checkCollisions(): Array<{ obj1: any; obj2: any; type: string }> {
    const collisions: Array<{ obj1: any; obj2: any; type: string }> = []

    // Check player-enemy collisions
    for (const player of this.getActivePlayers()) {
      for (const enemy of this.getActiveEnemies()) {
        if (this.objectsCollide(player, enemy)) {
          collisions.push({ obj1: player, obj2: enemy, type: "player-enemy" })
        }
      }
    }

    // Check projectile-enemy collisions
    for (const projectile of this.getActiveProjectiles()) {
      for (const enemy of this.getActiveEnemies()) {
        if (this.objectsCollide(projectile, enemy)) {
          collisions.push({
            obj1: projectile,
            obj2: enemy,
            type: "projectile-enemy",
          })
        }
      }
    }

    // Check player-powerup collisions
    for (const player of this.getActivePlayers()) {
      for (const powerUp of this.getActivePowerUps()) {
        if (this.objectsCollide(player, powerUp)) {
          collisions.push({
            obj1: player,
            obj2: powerUp,
            type: "player-powerup",
          })
        }
      }
    }

    return collisions
  }

  private objectsCollide(obj1: any, obj2: any): boolean {
    const pos1 = obj1.getPosition()
    const pos2 = obj2.getPosition()
    const size1 = obj1.getSize()
    const size2 = obj2.getSize()

    const distance = pos1.distance(pos2)
    const minDistance = (size1.x + size2.x) / 2

    return distance < minDistance
  }

  processCollisions(): void {
    const collisions = this.checkCollisions()

    for (const collision of collisions) {
      switch (collision.type) {
        case "player-enemy":
          collision.obj1.takeDamage(10)
          collision.obj2.takeDamage(5)
          break

        case "projectile-enemy":
          collision.obj2.takeDamage(collision.obj1.getDamage())
          collision.obj1.destroy()
          break

        case "player-powerup":
          collision.obj2.apply(collision.obj1)
          break
      }
    }
  }
}
