/**
 * Internal constants and utilities for the Clockwork engine
 * These are primarily used for converting between different time units
 * and maintaining deterministic behavior with integer-based ticks
 */

/**
 * Multiplier to convert floating-point frame deltas to integer ticks
 * This eliminates floating-point precision issues in recording/replay
 */
export const FRAMES_TO_TICKS_MULTIPLIER = 1000

/**
 * Target ticks per second - calculated from PIXI's target FPS
 * This is the expected number of ticks per second at optimal frame rate
 */
export const TARGET_TPS = 60 * FRAMES_TO_TICKS_MULTIPLIER

/**
 * Converts milliseconds to ticks for deterministic timing
 * @param milliseconds - Time value in milliseconds
 * @returns Equivalent value in ticks
 */
export function millisecondsToTicks(milliseconds: number): number {
  return ~~((milliseconds * TARGET_TPS) / 1000)
}

/**
 * Collision detection constants
 */
export const COLLISION_CONSTANTS = {
  // No constants needed for CollisionGrid - it uses direct coordinate mapping
} as const

/**
 * Timer system constants
 */
export const TIMER_CONSTANTS = {
  /** Maximum iterations to prevent infinite loops in timer execution */
  MAX_ITERATIONS: 1000,
} as const
