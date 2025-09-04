export const GAME_CONFIG = {
  GRID_SIZE: 25,
  CELL_SIZE: 24,
  BLOCK_SIZE: 24,
  CANVAS_WIDTH: 600,
  CANVAS_HEIGHT: 600,

  // Game timing (in frames at 50 FPS)
  SNAKE_MOVE_INTERVAL: 10, // Move every 10 frames (0.2 seconds)
  WALL_SPAWN_INTERVAL: 250, // Spawn wall every 250 frames (5 seconds)
  APPLE_TIMEOUT: 500, // Apple disappears after 500 frames (10 seconds)

  // Game rules
  SNAKE_INITIAL_LENGTH: 2,
  TARGET_APPLES: 50,
  WALL_SIZE: 2, // 2x1 blocks

  // Colors
  COLORS: {
    BACKGROUND: 0x1a1a2e,
    GRID: 0x16213e,
    SNAKE_HEAD: 0x0f3460,
    SNAKE_BODY: 0x16537e,
    APPLE: 0xe94560,
    WALL: 0x533483,
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
