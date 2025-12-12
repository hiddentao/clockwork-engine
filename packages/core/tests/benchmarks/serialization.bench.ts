import { serializer } from "../../src/Serializer"
import { Vector2D } from "../../src/geometry/Vector2D"
import { formatSuite, suite } from "./framework"

/**
 * Benchmark serialization/deserialization performance
 */

// Register Vector2D for serialization
serializer.registerType("Vector2D", Vector2D)

interface ComplexGameState {
  tick: number
  score: number
  players: Array<{
    id: string
    position: Vector2D
    velocity: Vector2D
    health: number
    inventory: string[]
  }>
  enemies: Array<{
    id: string
    position: Vector2D
    type: string
    aiState: Record<string, any>
  }>
  metadata: Record<string, any>
}

function createComplexGameState(
  playerCount: number,
  enemyCount: number,
): ComplexGameState {
  return {
    tick: 12345,
    score: 98765,
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i}`,
      position: new Vector2D(Math.random() * 1000, Math.random() * 1000),
      velocity: new Vector2D(Math.random() * 10, Math.random() * 10),
      health: Math.floor(Math.random() * 100),
      inventory: ["item1", "item2", "item3"],
    })),
    enemies: Array.from({ length: enemyCount }, (_, i) => ({
      id: `enemy-${i}`,
      position: new Vector2D(Math.random() * 1000, Math.random() * 1000),
      type: ["goblin", "orc", "dragon"][Math.floor(Math.random() * 3)],
      aiState: {
        target: "player-0",
        mode: "chase",
        cooldown: Math.random() * 100,
      },
    })),
    metadata: {
      mapName: "test-map",
      difficulty: "hard",
      timestamp: Date.now(),
    },
  }
}

async function runSerializationBenchmarks() {
  const smallState = createComplexGameState(1, 5)
  const mediumState = createComplexGameState(4, 20)
  const largeState = createComplexGameState(10, 100)

  const results = await suite("Serialization Benchmarks", [
    {
      name: "Serialize small state (1 player, 5 enemies)",
      fn: () => {
        serializer.serialize(smallState)
      },
    },
    {
      name: "Deserialize small state",
      fn: () => {
        const serialized = serializer.serialize(smallState)
        serializer.deserialize(serialized)
      },
    },
    {
      name: "Serialize medium state (4 players, 20 enemies)",
      fn: () => {
        serializer.serialize(mediumState)
      },
    },
    {
      name: "Deserialize medium state",
      fn: () => {
        const serialized = serializer.serialize(mediumState)
        serializer.deserialize(serialized)
      },
    },
    {
      name: "Serialize large state (10 players, 100 enemies)",
      fn: () => {
        serializer.serialize(largeState)
      },
    },
    {
      name: "Deserialize large state",
      fn: () => {
        const serialized = serializer.serialize(largeState)
        serializer.deserialize(serialized)
      },
    },
    {
      name: "Round-trip small state",
      fn: () => {
        const serialized = serializer.serialize(smallState)
        serializer.deserialize(serialized)
      },
    },
    {
      name: "Round-trip medium state",
      fn: () => {
        const serialized = serializer.serialize(mediumState)
        serializer.deserialize(serialized)
      },
    },
    {
      name: "Serialize Vector2D array (1000x)",
      fn: () => {
        const vectors = Array.from(
          { length: 1000 },
          () => new Vector2D(Math.random() * 1000, Math.random() * 1000),
        )
        serializer.serialize(vectors)
      },
    },
    {
      name: "Serialize primitive array (1000 numbers)",
      fn: () => {
        const numbers = Array.from({ length: 1000 }, () => Math.random() * 1000)
        serializer.serialize(numbers)
      },
    },
  ])

  console.log(formatSuite(results))
}

// Run if executed directly
if (import.meta.main) {
  runSerializationBenchmarks()
}
