import { millisecondsToTicks } from "@hiddentao/clockwork-engine"

export const GAME_CONFIG = {
  GRID_SIZE: 25,
  CELL_SIZE: 24,
  BLOCK_SIZE: 24,
  CANVAS_WIDTH: 600,
  CANVAS_HEIGHT: 600,

  // Game timing (in ticks, converted from milliseconds)
  SNAKE_MOVE_INTERVAL: millisecondsToTicks(100), // 100ms
  WALL_SPAWN_INTERVAL: millisecondsToTicks(500), // 500ms
  APPLE_TIMEOUT: millisecondsToTicks(10000), // 10 seconds

  // Cleanup intervals
  APPLE_CLEANUP_INTERVAL: millisecondsToTicks(500), // 500ms
  DESTROYED_OBJECTS_CLEANUP_INTERVAL: millisecondsToTicks(1000), // 1 second

  // Game rules
  SNAKE_INITIAL_LENGTH: 2,
  TARGET_APPLES: 50,
  WALL_SIZE: 2, // 2x1 blocks

  // Explosion settings
  EXPLOSION_DURATION: millisecondsToTicks(1000), // 1 seconds
  EXPLOSION_PARTICLES: 30,

  // Colors
  COLORS: {
    BACKGROUND: 0x1a1a2e,
    GRID: 0x333366,
    SNAKE_HEAD: 0x00ff00,
    SNAKE_BODY: 0x00cc00,
    APPLE: 0xff0000,
    WALL: 0x666666,
    BOMB: 0xff6600,
    EXPLOSION_START: 0xffff00, // Yellow
    EXPLOSION_MID: 0xff6600, // Orange
    EXPLOSION_END: 0x330000, // Dark red
  },
} as const

export enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
}

export const DIRECTION_VECTORS = {
  [Direction.UP]: { x: 0, y: -1 },
  [Direction.DOWN]: { x: 0, y: 1 },
  [Direction.LEFT]: { x: -1, y: 0 },
  [Direction.RIGHT]: { x: 1, y: 0 },
} as const
