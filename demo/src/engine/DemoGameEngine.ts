import {
  type GameConfig,
  GameEngine,
  type GameEngineOptions,
  GameState,
  type Loader,
  MemoryPlatformLayer,
  Vector2D,
} from "@clockwork-engine/core"
import { Apple, Bomb, Snake, Wall } from "../gameObjects"
import { ExplosionEffect } from "../gameObjects/ExplosionEffect"
import { Direction, GAME_CONFIG } from "../utils/constants"
import {
  generateEatSound,
  generateExplosionSound,
  generateThudSound,
} from "../utils/soundGenerator"

export class DemoGameEngine extends GameEngine {
  private applesEaten: number = 0
  private wallsSpawned: number = 0
  private gameWon: boolean = false
  private gameLost: boolean = false
  private appleCounter: number = 0
  private lastAppleSpawnFrame: number = -1
  private loadedConfig: any = null
  private isEnding: boolean = false
  private activeExplosion: ExplosionEffect | null = null

  constructor(loader: Loader)
  constructor(options: GameEngineOptions)
  constructor(loaderOrOptions: Loader | GameEngineOptions) {
    // Support both old and new constructor signatures for gradual migration
    const options: GameEngineOptions =
      "fetchData" in loaderOrOptions
        ? { loader: loaderOrOptions, platform: new MemoryPlatformLayer() }
        : loaderOrOptions
    super(options)
  }

  async setup(gameConfig: GameConfig): Promise<void> {
    // Load game configuration
    await this.loadGameConfiguration()

    // Set up input handling
    this.setupInputHandling()

    // Create initial snake at center
    const centerX = Math.floor(GAME_CONFIG.GRID_SIZE / 2)
    const centerY = Math.floor(GAME_CONFIG.GRID_SIZE / 2)
    const snake = new Snake(
      "player-snake",
      new Vector2D(centerX, centerY),
      this,
    )
    this.setupSnakeEventListeners(snake)

    // Add initial snake segments to collision tree (all segments including head)
    const segments = snake.getSegments()
    for (const segment of segments) {
      this.getCollisionTree().add(segment.position, snake)
    }

    // Spawn bomb from gameConfig
    this.spawnBomb(gameConfig)

    // Spawn initial apple
    this.spawnApple()

    // Set up timers for game mechanics
    this.setupTimers()

    // Generate sound effects
    generateEatSound(this.platform.audio)
    generateExplosionSound(this.platform.audio)
    generateThudSound(this.platform.audio)
  }

  private setupInputHandling(): void {
    // Connect input manager to handle direction inputs
    this.getEventManager().onUserInput = (event) => {
      console.log("Received input event:", event)
      if (event.inputType === "direction" && event.params.direction) {
        this.handleInput(event.params.direction)
      }
    }
  }

  private setupSnakeEventListeners(snake: Snake): void {
    // Update collision tree when segments change
    snake.on("segmentAdded", (snake, position, _index) => {
      // Add ALL segments including head to tree
      this.getCollisionTree().add(position, snake)
    })

    snake.on("segmentRemoved", (snake, position) => {
      this.getCollisionTree().remove(position, snake)
    })
  }

  private setupTimers(): void {
    // Snake movement timer
    this.setInterval(() => {
      this.moveSnake()
    }, GAME_CONFIG.SNAKE_MOVE_INTERVAL)

    // Wall spawning timer
    this.setInterval(() => {
      this.spawnWall()
    }, GAME_CONFIG.WALL_SPAWN_INTERVAL)

    // Apple cleanup timer - check every 30 frames
    this.setInterval(() => {
      this.cleanupExpiredApples()
    }, 30)

    // Destroyed objects cleanup timer - every 60 frames
    this.setInterval(() => {
      this.clearDestroyedGameObjects()
    }, 60)
  }

  private moveSnake() {
    if (this.isEnding) return // Snake frozen during explosion

    const snake = this.getSnake()
    if (!snake) return

    // Move snake
    snake.move()
  }

  update(deltaTicks: number): void {
    super.update(deltaTicks)

    if (this.getState() !== GameState.PLAYING) return

    this.checkCollisions()

    // Check if explosion finished during ending state
    if (this.isEnding && this.activeExplosion) {
      if (this.activeExplosion.isComplete()) {
        this.activeExplosion.destroy() // Clean up the explosion
        this.activeExplosion = null
        this.end() // Now end the game officially
      }
    }
  }

  private checkCollisions() {
    // Don't check collisions during ending sequence
    if (this.isEnding) return

    const snake = this.getSnake()
    if (!snake) return

    const head = snake.getHead()
    const collisions = this.getCollisionTree().containsPoint(head)

    const replaceApples: Apple[] = []

    // Filter out the head's own collision with itself
    const actualCollisions = collisions.filter((source) => {
      // Skip if it's the snake's head position (index 0)
      if (source.getCollisionSourceId() === snake.getId()) {
        const segments = snake.getSegments()
        // Only count as collision if it's not the head position
        return !(
          segments[0].position.x === head.x && segments[0].position.y === head.y
        )
      }
      return true
    })

    for (const source of actualCollisions) {
      const sourceId = source.getCollisionSourceId()

      // Self-collision: head hit snake body (not head)
      if (sourceId === snake.getId()) {
        this.gameLost = true
        this.end()
        return // Game ended, don't spawn anything
      }

      // Wall collision
      if (sourceId.startsWith("wall-")) {
        this.gameLost = true
        this.platform.audio.playSound("thud", 0.8)
        this.end()
        return // Game ended, don't spawn anything
      }

      // Bomb collision
      if (sourceId.startsWith("bomb-")) {
        this.gameLost = true
        this.isEnding = true
        this.platform.audio.playSound("explosion", 1.0)

        // Create explosion at bomb position
        const bomb = this.getBombs().find((b) => b.getId() === sourceId)
        if (bomb) {
          this.activeExplosion = new ExplosionEffect(
            "explosion-0",
            bomb.getPosition().clone(),
            GAME_CONFIG.EXPLOSION_DURATION,
            GAME_CONFIG.EXPLOSION_PARTICLES,
            this,
          )
        }

        // Don't call end() yet - wait for explosion to complete
        return
      }

      // Apple collision
      if (sourceId.startsWith("apple-")) {
        const apple = this.getApples().find((a) => a.getId() === sourceId)
        if (apple) {
          snake.grow()
          replaceApples.push(apple)
          this.applesEaten++
          this.platform.audio.playSound("eat", 0.7)

          // Check win condition
          if (this.applesEaten >= GAME_CONFIG.TARGET_APPLES) {
            this.gameWon = true
            this.end()
            return // Game ended, don't spawn anything
          }
        }
      }
    }

    // Only spawn new apple if game didn't end
    if (replaceApples.length > 0) {
      for (const apple of replaceApples) {
        this.removeAppleAndSpawnNew(apple)
      }
    }
  }

  private spawnApple(): void {
    const currentTick = this.getTotalTicks()

    // Prevent multiple apple spawns in the same frame
    if (this.lastAppleSpawnFrame === currentTick) {
      return
    }

    const position = this.findEmptyPosition()
    if (position) {
      const appleId = `apple-${this.appleCounter++}`
      const apple = new Apple(
        appleId,
        position,
        GAME_CONFIG.APPLE_TIMEOUT,
        this,
      )
      apple.setSpawnFrame(currentTick)
      this.lastAppleSpawnFrame = currentTick

      // Add apple to collision tree
      this.getCollisionTree().add(position, apple)
    }
  }

  private spawnWall(): void {
    if (this.getState() !== GameState.PLAYING || this.isEnding) return

    const position = this.findEmptyPosition()
    if (position) {
      const wallId = `wall-${this.wallsSpawned++}`
      const wall = new Wall(wallId, position, this)

      // Add wall to collision tree
      this.getCollisionTree().add(position, wall)
    }
  }

  private spawnBomb(gameConfig: GameConfig): void {
    // Get bomb position from gameConfig.gameSpecific
    if (!gameConfig.gameSpecific?.bombPosition) {
      console.warn("No bomb position provided in gameConfig.gameSpecific")
      return
    }

    const bombPosition = gameConfig.gameSpecific.bombPosition
    const position = new Vector2D(bombPosition.x, bombPosition.y)

    // Create bomb at specified position
    const bomb = new Bomb("bomb-0", position, this)

    // Add bomb to collision tree
    this.getCollisionTree().add(position, bomb)
  }

  private cleanupExpiredApples(): void {
    const apples = this.getApples()
    const currentTick = this.getTotalTicks()

    apples.forEach((apple) => {
      if (apple.isExpired(currentTick)) {
        this.removeAppleAndSpawnNew(apple)
      }
    })
  }

  private removeAppleAndSpawnNew(apple: Apple): void {
    this.getCollisionTree().removeSource(apple)
    apple.destroy()
    this.spawnApple()
  }

  private findEmptyPosition(): Vector2D | null {
    const prng = this.getPRNG()
    const snake = this.getSnake()
    const projectedPath = snake ? snake.getProjectedPath(8) : []

    const candidates: Vector2D[] = []

    // Try up to 10 times to find empty positions
    for (let attempts = 0; attempts < 10; attempts++) {
      const x = prng.randomInt(0, GAME_CONFIG.GRID_SIZE - 1)
      const y = prng.randomInt(0, GAME_CONFIG.GRID_SIZE - 1)
      const position = new Vector2D(x, y)

      if (this.isPositionEmpty(position)) {
        candidates.push(position)
      }
    }

    if (candidates.length === 0) {
      return null
    }

    // Choose the best position (furthest from snake's projected path)
    let bestPosition = candidates[0]
    let maxMinDistance = 0

    for (const candidate of candidates) {
      // Find minimum distance to any projected path position
      let minDistance = Number.MAX_VALUE
      for (const pathPos of projectedPath) {
        const distance =
          Math.abs(candidate.x - pathPos.x) + Math.abs(candidate.y - pathPos.y) // Manhattan distance
        minDistance = Math.min(minDistance, distance)
      }

      // Choose candidate with largest minimum distance to path
      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance
        bestPosition = candidate
      }
    }

    return bestPosition
  }

  private isPositionEmpty(position: Vector2D): boolean {
    // Just check collision tree (all objects are now in tree)
    return this.getCollisionTree().containsPoint(position).length === 0
  }

  public handleInput(direction: Direction): void {
    console.log(`🐍 handleInput called with direction: ${direction}`)

    const snake = this.getSnake()

    if (snake && this.getState() === GameState.PLAYING) {
      console.log(`✅ Setting snake direction to: ${direction}`)
      snake.setDirection(direction)
    } else {
      console.log(
        `❌ Cannot set direction - Snake: ${!!snake}, State: ${this.getState()}`,
      )
    }
  }

  // Getter methods for game objects
  private getApples(): Apple[] {
    const appleGroup = this.getGameObjectGroup("Apple")
    return (appleGroup?.getAllActive() as Apple[]) || []
  }

  private getWalls(): Wall[] {
    const wallGroup = this.getGameObjectGroup("Wall")
    return (wallGroup?.getAllActive() as Wall[]) || []
  }

  private getBombs(): Bomb[] {
    const bombGroup = this.getGameObjectGroup("Bomb")
    return (bombGroup?.getAllActive() as Bomb[]) || []
  }

  // Public getters for UI
  public getSnake(): Snake | undefined {
    const snakeGroup = this.getGameObjectGroup("Snake")
    return snakeGroup?.getAllActive()[0] as Snake
  }

  public getApplesEaten(): number {
    return this.applesEaten
  }

  public getApplesRemaining(): number {
    return GAME_CONFIG.TARGET_APPLES - this.applesEaten
  }

  public isGameWon(): boolean {
    return this.gameWon
  }

  public isGameLost(): boolean {
    return this.gameLost
  }

  public getSnakeLength(): number {
    const snake = this.getSnake()
    return snake ? snake.getLength() : 0
  }

  public getAllGameObjects() {
    return {
      snake: this.getSnake(),
      apples: this.getApples(),
      bombs: this.getBombs(),
      walls: this.getWalls(),
    }
  }

  // Reset game state
  public resetGameState(): void {
    this.applesEaten = 0
    this.wallsSpawned = 0
    this.gameWon = false
    this.gameLost = false
    this.appleCounter = 0
    this.lastAppleSpawnFrame = -1
    this.isEnding = false
    this.activeExplosion = null
  }

  public async reset(gameConfig: GameConfig): Promise<void> {
    await super.reset(gameConfig)
    this.resetGameState()
  }

  /**
   * Load game configuration from the loader
   */
  private async loadGameConfiguration(): Promise<void> {
    const loader = this.getLoader()

    try {
      const configData = await loader.fetchData("game", { type: "config" })
      this.loadedConfig = JSON.parse(configData)
      console.log("🔧 Loaded game configuration:", this.loadedConfig)
    } catch (error) {
      console.warn("⚠️ Failed to load game configuration:", error)
    }
  }

  /**
   * Load level data from the loader
   * @param levelId - The level identifier to load
   */
  public async loadLevel(levelId: string): Promise<any> {
    const loader = this.getLoader()

    try {
      const levelData = await loader.fetchData(levelId, { type: "level" })
      const level = JSON.parse(levelData)
      console.log(`🎮 Loaded level: ${level.name}`, level)
      return level
    } catch (error) {
      console.error(`❌ Failed to load level ${levelId}:`, error)
      throw error
    }
  }

  /**
   * Load asset metadata from the loader
   * @param assetId - The asset identifier to load
   */
  public async loadAsset(assetId: string): Promise<any> {
    const loader = this.getLoader()

    try {
      const assetData = await loader.fetchData(assetId, { type: "asset" })
      const asset = JSON.parse(assetData)
      console.log(`🎨 Loaded asset: ${assetId}`, asset)
      return asset
    } catch (error) {
      console.error(`❌ Failed to load asset ${assetId}:`, error)
      throw error
    }
  }

  /**
   * Get the loaded configuration
   */
  public getLoadedConfig(): any {
    return this.loadedConfig
  }

  /**
   * Demonstrate loading data for different purposes
   */
  public async demonstrateLoaderUsage(): Promise<void> {
    const loader = this.getLoader()

    try {
      console.log("🔄 Demonstrating loader usage...")

      // Load game configuration
      const configData = await loader.fetchData("game", { type: "config" })
      const config = JSON.parse(configData)
      console.log(
        "✅ Loaded game config:",
        config ? "configuration data" : "none",
      )
    } catch (error) {
      console.error("❌ Loader demonstration failed:", error)
    }
  }
}
