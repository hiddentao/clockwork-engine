import type { GameEngine } from "../../src/GameEngine"
import { ReplayManager } from "../../src/ReplayManager"
import type { GameRecording } from "../../src/types"
import { MockTicker } from "./MockTicker"
import { type GameStateSnapshot, StateComparator } from "./StateComparator"

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class RecordingValidator {
  static validate(recording: GameRecording): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic structure validation
    if (!recording.seed) {
      errors.push("Missing seed")
    }

    if (!Array.isArray(recording.events)) {
      errors.push("Events is not an array")
    } else {
      // Validate events structure
      recording.events.forEach((event, index) => {
        if (typeof event.type !== "string") {
          errors.push(`Event ${index}: missing or invalid type`)
        }
        if (typeof event.tick !== "number" || event.tick < 0) {
          errors.push(`Event ${index}: missing or invalid frame number`)
        }
        if (typeof event.timestamp !== "number") {
          errors.push(`Event ${index}: missing or invalid timestamp`)
        }
      })
    }

    if (!Array.isArray(recording.deltaTicks)) {
      errors.push("DeltaFrames is not an array")
    } else {
      // Validate deltaTicks
      recording.deltaTicks.forEach((delta, index) => {
        if (typeof delta !== "number" || delta <= 0) {
          errors.push(`DeltaFrame ${index}: invalid value ${delta}`)
        }
      })
    }

    if (typeof recording.totalTicks !== "number" || recording.totalTicks < 0) {
      errors.push("Invalid totalTicks")
    }

    // Cross-validation
    if (recording.events && Array.isArray(recording.events)) {
      // Check events are in chronological order
      let lastFrame = -1
      for (let i = 0; i < recording.events.length; i++) {
        const event = recording.events[i]
        if (event.tick < lastFrame) {
          errors.push(
            `Event ${i} out of chronological order at frame ${event.tick} (previous: ${lastFrame})`,
          )
        }
        lastFrame = event.tick

        // Check event frames don't exceed total frames
        if (event.tick > recording.totalTicks) {
          errors.push(
            `Event ${i} at frame ${event.tick} exceeds totalTicks ${recording.totalTicks}`,
          )
        }
      }

      // Check for potential timestamp ordering issues
      let lastTimestamp = 0
      for (let i = 0; i < recording.events.length; i++) {
        const event = recording.events[i]
        if (event.timestamp < lastTimestamp) {
          warnings.push(
            `Event ${i} has timestamp ${event.timestamp} earlier than previous ${lastTimestamp}`,
          )
        }
        lastTimestamp = event.timestamp
      }
    }

    if (recording.deltaTicks && Array.isArray(recording.deltaTicks)) {
      // Validate deltaTicks sum matches totalTicks
      const sumFrames = recording.deltaTicks.reduce(
        (sum, delta) => sum + delta,
        0,
      )
      const tolerance = 0.001
      if (Math.abs(sumFrames - recording.totalTicks) > tolerance) {
        errors.push(
          `DeltaFrames sum (${sumFrames}) doesn't match totalTicks (${recording.totalTicks})`,
        )
      }
    }

    // Metadata validation
    if (recording.metadata) {
      if (
        recording.metadata.createdAt &&
        typeof recording.metadata.createdAt !== "number"
      ) {
        warnings.push("Invalid createdAt timestamp in metadata")
      }
      if (
        recording.metadata.version &&
        typeof recording.metadata.version !== "string"
      ) {
        warnings.push("Invalid version in metadata")
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static async replayToSnapshot(
    recording: GameRecording,
    engineFactory: () => GameEngine,
  ): Promise<GameStateSnapshot> {
    const engine = engineFactory()
    const replayManager = new ReplayManager(engine)
    const ticker = new MockTicker()

    // Start replay
    replayManager.replay(recording)

    // Add ticker callback for replay manager
    const proxyEngine = replayManager.getReplayEngine()
    ticker.add((deltaTicks) => {
      proxyEngine.update(deltaTicks)
    })

    // Run through all recorded frames
    await ticker.runWithDeltaSequence(recording.deltaTicks)

    return StateComparator.snapshot(engine)
  }

  static async compareRecordReplay(
    originalSnapshot: GameStateSnapshot,
    recording: GameRecording,
    engineFactory: () => GameEngine,
  ): Promise<{
    matches: boolean
    replaySnapshot: GameStateSnapshot
    comparison: ReturnType<typeof StateComparator.compare>
  }> {
    const replaySnapshot = await this.replayToSnapshot(recording, engineFactory)
    const comparison = StateComparator.compare(
      originalSnapshot,
      replaySnapshot,
      {
        tolerance: 0.0001,
        ignorePath: ["prngState"], // PRNG might advance differently
      },
    )

    return {
      matches: comparison.equal,
      replaySnapshot,
      comparison,
    }
  }

  static analyzeRecording(recording: GameRecording): {
    eventCount: number
    tickCount: number
    duration: number
    eventTypes: Record<string, number>
    frameDistribution: { min: number; max: number; avg: number }
    eventDensity: number
  } {
    const eventTypes: Record<string, number> = {}

    recording.events.forEach((event) => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1
    })

    const frameDistribution =
      recording.deltaTicks.length > 0
        ? {
            min: Math.min(...recording.deltaTicks),
            max: Math.max(...recording.deltaTicks),
            avg:
              recording.deltaTicks.reduce((sum, delta) => sum + delta, 0) /
              recording.deltaTicks.length,
          }
        : { min: 0, max: 0, avg: 0 }

    return {
      eventCount: recording.events.length,
      tickCount: recording.totalTicks,
      duration: recording.deltaTicks.length,
      eventTypes,
      frameDistribution,
      eventDensity: recording.events.length / Math.max(recording.totalTicks, 1),
    }
  }

  static generateChecksum(recording: GameRecording): string {
    // Simple checksum for recording integrity
    const data = JSON.stringify({
      seed: recording.seed,
      eventCount: recording.events.length,
      totalTicks: recording.totalTicks,
      deltaSum: recording.deltaTicks.reduce((sum, delta) => sum + delta, 0),
    })

    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return hash.toString(16)
  }

  static detectPotentialIssues(recording: GameRecording): string[] {
    const issues: string[] = []

    // Check for unusually high event density
    const eventDensity =
      recording.events.length / Math.max(recording.totalTicks, 1)
    if (eventDensity > 10) {
      issues.push(
        `High event density: ${eventDensity.toFixed(2)} events per frame`,
      )
    }

    // Check for very large or very small delta frames
    const largeDelta = recording.deltaTicks.find((delta) => delta > 60)
    if (largeDelta) {
      issues.push(`Large delta frame detected: ${largeDelta}`)
    }

    const smallDelta = recording.deltaTicks.find((delta) => delta < 0.01)
    if (smallDelta) {
      issues.push(`Very small delta frame detected: ${smallDelta}`)
    }

    // Check for events with frame 0
    const frameZeroEvents = recording.events.filter((event) => event.tick === 0)
    if (frameZeroEvents.length > 0) {
      issues.push(`${frameZeroEvents.length} events at frame 0`)
    }

    // Check for long recordings
    if (recording.totalTicks > 100000) {
      issues.push(`Very long recording: ${recording.totalTicks} frames`)
    }

    // Check for many events
    if (recording.events.length > 10000) {
      issues.push(`Many events: ${recording.events.length}`)
    }

    return issues
  }
}
