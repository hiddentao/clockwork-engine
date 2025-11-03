import { beforeEach, describe, expect, test } from "bun:test"
import { DemoGameEngine } from "../../demo/src/engine/DemoGameEngine"
import { DemoLoader } from "../../demo/src/loader/DemoLoader"
import { GameEngine, GameRecording, GameState, ReplayManager } from "../../src"
import { testCases } from "../fixtures/demoGameRecordings"

describe("Replay Integration Tests (Manual Recordings)", () => {
  let replayEngine: DemoGameEngine
  let replayManager: ReplayManager
  let loader: DemoLoader

  beforeEach(async () => {
    loader = new DemoLoader()
    replayEngine = new DemoGameEngine(loader)
    replayManager = new ReplayManager(replayEngine as unknown as GameEngine)
  })

  // Helper function to run replay at specified speed
  async function runReplayAtSpeed(
    replayManager: ReplayManager,
    recording: GameRecording,
    deltaTicksPerUpdate: number,
  ): Promise<void> {
    await replayManager.replay(recording)

    let totalProcessedTicks = 0
    while (totalProcessedTicks < recording.totalTicks) {
      const ticksToProcess = Math.min(
        deltaTicksPerUpdate,
        recording.totalTicks - totalProcessedTicks,
      )
      replayManager.getReplayEngine().update(ticksToProcess)
      totalProcessedTicks += ticksToProcess
    }
  }

  // Helper function to validate final state
  function validateFinalState(
    engine: DemoGameEngine,
    expectedState: {
      applesEaten: number
      snakeLength: number
      snakePosition: { x: number; y: number }
    },
  ): void {
    const actualFinalState = {
      applesEaten: engine.getApplesEaten(),
      snakeLength: engine.getSnakeLength(),
      snakePosition: engine.getSnake()!.getPosition(),
    }

    expect(actualFinalState.applesEaten).toBe(expectedState.applesEaten)
    expect(actualFinalState.snakeLength).toBe(expectedState.snakeLength)
    expect(actualFinalState.snakePosition.x).toBe(expectedState.snakePosition.x)
    expect(actualFinalState.snakePosition.y).toBe(expectedState.snakePosition.y)
  }

  test.each(testCases)(
    "should replay $name identically at all speeds",
    async ({ finalState, recording }) => {
      const r = recording as GameRecording

      const speeds = [
        {
          name: "slow (totalTicks/20)",
          deltaTicks: Math.ceil(r.totalTicks / 20),
        },
        {
          name: "medium (totalTicks/10)",
          deltaTicks: Math.ceil(r.totalTicks / 10),
        },
        {
          name: "instant",
          deltaTicks: r.totalTicks,
        },
      ]

      for (const speed of speeds) {
        // Reset replay engine with recording's config
        await replayEngine.reset(r.gameConfig)

        // Run replay at specified speed
        await runReplayAtSpeed(replayManager, r, speed.deltaTicks)

        expect(replayEngine.getState()).toBe(GameState.ENDED)

        // Validate final state
        validateFinalState(replayEngine, finalState)
      }
    },
  )
})
