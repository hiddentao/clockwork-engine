import { EventEmitter } from "./EventEmitter"
import { GameEventManager } from "./GameEventManager"
import type { GameEngineInterface, GameObject } from "./GameObject"
import { GameObjectGroup } from "./GameObjectGroup"
import type { GameRecorder } from "./GameRecorder"
import type { Loader } from "./Loader"
import { PRNG } from "./PRNG"
import { Timer } from "./Timer"
import { UserInputEventSource } from "./UserInputEventSource"
import { AssetLoader } from "./assets/AssetLoader"
import { CollisionGrid } from "./geometry"
import type { PlatformLayer } from "./platform"
import { type GameConfig, GameState } from "./types"

export enum GameEngineEventType {
  STATE_CHANGE = "stateChange",
}

export interface GameEngineEvents
  extends Record<string, (...args: any[]) => void> {
  [GameEngineEventType.STATE_CHANGE]: (
    newState: GameState,
    oldState: GameState,
  ) => void
}

export interface GameEngineOptions {
  loader: Loader
  platform: PlatformLayer
  assetLoader?: AssetLoader
}

export abstract class GameEngine
  extends EventEmitter<GameEngineEvents>
  implements GameEngineInterface
{
  protected gameObjectGroups: Map<string, GameObjectGroup> = new Map()
  protected totalTicks: number = 0
  protected state: GameState = GameState.READY
  protected seed: string = ""
  protected gameConfig: GameConfig = {}
  protected prng: PRNG = new PRNG()
  protected timer: Timer = new Timer()
  protected eventManager: GameEventManager
  protected recorder: GameRecorder | undefined = undefined
  protected collisionTree: CollisionGrid
  protected loader: Loader
  protected platform: PlatformLayer
  protected assetLoader?: AssetLoader

  constructor(options: GameEngineOptions) {
    super()
    this.loader = options.loader
    this.platform = options.platform
    // Initialize default AssetLoader if not provided
    this.assetLoader =
      options.assetLoader ||
      new AssetLoader(
        options.loader,
        options.platform.rendering,
        options.platform.audio,
      )
    this.eventManager = new GameEventManager(new UserInputEventSource(), this)
    this.collisionTree = new CollisionGrid()
  }

  protected setState(newState: GameState): void {
    const oldState = this.state
    this.state = newState
    this.emit(GameEngineEventType.STATE_CHANGE, newState, oldState)
  }

  /**
   * Reset the game engine to initial state
   * Clears all game objects, resets tick counter, and prepares for new game
   * If assetLoader is configured, preloads all registered assets before setup()
   * @param gameConfig Game configuration containing seed and initial state
   */
  async reset(gameConfig: GameConfig): Promise<void> {
    this.gameConfig = gameConfig
    if (gameConfig.prngSeed !== undefined) {
      this.seed = gameConfig.prngSeed
    }
    this.setState(GameState.READY)
    this.prng.reset(this.seed)
    this.totalTicks = 0
    this.gameObjectGroups.clear()
    this.timer.reset()
    this.eventManager.reset()
    this.collisionTree.clear()

    // Preload assets before setup() if assetLoader is configured
    if (this.assetLoader) {
      await this.assetLoader.preloadAssets()
    }

    await this.setup(gameConfig)
  }

  /**
   * Abstract method for game-specific initialization
   * Override in subclasses to create initial game objects and configure game state
   * Called automatically during reset() to set up the game world
   * @param gameConfig Game configuration containing seed and initial state
   */
  abstract setup(gameConfig: GameConfig): Promise<void>

  /**
   * Start the game by transitioning from READY to PLAYING state
   * Enables game loop processing and begins gameplay
   * @throws Error if engine is not in READY state
   */
  start(): void {
    if (this.state !== GameState.READY) {
      throw new Error(
        `Cannot start game: expected READY state, got ${this.state}`,
      )
    }
    this.setState(GameState.PLAYING)
  }

  /**
   * Pause the game by transitioning from PLAYING to PAUSED state
   * Stops game loop processing while maintaining current state
   * @throws Error if engine is not in PLAYING state
   */
  pause(): void {
    if (this.state !== GameState.PLAYING) {
      throw new Error(
        `Cannot pause game: expected PLAYING state, got ${this.state}`,
      )
    }
    this.setState(GameState.PAUSED)
  }

  /**
   * Resume the game by transitioning from PAUSED to PLAYING state
   * Restarts game loop processing from paused state
   * @throws Error if engine is not in PAUSED state
   */
  resume(): void {
    if (this.state !== GameState.PAUSED) {
      throw new Error(
        `Cannot resume game: expected PAUSED state, got ${this.state}`,
      )
    }
    this.setState(GameState.PLAYING)
  }

  /**
   * End the game by transitioning to ENDED state
   * Stops all game processing and marks game as finished
   * @throws Error if engine is not in PLAYING or PAUSED state
   */
  end(): void {
    if (this.state !== GameState.PLAYING && this.state !== GameState.PAUSED) {
      throw new Error(
        `Cannot end game: expected PLAYING or PAUSED state, got ${this.state}`,
      )
    }
    this.setState(GameState.ENDED)
  }

  /**
   * Update the game state for the current tick
   * Processes inputs, timers, and game objects in deterministic order
   * @param deltaTicks Number of ticks to advance the simulation
   */
  update(deltaTicks: number): void {
    if (this.state !== GameState.PLAYING) {
      return
    }

    // Update tick counter to maintain deterministic timing
    this.totalTicks += deltaTicks

    // Record tick progression for replay system
    if (this.recorder) {
      this.recorder.recordFrameUpdate(deltaTicks, this.totalTicks)
    }

    // Process queued events at current tick
    this.eventManager.update(deltaTicks, this.totalTicks)

    // Execute scheduled timer callbacks
    this.timer.update(deltaTicks, this.totalTicks)

    // Update all registered game objects by type
    for (const [_type, group] of this.gameObjectGroups) {
      group.update(deltaTicks, this.totalTicks)
    }
  }

  /**
   * Register a GameObject with the engine
   * Automatically creates and manages groups by type
   * @param gameObject The game object to register
   * @param overrideType Optional type to use instead of gameObject.getType()
   */
  registerGameObject(gameObject: GameObject, overrideType?: string): void {
    const type = overrideType || gameObject.getType()
    let group = this.gameObjectGroups.get(type)

    if (!group) {
      group = new GameObjectGroup()
      this.gameObjectGroups.set(type, group)
    }

    group.add(gameObject)
  }

  /**
   * Get a GameObjectGroup by type
   * Returns undefined if no objects of that type have been registered
   */
  getGameObjectGroup(type: string): GameObjectGroup | undefined {
    return this.gameObjectGroups.get(type)
  }

  /**
   * Get all registered object types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.gameObjectGroups.keys())
  }

  /**
   * Get the current game state
   */
  getState(): GameState {
    return this.state
  }

  /**
   * Get the seed used for this game session
   */
  getSeed(): string {
    return this.seed
  }

  /**
   * Get the game configuration
   */
  getGameConfig(): GameConfig {
    return this.gameConfig
  }

  /**
   * Get the total number of ticks processed
   */
  getTotalTicks(): number {
    return this.totalTicks
  }

  /**
   * Get the PRNG instance for deterministic random numbers
   */
  getPRNG(): PRNG {
    return this.prng
  }

  /**
   * Clear all destroyed GameObjects from all groups
   * @returns Total number of destroyed objects removed
   */
  clearDestroyedGameObjects(): number {
    let totalRemoved = 0
    for (const group of this.gameObjectGroups.values()) {
      totalRemoved += group.clearDestroyed()
    }
    return totalRemoved
  }

  /**
   * Schedule a one-time callback to execute after the specified number of ticks
   */
  setTimeout(callback: () => void, ticks: number): number {
    return this.timer.setTimeout(callback, ticks)
  }

  /**
   * Schedule a repeating callback to execute every specified number of ticks
   */
  setInterval(callback: () => void, ticks: number): number {
    return this.timer.setInterval(callback, ticks)
  }

  /**
   * Cancel a timer
   */
  clearTimer(id: number): boolean {
    return this.timer.clearTimer(id)
  }

  /**
   * Get the timer system
   */
  getTimer(): Timer {
    return this.timer
  }

  /**
   * Get the event manager
   */
  getEventManager(): GameEventManager {
    return this.eventManager
  }

  /**
   * Set the game recorder for recording gameplay
   * Also sets the recorder on the event manager
   */
  setGameRecorder(recorder: GameRecorder | undefined): void {
    this.recorder = recorder
    this.eventManager.setRecorder(recorder)
  }

  /**
   * Get the collision tree for spatial collision detection
   */
  getCollisionTree(): CollisionGrid {
    return this.collisionTree
  }

  /**
   * Get the loader instance for data loading
   */
  getLoader(): Loader {
    return this.loader
  }

  /**
   * Get the platform layer
   */
  getPlatform(): PlatformLayer {
    return this.platform
  }
}
