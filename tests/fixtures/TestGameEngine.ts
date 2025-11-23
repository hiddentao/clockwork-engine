import type { GameEngineOptions } from "../../src/GameEngine"
import { GameEngine } from "../../src/GameEngine"
import type { Loader } from "../../src/Loader"
import { MemoryPlatformLayer } from "../../src/platform"
import { TestEnemy } from "./TestEnemy"
import { TestPlayer } from "./TestPlayer"

export class TestGameEngine extends GameEngine {
  public setupCalled = false
  public setupCallCount = 0

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

  async setup(): Promise<void> {
    this.setupCalled = true
    this.setupCallCount++

    // Create some test objects
    const _player = new TestPlayer("player1", { x: 10, y: 10 }, this)
    const _enemy1 = new TestEnemy("enemy1", { x: 20, y: 20 }, this)
    const _enemy2 = new TestEnemy("enemy2", { x: 30, y: 30 }, this)
  }

  // Make protected methods public for testing
  public getGameObjectGroups() {
    return super.getRegisteredTypes()
  }

  // Helper method to simulate frame updates
  public async simulateFrames(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.update(1)
    }
  }

  // Helper to get a specific game object for testing
  public getPlayer(id: string) {
    return this.getGameObjectGroup("Player")?.getById(id) as TestPlayer
  }

  public getEnemy(id: string) {
    return this.getGameObjectGroup("Enemy")?.getById(id) as TestEnemy
  }
}
