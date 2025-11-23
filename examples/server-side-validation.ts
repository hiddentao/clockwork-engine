/**
 * Server-Side Validation Example
 *
 * Demonstrates how to validate game recordings on a server,
 * useful for leaderboards, cheat detection, and game outcome verification.
 */

import type { GameEngine } from "../src/GameEngine"
import { ReplayManager } from "../src/ReplayManager"
import { HeadlessLoader } from "../src/loaders/HeadlessLoader"
import { MemoryPlatformLayer } from "../src/platform/memory"

/**
 * Simulated server API for game recording validation
 */
class ValidationServer {
  constructor(private EngineClass: new (options: any) => GameEngine) {}

  /**
   * Validate a recording submission from a client
   */
  async validateSubmission(submission: {
    playerId: string
    recordingData: string // JSON string
    claimedScore: number
    claimedOutcome: string
  }): Promise<{
    valid: boolean
    actualScore?: number
    actualOutcome?: string
    reason?: string
  }> {
    console.log(
      `\n[Validation] Processing submission from ${submission.playerId}`,
    )
    console.log(`[Validation] Claimed score: ${submission.claimedScore}`)
    console.log(`[Validation] Claimed outcome: ${submission.claimedOutcome}`)

    try {
      // Parse recording data
      const recording = JSON.parse(submission.recordingData)

      console.log(
        `[Validation] Recording contains ${recording.events?.length || 0} events`,
      )
      console.log(`[Validation] Total ticks: ${recording.totalTicks}`)

      // Create headless environment
      const loader = new HeadlessLoader()
      const platform = new MemoryPlatformLayer()
      const engine = new this.EngineClass({ loader, platform })

      // Reset with recording config
      await engine.reset(recording.gameConfig)

      // Create replay manager
      const replayManager = new ReplayManager(engine)
      await replayManager.replay(recording)

      // Replay with timeout and progress tracking
      const result = await this.processReplay(engine, replayManager, recording)

      if (!result.completed) {
        return {
          valid: false,
          reason: result.error || "Replay did not complete",
        }
      }

      // Extract actual game outcome
      const actualScore = this.extractScore(engine)
      const actualOutcome = this.extractOutcome(engine)

      console.log(`[Validation] Actual score: ${actualScore}`)
      console.log(`[Validation] Actual outcome: ${actualOutcome}`)

      // Verify claimed values match actual values
      const scoreMatches = actualScore === submission.claimedScore
      const outcomeMatches = actualOutcome === submission.claimedOutcome

      if (scoreMatches && outcomeMatches) {
        console.log("[Validation] ✓ Submission is VALID")
        return {
          valid: true,
          actualScore,
          actualOutcome,
        }
      }

      console.log("[Validation] ✗ Submission is INVALID")
      return {
        valid: false,
        actualScore,
        actualOutcome,
        reason: !scoreMatches
          ? `Score mismatch: claimed ${submission.claimedScore}, actual ${actualScore}`
          : `Outcome mismatch: claimed ${submission.claimedOutcome}, actual ${actualOutcome}`,
      }
    } catch (error: any) {
      console.error("[Validation] Error:", error.message)
      return {
        valid: false,
        reason: `Validation error: ${error.message}`,
      }
    }
  }

  /**
   * Process replay with timeout protection and progress tracking
   */
  private async processReplay(
    engine: GameEngine,
    replayManager: ReplayManager,
    recording: any,
  ): Promise<{ completed: boolean; error?: string }> {
    const TIMEOUT_MS = 10000
    const POLL_INTERVAL_MS = 100
    const startTime = Date.now()

    let progress = replayManager.getReplayProgress()

    while (progress.progress < 1.0) {
      // Timeout check
      const elapsed = Date.now() - startTime
      if (elapsed > TIMEOUT_MS) {
        return {
          completed: false,
          error: `Timeout after ${elapsed}ms (${(progress.progress * 100).toFixed(1)}% complete)`,
        }
      }

      // Update engine
      engine.update(recording.totalTicks)

      // Sleep to allow async operations
      await this.sleep(POLL_INTERVAL_MS)

      // Update progress
      progress = replayManager.getReplayProgress()

      // Log progress every 25%
      if (
        Math.floor(progress.progress * 4) >
        Math.floor((progress.progress - 0.01) * 4)
      ) {
        console.log(
          `[Validation] Progress: ${(progress.progress * 100).toFixed(0)}%`,
        )
      }
    }

    return { completed: true }
  }

  /**
   * Extract score from engine (game-specific)
   */
  private extractScore(_engine: any): number {
    // This would be game-specific
    // Example: return engine.score
    return 0
  }

  /**
   * Extract outcome from engine (game-specific)
   */
  private extractOutcome(engine: any): string {
    // This would be game-specific
    // Example: return engine.gameState === 'ENDED' ? 'win' : 'loss'
    return engine.state
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Batch validate multiple submissions
   */
  async validateBatch(
    submissions: Array<{
      playerId: string
      recordingData: string
      claimedScore: number
      claimedOutcome: string
    }>,
  ): Promise<
    Array<{
      playerId: string
      valid: boolean
      actualScore?: number
      actualOutcome?: string
      reason?: string
    }>
  > {
    console.log(
      `\n[Batch Validation] Processing ${submissions.length} submissions`,
    )

    const results = []

    for (const submission of submissions) {
      const result = await this.validateSubmission(submission)
      results.push({
        playerId: submission.playerId,
        ...result,
      })
    }

    const validCount = results.filter((r) => r.valid).length
    console.log(
      `\n[Batch Validation] Complete: ${validCount}/${results.length} valid`,
    )

    return results
  }
}

/**
 * Example usage
 */
async function main() {
  // Mock game engine class
  class MockGameEngine {
    state = "READY"
    totalTicks = 0
    platform: any
    loader: any

    constructor(options: any) {
      this.platform = options.platform
      this.loader = options.loader
    }

    async reset(_config: any) {
      this.state = "READY"
    }

    update(ticks: number) {
      this.totalTicks += ticks
    }
  }

  // Create validation server
  const server = new ValidationServer(MockGameEngine as any)

  // Example submissions
  const submissions = [
    {
      playerId: "player-123",
      recordingData: JSON.stringify({
        gameConfig: { prngSeed: "seed-1" },
        events: [],
        totalTicks: 60000,
      }),
      claimedScore: 100,
      claimedOutcome: "READY",
    },
    {
      playerId: "player-456",
      recordingData: JSON.stringify({
        gameConfig: { prngSeed: "seed-2" },
        events: [],
        totalTicks: 60000,
      }),
      claimedScore: 9999, // Invalid - too high!
      claimedOutcome: "READY",
    },
  ]

  // Validate batch
  const results = await server.validateBatch(submissions)

  // Display results
  console.log("\n" + "=".repeat(60))
  console.log("VALIDATION RESULTS")
  console.log("=".repeat(60))

  for (const result of results) {
    console.log(`\nPlayer: ${result.playerId}`)
    console.log(`Valid: ${result.valid ? "✓ YES" : "✗ NO"}`)
    if (result.actualScore !== undefined) {
      console.log(`Actual Score: ${result.actualScore}`)
    }
    if (result.reason) {
      console.log(`Reason: ${result.reason}`)
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  main()
}

export { ValidationServer }
