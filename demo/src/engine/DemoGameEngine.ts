import { GameEngine, GameState, Vector2D } from "clockwork"
import { Apple, Snake, Wall } from "../gameObjects"
import { Direction, GAME_CONFIG } from "../utils/constants"

export class DemoGameEngine extends GameEngine {
  private applesEaten: number = 0
  private wallsSpawned: number = 0
  private gameWon: boolean = false
  private gameLost: boolean = false

  setup(): void {
    // Set up input handling
    this.setupInputHandling()

    // Create initial snake at center
    const centerX = Math.floor(GAME_CONFIG.GRID_SIZE / 2)
    const centerY = Math.floor(GAME_CONFIG.GRID_SIZE / 2)
    new Snake("player-snake", new Vector2D(centerX, centerY), this)

    // Spawn initial apple
    this.spawnApple()

    // Set up timers for game mechanics
    this.setupTimers()
  }

  private setupInputHandling(): void {
    // Connect input manager to handle direction inputs
    this.getEventManager().onUserInput = (event) => {
      console.log("Received input event:", event)
      if (event.params && event.params[0] && event.params[0].direction) {
        this.handleInput(event.params[0].direction)
      }
    }
  }

  private setupTimers(): void {
    // Snake movement timer
    this.setInterval(async () => {
      this.moveSnake()
    }, GAME_CONFIG.SNAKE_MOVE_INTERVAL)

    // Wall spawning timer
    this.setInterval(async () => {
      this.spawnWall()
    }, GAME_CONFIG.WALL_SPAWN_INTERVAL)

    // Apple cleanup timer - check every 30 frames
    this.setInterval(async () => {
      this.cleanupExpiredApples()
    }, 30)
  }

  private moveSnake() {
    const snake = this.getSnake()
    if (!snake || this.getState() !== GameState.PLAYING) return

    // Move snake
    snake.move()

    // Check collisions
    this.checkCollisions()
  }

  private checkCollisions() {
    const snake = this.getSnake()
    if (!snake) return

    // Check boundary collision
    if (snake.checkBoundaryCollision(GAME_CONFIG.GRID_SIZE)) {
      this.gameLost = true
      this.end()
      return
    }

    // Check self collision
    if (snake.checkSelfCollision()) {
      this.gameLost = true
      this.end()
      return
    }

    // Check wall collision
    const walls = this.getWalls()
    for (const wall of walls) {
      if (wall.checkCollision(snake.getHead())) {
        this.gameLost = true
        this.end()
        return
      }
    }

    // Check apple collision
    const apples = this.getApples()
    for (const apple of apples) {
      if (snake.checkAppleCollision(apple.getPosition())) {
        // Snake eats apple
        snake.grow()
        this.applesEaten++

        // Remove eaten apple
        apple.destroy()

        // Spawn new apple
        this.spawnApple()

        // Check win condition
        if (this.applesEaten >= GAME_CONFIG.TARGET_APPLES) {
          this.gameWon = true
          this.end()
        }

        break
      }
    }
  }

  private spawnApple(): void {
    const position = this.findEmptyPosition()
    if (position) {
      const apple = new Apple(
        `apple-${Date.now()}`,
        position,
        GAME_CONFIG.APPLE_TIMEOUT,
        this,
      )
      apple.setSpawnFrame(this.getTotalFrames())
    }
  }

  private spawnWall(): void {
    if (this.getState() !== GameState.PLAYING) return

    const position = this.findEmptyPosition()
    if (position) {
      const isHorizontal = this.getPRNG().randomBoolean()

      // Make sure the wall doesn't spawn in an invalid position
      if (this.isValidWallPosition(position, isHorizontal)) {
        new Wall(`wall-${this.wallsSpawned++}`, position, isHorizontal, this)
      }
    }
  }

  private cleanupExpiredApples(): void {
    const apples = this.getApples()
    const currentFrame = this.getTotalFrames()

    apples.forEach((apple) => {
      if (apple.isExpired(currentFrame)) {
        apple.destroy()
        // Spawn replacement apple
        this.spawnApple()
      }
    })
  }

  private findEmptyPosition(): Vector2D | null {
    const prng = this.getPRNG()

    // Try up to 100 times to find an empty position
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = prng.randomInt(0, GAME_CONFIG.GRID_SIZE - 1)
      const y = prng.randomInt(0, GAME_CONFIG.GRID_SIZE - 1)
      const position = new Vector2D(x, y)

      if (this.isPositionEmpty(position)) {
        return position
      }
    }

    return null
  }

  private isPositionEmpty(position: Vector2D): boolean {
    const snake = this.getSnake()

    // Check snake collision
    if (snake) {
      const segments = snake.getSegments()
      if (
        segments.some(
          (seg) =>
            seg.position.x === position.x && seg.position.y === position.y,
        )
      ) {
        return false
      }
    }

    // Check apple collision
    const apples = this.getApples()
    if (
      apples.some(
        (apple) =>
          apple.getPosition().x === position.x &&
          apple.getPosition().y === position.y,
      )
    ) {
      return false
    }

    // Check wall collision
    const walls = this.getWalls()
    if (walls.some((wall) => wall.checkCollision(position))) {
      return false
    }

    return true
  }

  private isValidWallPosition(
    position: Vector2D,
    isHorizontal: boolean,
  ): boolean {
    // Check if both blocks of the wall would be in valid positions
    const positions = isHorizontal
      ? [position, position.add(new Vector2D(1, 0))]
      : [position, position.add(new Vector2D(0, 1))]

    // Check bounds
    for (const pos of positions) {
      if (
        pos.x < 0 ||
        pos.x >= GAME_CONFIG.GRID_SIZE ||
        pos.y < 0 ||
        pos.y >= GAME_CONFIG.GRID_SIZE
      ) {
        return false
      }

      if (!this.isPositionEmpty(pos)) {
        return false
      }
    }

    return true
  }

  // Input handling methods (these will be recorded for replay)
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
    return snakeGroup?.getAll()[0] as Snake
  }

  private getApples(): Apple[] {
    const appleGroup = this.getGameObjectGroup("Apple")
    return (appleGroup?.getAll() as Apple[]) || []
  }

  private getWalls(): Wall[] {
    const wallGroup = this.getGameObjectGroup("Wall")
    return (wallGroup?.getAll() as Wall[]) || []
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
  }

  public reset(seed?: string): void {
    super.reset(seed)
    this.resetGameState()
  }
}
