/**
 * Constants used throughout the Clockwork engine
 * Centralized to improve maintainability and prevent magic numbers
 */

/**
 * Collision detection and spatial partitioning constants
 */
export const COLLISION_CONSTANTS = {
  /** Maximum collision points per quadtree node before subdivision */
  MAX_POINTS_PER_NODE: 10,

  /** Maximum depth of quadtree subdivision */
  MAX_TREE_DEPTH: 8,
} as const

/**
 * Replay system constants
 */
export const REPLAY_CONSTANTS = {
  /** Floating point tolerance for deltaFrames comparison during replay */
  FLOATING_POINT_TOLERANCE: 1e-10,
} as const

/**
 * Timer system constants
 */
export const TIMER_CONSTANTS = {
  /** Maximum iterations to prevent infinite loops in timer execution */
  MAX_ITERATIONS: 1000,
} as const
