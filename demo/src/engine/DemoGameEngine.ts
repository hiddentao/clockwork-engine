import {
  GameEngine,
  GameState,
  Loader,
  Vector2D,
} from "@hiddentao/clockwork-engine"
import { Apple, Snake, Wall } from "../gameObjects"
import { Direction, GAME_CONFIG } from "../utils/constants"

export class DemoGameEngine extends GameEngine {
  private applesEaten: number = 0
  private wallsSpawned: number = 0
  private gameWon: boolean = false
  private gameLost: boolean = false
  private appleCounter: number = 0
  private lastAppleSpawnTick: number = -1
  private loadedConfig: any = null

  constructor(loader?: Loader) {
    super(loader)
  }

  setup(): void {
    // Load configuration if loader is available
    this.loadGameConfiguration()

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

    // Spawn initial apple
    this.spawnApple()

    // Set up timers for game mechanics
    this.setupTimers()
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

    // Apple cleanup timer
    this.setInterval(() => {
      this.cleanupExpiredApples()
    }, GAME_CONFIG.APPLE_CLEANUP_INTERVAL)

    // Destroyed objects cleanup timer
    this.setInterval(() => {
      this.clearDestroyedGameObjects()
    }, GAME_CONFIG.DESTROYED_OBJECTS_CLEANUP_INTERVAL)
  }

  private moveSnake() {
    const snake = this.getSnake()
    if (!snake) return

    // Move snake
    snake.move()
  }

  update(deltaTicks: number): void {
    super.update(deltaTicks)

    if (this.getState() === GameState.PLAYING) {
      this.checkCollisions()
    }
  }

  private checkCollisions() {
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
        this.end()
        return // Game ended, don't spawn anything
      }

      // Apple collision
      if (sourceId.startsWith("apple-")) {
        const apple = this.getApples().find((a) => a.getId() === sourceId)
        if (apple) {
          snake.grow()
          replaceApples.push(apple)
          this.applesEaten++

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

    // Prevent multiple apple spawns in the same tick
    if (this.lastAppleSpawnTick === currentTick) {
      return
    }

    const position = this.findEmptyPosition()
    if (position) {
      const apple = new Apple(
        `apple-${this.appleCounter++}`,
        position,
        GAME_CONFIG.APPLE_TIMEOUT,
        this,
      )
      apple.setSpawnTick(currentTick)
      this.lastAppleSpawnTick = currentTick

      // Add apple to collision tree
      this.getCollisionTree().add(position, apple)
    }
  }

  private spawnWall(): void {
    if (this.getState() !== GameState.PLAYING) return

    const position = this.findEmptyPosition()
    if (position) {
      const wall = new Wall(`wall-${this.wallsSpawned++}`, position, this)

      // Add wall to collision tree
      this.getCollisionTree().add(position, wall)
    }
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
  private getSnake(): Snake | undefined {
    const snakeGroup = this.getGameObjectGroup("Snake")
    return snakeGroup?.getAllActive()[0] as Snake
  }

  private getApples(): Apple[] {
    const appleGroup = this.getGameObjectGroup("Apple")
    return (appleGroup?.getAllActive() as Apple[]) || []
  }

  private getWalls(): Wall[] {
    const wallGroup = this.getGameObjectGroup("Wall")
    return (wallGroup?.getAllActive() as Wall[]) || []
  }

  // Public getters for UI
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
    this.lastAppleSpawnTick = -1
  }

  public reset(seed?: string): void {
    super.reset(seed)
    this.resetGameState()
  }

  /**
   * Load game configuration from the loader
   */
  private loadGameConfiguration(): void {
    const loader = this.getLoader()
    if (!loader) {
      console.log("🔧 No loader available, using default configuration")
      return
    }

    try {
      // Note: Since this is called during setup and we need to maintain determinism,
      // we don't await this in the current implementation. In a real game, you might
      // want to load configuration before calling setup(), or handle async loading differently.
      loader
        .fetchData("game", { type: "config" })
        .then((configData) => {
          this.loadedConfig = JSON.parse(configData)
          console.log("🔧 Loaded game configuration:", this.loadedConfig)
        })
        .catch((error) => {
          console.warn("⚠️ Failed to load game configuration:", error.message)
        })
    } catch (error) {
      console.warn("⚠️ Error loading game configuration:", error)
    }
  }

  /**
   * Load level data from the loader
   * @param levelId - The level identifier to load
   */
  public async loadLevel(levelId: string): Promise<any> {
    const loader = this.getLoader()
    if (!loader) {
      throw new Error("No loader available for loading level data")
    }

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
    if (!loader) {
      throw new Error("No loader available for loading asset data")
    }

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
    if (!loader) {
      console.log("🚫 No loader available for demonstration")
      return
    }

    try {
      console.log("🔄 Demonstrating loader usage...")

      // Load different types of data
      const easyLevel = await this.loadLevel("easy")
      const snakeSprites = await this.loadAsset("snake_sprites")

      console.log("✅ Loaded level:", easyLevel ? "easy level data" : "none")
      console.log("✅ Loaded sprites:", snakeSprites ? "snake sprites" : "none")

      // Load high scores
      const scoresData = await loader.fetchData("leaderboard", {
        type: "scores",
      })
      const scores = JSON.parse(scoresData)
      console.log("🏆 High scores:", scores)
    } catch (error) {
      console.error("❌ Loader demonstration failed:", error)
    }
  }
}
