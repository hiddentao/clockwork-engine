import { EventEmitter } from "./EventEmitter"
import { GameEventManager } from "./GameEventManager"
import type { GameEngineInterface, GameObject } from "./GameObject"
import { GameObjectGroup } from "./GameObjectGroup"
import type { GameRecorder } from "./GameRecorder"
import { PRNG } from "./PRNG"
import { Timer } from "./Timer"
import { UserInputEventSource } from "./UserInputEventSource"
import { CollisionBspTree } from "./geometry/CollisionUtils"
import { GameState } from "./types"

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

export abstract class GameEngine
  extends EventEmitter<GameEngineEvents>
  implements GameEngineInterface
{
  private gameObjectGroups: Map<string, GameObjectGroup> = new Map()
  private totalFrames: number = 0
  private state: GameState = GameState.READY
  private seed: string = ""
  private prng: PRNG = new PRNG()
  private timer: Timer = new Timer()
  private eventManager: GameEventManager
  private recorder: GameRecorder | undefined = undefined
  protected collisionTree: CollisionBspTree = new CollisionBspTree()

  constructor() {
    super()
    this.eventManager = new GameEventManager(new UserInputEventSource(), this)
  }

  private setState(newState: GameState): void {
    const oldState = this.state
    this.state = newState
    this.emit(GameEngineEventType.STATE_CHANGE, newState, oldState)
  }

  /**
   * Reset the game engine to initial state
   * Sets state to READY, recreates PRNG, resets frame counter, and calls setup()
   */
  reset(seed?: string): void {
    if (seed !== undefined) {
      this.seed = seed
    }
    this.setState(GameState.READY)
    this.prng.initialize(this.seed)
    this.totalFrames = 0
    this.gameObjectGroups.clear()
    this.timer.reset()
    this.eventManager.reset()
    this.collisionTree.clear()
    this.setup()
  }

  /**
   * Abstract method for game-specific setup
   * Override in subclasses to create initial game objects
   */
  abstract setup(): void

  /**
   * Start the game by transitioning from READY to PLAYING state
   * Only allowed when engine is in READY state
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
   * Only allowed when engine is in PLAYING state
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
   * Only allowed when engine is in PAUSED state
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
   * Only allowed from PLAYING or PAUSED states
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
   * Update the game state for the current frame
   * Only processes updates when state is PLAYING
   */
  update(deltaFrames: number): void {
    if (this.state !== GameState.PLAYING) {
      return
    }

    // 1. Increment frame counter FIRST
    this.totalFrames += deltaFrames

    // 2. Record frame update if recorder is set
    if (this.recorder) {
      this.recorder.recordFrameUpdate(deltaFrames, this.totalFrames)
    }

    // 3. Process events with updated frame count
    this.eventManager.update(deltaFrames, this.totalFrames)

    // 4. Update timer system
    this.timer.update(deltaFrames, this.totalFrames)

    // 5. Update all game object groups
    for (const [_type, group] of this.gameObjectGroups) {
      group.update(deltaFrames, this.totalFrames)
    }
  }

  /**
   * Register a GameObject with the engine
   * Automatically creates and manages groups by type
   */
  registerGameObject(gameObject: GameObject): void {
    const type = gameObject.getType()
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
   * Get the total number of frames processed
   */
  getTotalFrames(): number {
    return this.totalFrames
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
  clearDestroyed(): number {
    let totalRemoved = 0
    for (const group of this.gameObjectGroups.values()) {
      totalRemoved += group.clearDestroyed()
    }
    return totalRemoved
  }

  /**
   * Schedule a one-time callback to execute after the specified number of frames
   */
  setTimeout(callback: () => void, frames: number): string {
    return this.timer.setTimeout(callback, frames)
  }

  /**
   * Schedule a repeating callback to execute every specified number of frames
   */
  setInterval(callback: () => void, frames: number): string {
    return this.timer.setInterval(callback, frames)
  }

  /**
   * Cancel a timer
   */
  clearTimer(id: string): boolean {
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
  getCollisionTree(): CollisionBspTree {
    return this.collisionTree
  }
}
