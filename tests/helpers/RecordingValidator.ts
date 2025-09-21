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
        if (typeof event.frame !== "number" || event.frame < 0) {
          errors.push(`Event ${index}: missing or invalid frame number`)
        }
        if (typeof event.timestamp !== "number") {
          errors.push(`Event ${index}: missing or invalid timestamp`)
        }
      })
    }

    if (!Array.isArray(recording.deltaFrames)) {
      errors.push("DeltaFrames is not an array")
    } else {
      // Validate deltaFrames
      recording.deltaFrames.forEach((delta, index) => {
        if (typeof delta !== "number" || delta <= 0) {
          errors.push(`DeltaFrame ${index}: invalid value ${delta}`)
        }
      })
    }

    if (
      typeof recording.totalFrames !== "number" ||
      recording.totalFrames < 0
    ) {
      errors.push("Invalid totalFrames")
    }

    // Cross-validation
    if (recording.events && Array.isArray(recording.events)) {
      // Check events are in chronological order
      let lastFrame = -1
      for (let i = 0; i < recording.events.length; i++) {
        const event = recording.events[i]
        if (event.frame < lastFrame) {
          errors.push(
            `Event ${i} out of chronological order at frame ${event.frame} (previous: ${lastFrame})`,
          )
        }
        lastFrame = event.frame

        // Check event frames don't exceed total frames
        if (event.frame > recording.totalFrames) {
          errors.push(
            `Event ${i} at frame ${event.frame} exceeds totalFrames ${recording.totalFrames}`,
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

    if (recording.deltaFrames && Array.isArray(recording.deltaFrames)) {
      // Validate deltaFrames sum matches totalFrames
      const sumFrames = recording.deltaFrames.reduce(
        (sum, delta) => sum + delta,
        0,
      )
      const tolerance = 0.001
      if (Math.abs(sumFrames - recording.totalFrames) > tolerance) {
        errors.push(
          `DeltaFrames sum (${sumFrames}) doesn't match totalFrames (${recording.totalFrames})`,
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
    ticker.add((deltaFrames) => {
      proxyEngine.update(deltaFrames)
    })

    // Run through all recorded frames
    await ticker.runWithDeltaSequence(recording.deltaFrames)

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
    frameCount: number
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
      recording.deltaFrames.length > 0
        ? {
            min: Math.min(...recording.deltaFrames),
            max: Math.max(...recording.deltaFrames),
            avg:
              recording.deltaFrames.reduce((sum, delta) => sum + delta, 0) /
              recording.deltaFrames.length,
          }
        : { min: 0, max: 0, avg: 0 }

    return {
      eventCount: recording.events.length,
      frameCount: recording.totalFrames,
      duration: recording.deltaFrames.length,
      eventTypes,
      frameDistribution,
      eventDensity:
        recording.events.length / Math.max(recording.totalFrames, 1),
    }
  }

  static generateChecksum(recording: GameRecording): string {
    // Simple checksum for recording integrity
    const data = JSON.stringify({
      seed: recording.seed,
      eventCount: recording.events.length,
      totalFrames: recording.totalFrames,
      deltaSum: recording.deltaFrames.reduce((sum, delta) => sum + delta, 0),
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
      recording.events.length / Math.max(recording.totalFrames, 1)
    if (eventDensity > 10) {
      issues.push(
        `High event density: ${eventDensity.toFixed(2)} events per frame`,
      )
    }

    // Check for very large or very small delta frames
    const largeDelta = recording.deltaFrames.find((delta) => delta > 60)
    if (largeDelta) {
      issues.push(`Large delta frame detected: ${largeDelta}`)
    }

    const smallDelta = recording.deltaFrames.find((delta) => delta < 0.01)
    if (smallDelta) {
      issues.push(`Very small delta frame detected: ${smallDelta}`)
    }

    // Check for events with frame 0
    const frameZeroEvents = recording.events.filter(
      (event) => event.frame === 0,
    )
    if (frameZeroEvents.length > 0) {
      issues.push(`${frameZeroEvents.length} events at frame 0`)
    }

    // Check for long recordings
    if (recording.totalFrames > 100000) {
      issues.push(`Very long recording: ${recording.totalFrames} frames`)
    }

    // Check for many events
    if (recording.events.length > 10000) {
      issues.push(`Many events: ${recording.events.length}`)
    }

    return issues
  }
}
