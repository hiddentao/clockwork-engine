import type { GameEngine } from "../../src/GameEngine"
import { GameRecorder } from "../../src/GameRecorder"
import { Vector2D } from "../../src/geometry/Vector2D"
import {
  GameEventType,
  type ObjectUpdateEvent,
  type UserInputEvent,
} from "../../src/types"
import { MockTicker } from "./MockTicker"
import { type GameStateSnapshot, StateComparator } from "./StateComparator"

export interface ScheduledAction {
  tick: number
  action: () => void
  description?: string
}

export interface MovementCommand {
  tick: number
  objectType: string
  objectId: string
  method: string
  params: any[]
}

export interface ScenarioResult {
  engine: GameEngine
  recording: any
  finalSnapshot: GameStateSnapshot
  snapshots: GameStateSnapshot[]
  ticker: MockTicker
}

export class TestScenarioBuilder {
  private engine: GameEngine
  private recorder: GameRecorder
  private ticker: MockTicker
  private scheduledActions: ScheduledAction[] = []
  private movementCommands: MovementCommand[] = []
  private inputEvents: UserInputEvent[] = []
  private snapshotTicks: number[] = []
  private seed: string

  constructor(engine: GameEngine, seed = "test-scenario") {
    this.engine = engine
    this.recorder = new GameRecorder()
    this.ticker = new MockTicker()
    this.seed = seed
  }

  async initialize(): Promise<void> {
    // Reset engine with seed
    await this.engine.reset(this.seed)
  }

  // Object creation methods
  addPlayers(
    count: number,
    startPosition = new Vector2D(0, 0),
    spacing = 20,
  ): this {
    this.scheduledActions.push({
      tick: 0,
      action: () => {
        for (let i = 0; i < count; i++) {
          const position = startPosition.add(new Vector2D(i * spacing, 0))
          // Assuming engine has a method to create test players
          if ("createTestPlayer" in this.engine) {
            ;(this.engine as any).createTestPlayer(`player-${i}`, position)
          }
        }
      },
      description: `Create ${count} players`,
    })
    return this
  }

  addEnemies(
    count: number,
    startPosition = new Vector2D(100, 100),
    spacing = 30,
  ): this {
    this.scheduledActions.push({
      tick: 0,
      action: () => {
        for (let i = 0; i < count; i++) {
          const position = startPosition.add(new Vector2D(i * spacing, 0))
          if ("createTestEnemy" in this.engine) {
            ;(this.engine as any).createTestEnemy(`enemy-${i}`, position)
          }
        }
      },
      description: `Create ${count} enemies`,
    })
    return this
  }

  // Movement scheduling
  scheduleMovement(
    tick: number,
    objectType: string,
    objectId: string,
    direction: "up" | "down" | "left" | "right",
    distance = 1,
  ): this {
    const methodName = `move${direction.charAt(0).toUpperCase()}${direction.slice(1)}`

    this.movementCommands.push({
      tick,
      objectType,
      objectId,
      method: methodName,
      params: [distance],
    })
    return this
  }

  scheduleMovementSequence(
    objectType: string,
    objectId: string,
    movements: Array<{
      tick: number
      direction: "up" | "down" | "left" | "right"
      distance?: number
    }>,
  ): this {
    movements.forEach((movement) => {
      this.scheduleMovement(
        movement.tick,
        objectType,
        objectId,
        movement.direction,
        movement.distance || 1,
      )
    })
    return this
  }

  // Object lifecycle
  scheduleObjectCreation(
    tick: number,
    type: "player" | "enemy" | "projectile" | "powerup",
    id: string,
    position: Vector2D,
  ): this {
    this.scheduledActions.push({
      tick,
      action: () => {
        const methodName = `createTest${type.charAt(0).toUpperCase()}${type.slice(1)}`
        if (methodName in this.engine) {
          if (type === "projectile") {
            ;(this.engine as any)[methodName](id, position, new Vector2D(5, 0))
          } else {
            ;(this.engine as any)[methodName](id, position)
          }
        }
      },
      description: `Create ${type} ${id} at ${position.x},${position.y}`,
    })
    return this
  }

  scheduleObjectDestruction(
    tick: number,
    objectType: string,
    objectId: string,
  ): this {
    this.scheduledActions.push({
      tick,
      action: () => {
        const group = this.engine.getGameObjectGroup(objectType)
        const obj = group?.getById(objectId)
        if (obj) {
          obj.destroy()
        }
      },
      description: `Destroy ${objectType} ${objectId}`,
    })
    return this
  }

  // Timer-based events
  scheduleTimerCallback(
    tick: number,
    delay: number,
    callback: () => void,
    description?: string,
  ): this {
    this.scheduledActions.push({
      tick,
      action: () => {
        this.engine.setTimeout(callback, delay)
      },
      description: description || `Schedule timer callback with delay ${delay}`,
    })
    return this
  }

  scheduleIntervalCallback(
    tick: number,
    interval: number,
    callback: () => void,
    description?: string,
  ): this {
    this.scheduledActions.push({
      tick,
      action: () => {
        this.engine.setInterval(callback, interval)
      },
      description:
        description || `Schedule interval callback every ${interval} frames`,
    })
    return this
  }

  // Property modifications
  schedulePropertyChange(
    tick: number,
    objectType: string,
    objectId: string,
    method: string,
    params: any[],
  ): this {
    this.scheduledActions.push({
      tick,
      action: () => {
        const group = this.engine.getGameObjectGroup(objectType)
        const obj = group?.getById(objectId)
        if (obj && typeof (obj as any)[method] === "function") {
          ;(obj as any)[method](...params)

          // Record this as an object update event
          this.recordObjectUpdate(
            this.engine.getTotalTicks(),
            objectType,
            objectId,
            method,
            params,
          )
        }
      },
      description: `Call ${method} on ${objectType} ${objectId}`,
    })
    return this
  }

  // Input events
  addInputEvent(tick: number, inputType: string, params: any): this {
    this.inputEvents.push({
      type: GameEventType.USER_INPUT,
      tick,
      timestamp: Date.now() + tick * 16.67, // Simulate 60 FPS timing
      inputType,
      params,
    })
    return this
  }

  // State snapshots
  captureSnapshotAt(tick: number): this {
    this.snapshotTicks.push(tick)
    return this
  }

  captureSnapshotsEvery(interval: number, maxTicks: number): this {
    for (let tick = 0; tick <= maxTicks; tick += interval) {
      this.snapshotTicks.push(tick)
    }
    return this
  }

  // Complex scenarios
  createBattleScenario(playerCount = 3, enemyCount = 5): this {
    // Create players and enemies
    this.addPlayers(playerCount, new Vector2D(50, 50))
    this.addEnemies(enemyCount, new Vector2D(200, 200))

    // Schedule some movements
    for (let i = 0; i < playerCount; i++) {
      this.scheduleMovementSequence(`Player`, `player-${i}`, [
        { tick: 10, direction: "right", distance: 5 },
        { tick: 20, direction: "up", distance: 3 },
        { tick: 30, direction: "left", distance: 2 },
      ])
    }

    // Schedule projectile creation
    this.scheduleTimerCallback(
      15,
      0,
      () => {
        for (let i = 0; i < playerCount; i++) {
          if ("fireProjectile" in this.engine) {
            ;(this.engine as any).fireProjectile(
              this.engine.getGameObjectGroup("Player")?.getById(`player-${i}`),
              new Vector2D(300, 200),
            )
          }
        }
      },
      "Players fire projectiles",
    )

    return this
  }

  createChaosScenario(objectCount = 50): this {
    // Create many objects
    this.addPlayers(objectCount / 2)
    this.addEnemies(objectCount / 2)

    // Schedule random movements
    for (let i = 0; i < objectCount / 2; i++) {
      const directions: Array<"up" | "down" | "left" | "right"> = [
        "up",
        "down",
        "left",
        "right",
      ]
      for (let tick = 10; tick < 100; tick += 10) {
        const direction = directions[i % directions.length]
        this.scheduleMovement(tick, "Player", `player-${i}`, direction, 2)
        this.scheduleMovement(tick + 5, "Enemy", `enemy-${i}`, direction, 1)
      }
    }

    // Capture snapshots frequently
    this.captureSnapshotsEvery(25, 100)

    return this
  }

  // Build and run scenario
  async build(): Promise<{
    engine: GameEngine
    recorder: GameRecorder
    ticker: MockTicker
  }> {
    // Execute initial actions (frame 0)
    this.scheduledActions
      .filter((action) => action.tick === 0)
      .forEach((action) => action.action())

    // Start recording
    this.recorder.startRecording(
      this.engine.getEventManager(),
      this.seed,
      "Test scenario",
    )

    // Start engine
    this.engine.start()

    // Set up ticker callback
    this.ticker.add(async (deltaTicks) => {
      await this.engine.update(deltaTicks)
    })

    return {
      engine: this.engine,
      recorder: this.recorder,
      ticker: this.ticker,
    }
  }

  async run(
    totalTicks: number,
    deltaTicksPerTick = 1,
  ): Promise<ScenarioResult> {
    const { engine, recorder, ticker } = await this.build()

    const snapshots: GameStateSnapshot[] = []
    let currentTick = 0

    while (currentTick < totalTicks) {
      // Execute scheduled actions for this tick
      this.scheduledActions
        .filter((action) => action.tick === currentTick)
        .forEach((action) => action.action())

      // Execute movement commands for this tick
      this.movementCommands
        .filter((cmd) => cmd.tick === currentTick)
        .forEach((cmd) => {
          const group = engine.getGameObjectGroup(cmd.objectType)
          const obj = group?.getById(cmd.objectId)
          if (obj && typeof (obj as any)[cmd.method] === "function") {
            ;(obj as any)[cmd.method](...cmd.params)
            this.recordObjectUpdate(
              currentTick,
              cmd.objectType,
              cmd.objectId,
              cmd.method,
              cmd.params,
            )
          }
        })

      // Capture snapshot if scheduled
      if (this.snapshotTicks.includes(currentTick)) {
        snapshots.push(StateComparator.snapshot(engine))
      }

      // Run frame
      await ticker.tick(deltaTicksPerTick)
      currentTick += deltaTicksPerTick
    }

    // Stop recording
    recorder.stopRecording()

    // Final snapshot
    const finalSnapshot = StateComparator.snapshot(engine)

    return {
      engine,
      recording: recorder.getCurrentRecording(),
      finalSnapshot,
      snapshots,
      ticker,
    }
  }

  private recordObjectUpdate(
    tick: number,
    objectType: string,
    objectId: string,
    method: string,
    params: any[],
  ): void {
    const event: ObjectUpdateEvent = {
      type: GameEventType.OBJECT_UPDATE,
      tick,
      timestamp: Date.now(),
      objectType,
      objectId,
      method,
      params,
    }
    this.recorder.recordEvent(event)
  }

  // Utility methods
  async reset(): Promise<this> {
    this.scheduledActions = []
    this.movementCommands = []
    this.inputEvents = []
    this.snapshotTicks = []
    await this.engine.reset(this.seed)
    this.recorder.reset()
    this.ticker.reset()
    return this
  }

  getSeed(): string {
    return this.seed
  }

  getScheduledActionCount(): number {
    return this.scheduledActions.length
  }

  getMovementCommandCount(): number {
    return this.movementCommands.length
  }
}
