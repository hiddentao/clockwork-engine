/**
 * Headless Replay Validation Example
 *
 * Demonstrates how to validate a game recording without rendering,
 * useful for server-side validation, CI testing, and cheat detection.
 */

import type { GameEngine } from "../src/GameEngine"
import { ReplayManager } from "../src/ReplayManager"
import { HeadlessLoader } from "../src/loaders/HeadlessLoader"
import { MemoryPlatformLayer } from "../src/platform/memory"
import type { GameConfig } from "../src/types"

// Mock types for demonstration
interface GameRecording {
  gameConfig: GameConfig
  events: any[]
  tickDeltas: number[]
  totalTicks: number
  expectedFinalState: any
}

/**
 * Validate a game recording in headless mode
 */
async function validateRecording(
  recording: GameRecording,
  EngineClass: new (options: any) => GameEngine,
): Promise<{
  valid: boolean
  finalState: any
  error?: string
}> {
  // Create headless components - no rendering, no assets needed
  const loader = new HeadlessLoader()
  const platform = new MemoryPlatformLayer()

  try {
    // Create engine with headless platform
    const engine = new EngineClass({ loader, platform })

    // Reset engine with recording's game config
    await engine.reset(recording.gameConfig)

    // Create replay manager
    const replayManager = new ReplayManager(engine)

    // Load the recording
    await replayManager.replay(recording)

    // Process replay with timeout protection
    const TIMEOUT_MS = 10000 // 10 seconds
    const startTime = Date.now()

    let progress = replayManager.getReplayProgress()

    while (progress.progress < 1.0) {
      // Timeout check
      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error(
          `Replay timeout after ${TIMEOUT_MS}ms at ${(progress.progress * 100).toFixed(1)}% progress`,
        )
      }

      // Update game state
      engine.update(recording.totalTicks)

      // Sleep to allow async operations
      await sleep(100)

      // Check progress
      progress = replayManager.getReplayProgress()
    }

    // Extract final game state
    const finalState = extractGameState(engine)

    // Validate against expected state
    const valid = validateState(finalState, recording.expectedFinalState)

    return {
      valid,
      finalState,
    }
  } catch (error: any) {
    return {
      valid: false,
      finalState: null,
      error: error.message,
    }
  }
}

/**
 * Extract relevant game state for validation
 */
function extractGameState(engine: GameEngine): any {
  return {
    tick: engine.totalTicks,
    state: engine.state,
    // Add game-specific state extraction here
    // For example:
    // score: engine.score,
    // gameObjects: engine.getGameObjects(),
    // etc.
  }
}

/**
 * Validate final state matches expected state
 */
function validateState(finalState: any, expectedState: any): boolean {
  // Simple deep equality check
  // In production, you'd implement more sophisticated validation
  return JSON.stringify(finalState) === JSON.stringify(expectedState)
}

/**
 * Sleep helper for async delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Example usage
 */
async function main() {
  // Example recording (in practice, this would be loaded from a file or database)
  const recording: GameRecording = {
    gameConfig: {
      prngSeed: "test-seed-123",
      gameSpecific: {
        difficulty: "hard",
        mapSize: 1000,
      },
    },
    events: [],
    tickDeltas: [],
    totalTicks: 60000, // 1 second worth of ticks
    expectedFinalState: {
      tick: 60000,
      state: "ENDED",
    },
  }

  console.log("Starting headless replay validation...")
  console.log(`PRNG Seed: ${recording.gameConfig.prngSeed}`)
  console.log(`Total ticks: ${recording.totalTicks}`)
  console.log("")

  // Note: You would pass your actual GameEngine subclass here
  // const result = await validateRecording(recording, MyGameEngine)

  // For demonstration, we'll simulate the result
  const result = {
    valid: true,
    finalState: {
      tick: 60000,
      state: "ENDED",
    },
  }

  if (result.valid) {
    console.log("✓ Recording is VALID")
    console.log("Final state:", JSON.stringify(result.finalState, null, 2))
  } else {
    console.log("✗ Recording is INVALID")
    if (result.error) {
      console.log("Error:", result.error)
    }
    console.log("Final state:", JSON.stringify(result.finalState, null, 2))
  }
}

// Run if executed directly
if (import.meta.main) {
  main()
}

export { validateRecording, extractGameState, validateState }
