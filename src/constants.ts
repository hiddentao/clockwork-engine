/**
 * Constants used throughout the Clockwork engine
 * Centralized to improve maintainability and prevent magic numbers
 */

/**
 * Collision detection constants
 */
export const COLLISION_CONSTANTS = {
  // No constants needed for CollisionGrid - it uses direct coordinate mapping
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
