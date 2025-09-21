import type { GameEngine } from "../../src/GameEngine"

export interface StateComparisonOptions {
  tolerance?: number
  ignorePath?: string[]
  path?: string
}

export interface StateComparisonResult {
  equal: boolean
  differences: string[]
  report: string
}

export interface GameStateSnapshot {
  tick: number
  state: string
  seed: string
  objects: Record<string, any[]>
  prngState?: number
}

export class StateComparator {
  static compare(
    state1: any,
    state2: any,
    options: StateComparisonOptions = {},
  ): StateComparisonResult {
    const { tolerance = 0.0001, ignorePath = [], path = "" } = options
    const differences: string[] = []

    // Check if this path should be ignored
    if (ignorePath.some((ignored) => path.startsWith(ignored))) {
      return { equal: true, differences: [], report: "Path ignored" }
    }

    // Handle null/undefined
    if (state1 === null || state1 === undefined) {
      if (state1 !== state2) {
        differences.push(
          `Null/undefined mismatch at ${path}: ${state1} vs ${state2}`,
        )
      }
      return this.formatResult(differences)
    }

    // Handle type differences
    if (typeof state1 !== typeof state2) {
      differences.push(
        `Type mismatch at ${path}: ${typeof state1} vs ${typeof state2}`,
      )
      return this.formatResult(differences)
    }

    // Handle numbers with tolerance
    if (typeof state1 === "number") {
      if (Number.isNaN(state1) && Number.isNaN(state2)) {
        // Both NaN, considered equal
      } else if (Math.abs(state1 - state2) > tolerance) {
        differences.push(
          `Number mismatch at ${path}: ${state1} vs ${state2} (diff: ${Math.abs(state1 - state2)})`,
        )
      }
    }
    // Handle arrays
    else if (Array.isArray(state1)) {
      if (!Array.isArray(state2)) {
        differences.push(`Array type mismatch at ${path}`)
        return this.formatResult(differences)
      }

      if (state1.length !== state2.length) {
        differences.push(
          `Array length mismatch at ${path}: ${state1.length} vs ${state2.length}`,
        )
      }

      const maxLength = Math.max(state1.length, state2.length)
      for (let i = 0; i < maxLength; i++) {
        const result = this.compare(state1[i], state2[i], {
          ...options,
          path: `${path}[${i}]`,
        })
        differences.push(...result.differences)
      }
    }
    // Handle objects
    else if (typeof state1 === "object" && state1 !== null) {
      const keys1 = Object.keys(state1).sort()
      const keys2 = Object.keys(state2).sort()

      // Check for missing/extra keys
      const allKeys = new Set([...keys1, ...keys2])
      for (const key of allKeys) {
        const hasKey1 = key in state1
        const hasKey2 = key in state2

        if (hasKey1 && !hasKey2) {
          differences.push(`Missing key in second object at ${path}.${key}`)
        } else if (!hasKey1 && hasKey2) {
          differences.push(`Extra key in second object at ${path}.${key}`)
        } else if (hasKey1 && hasKey2) {
          const result = this.compare(state1[key], state2[key], {
            ...options,
            path: path ? `${path}.${key}` : key,
          })
          differences.push(...result.differences)
        }
      }
    }
    // Handle primitives
    else if (state1 !== state2) {
      differences.push(`Value mismatch at ${path}: ${state1} vs ${state2}`)
    }

    return this.formatResult(differences)
  }

  private static formatResult(differences: string[]): StateComparisonResult {
    return {
      equal: differences.length === 0,
      differences,
      report:
        differences.length === 0
          ? "States are identical"
          : `Found ${differences.length} differences:\n${differences.join("\n")}`,
    }
  }

  static snapshot(engine: GameEngine): GameStateSnapshot {
    const snapshot: GameStateSnapshot = {
      tick: engine.getTotalTicks(),
      state: engine.getState(),
      seed: engine.getSeed(),
      objects: {},
    }

    // Capture PRNG state
    try {
      snapshot.prngState = engine.getPRNG().random()
    } catch (_e) {
      // PRNG might not be initialized
    }

    // Capture all game objects
    for (const type of engine.getRegisteredTypes()) {
      const group = engine.getGameObjectGroup(type)
      if (!group) continue

      snapshot.objects[type] = group.getAllActive().map((obj) => ({
        id: obj.getId(),
        type: obj.getType(),
        position: { x: obj.getPosition().x, y: obj.getPosition().y },
        velocity: { x: obj.getVelocity().x, y: obj.getVelocity().y },
        size: { x: obj.getSize().x, y: obj.getSize().y },
        rotation: obj.getRotation(),
        health: obj.getHealth(),
        maxHealth: obj.getMaxHealth(),
        destroyed: obj.isDestroyed(),
        // Include serialized state for complete comparison
        serialized: obj.serialize(),
      }))
    }

    return snapshot
  }

  static snapshotDifference(
    snapshot1: GameStateSnapshot,
    snapshot2: GameStateSnapshot,
    options?: StateComparisonOptions,
  ): StateComparisonResult {
    return this.compare(snapshot1, snapshot2, options)
  }

  static logDifferences(result: StateComparisonResult, prefix = ""): void {
    if (result.equal) {
      console.log(`${prefix}States are identical`)
    } else {
      console.error(`${prefix}Found ${result.differences.length} differences:`)
      result.differences.forEach((diff, index) => {
        console.error(`${prefix}  ${index + 1}. ${diff}`)
      })
    }
  }
}
