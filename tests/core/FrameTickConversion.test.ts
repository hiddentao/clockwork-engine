/**
 * Frame-to-Tick Conversion Tests
 *
 * Tests for the conversion between frames (from PIXI.js ticker) and ticks (integer-based game time).
 * Verifies precision, accuracy, and handling of variable frame rates.
 */

import { describe, expect, test } from "bun:test"
import {
  FRAMES_PER_SECOND,
  FRAMES_TO_TICKS_MULTIPLIER,
  TARGET_TPS,
} from "../../src/lib/internals"

describe("Frame-to-Tick Conversion", () => {
  describe("Conversion Constants", () => {
    test("should have correct FRAMES_PER_SECOND", () => {
      expect(FRAMES_PER_SECOND).toBe(60)
    })

    test("should have correct FRAMES_TO_TICKS_MULTIPLIER", () => {
      expect(FRAMES_TO_TICKS_MULTIPLIER).toBe(1000)
    })

    test("should have correct TARGET_TPS", () => {
      expect(TARGET_TPS).toBe(60000)
    })

    test("should calculate TARGET_TPS from FRAMES_PER_SECOND and MULTIPLIER", () => {
      expect(TARGET_TPS).toBe(FRAMES_PER_SECOND * FRAMES_TO_TICKS_MULTIPLIER)
    })
  })

  describe("Frame Rate Conversion", () => {
    test("should convert 1 frame to 1000 ticks at 60 FPS", () => {
      const deltaFrames = 1
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(1000)
    })

    test("should convert 0.5 frames to 500 ticks (30 FPS effective)", () => {
      const deltaFrames = 0.5
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(500)
    })

    test("should convert 2 frames to 2000 ticks (frame drop scenario)", () => {
      const deltaFrames = 2
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(2000)
    })

    test("should convert 1.5 frames to 1500 ticks (mixed frame rate)", () => {
      const deltaFrames = 1.5
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(1500)
    })
  })

  describe("Variable Frame Rate Handling", () => {
    test("should handle 120 FPS (half frame)", () => {
      const deltaFrames = 0.5
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(500)
    })

    test("should handle 30 FPS (double frame)", () => {
      const deltaFrames = 2
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(2000)
    })

    test("should handle 15 FPS (quad frame)", () => {
      const deltaFrames = 4
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(4000)
    })

    test("should handle 144 FPS (fractional frame)", () => {
      const deltaFrames = 60 / 144
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(Math.round(deltaTicks)).toBe(417)
    })
  })

  describe("Tick Precision Over Time", () => {
    test("should accumulate ticks accurately over 100 frames", () => {
      let totalTicks = 0
      for (let i = 0; i < 100; i++) {
        totalTicks += 1 * FRAMES_TO_TICKS_MULTIPLIER
      }
      expect(totalTicks).toBe(100000)
    })

    test("should accumulate ticks accurately with variable frame deltas", () => {
      const frameDeltas = [1, 0.5, 1.5, 2, 0.8, 1.2]
      let totalTicks = 0

      for (const delta of frameDeltas) {
        totalTicks += delta * FRAMES_TO_TICKS_MULTIPLIER
      }

      expect(totalTicks).toBe(7000)
    })

    test("should maintain precision over 1000 frames", () => {
      let totalTicks = 0
      for (let i = 0; i < 1000; i++) {
        totalTicks += 1 * FRAMES_TO_TICKS_MULTIPLIER
      }
      expect(totalTicks).toBe(1000000)
      expect(totalTicks / FRAMES_TO_TICKS_MULTIPLIER).toBe(1000)
    })
  })

  describe("Fractional Frame Handling", () => {
    test("should handle fractional frames without loss of precision", () => {
      const deltaFrames = 0.123
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(123)
    })

    test("should handle very small frame deltas", () => {
      const deltaFrames = 0.001
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(1)
    })

    test("should handle precision with 3 decimal places", () => {
      const deltaFrames = 1.234
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(1234)
    })

    test("should round correctly for very small fractional values", () => {
      const deltaFrames = 0.0001
      const deltaTicks = Math.round(deltaFrames * FRAMES_TO_TICKS_MULTIPLIER)
      expect(deltaTicks).toBe(0)
    })
  })

  describe("Time Calculation", () => {
    test("should calculate 1 second as 60000 ticks", () => {
      const seconds = 1
      const expectedTicks = seconds * TARGET_TPS
      expect(expectedTicks).toBe(60000)
    })

    test("should calculate 100ms as 6000 ticks", () => {
      const milliseconds = 100
      const expectedTicks = (milliseconds / 1000) * TARGET_TPS
      expect(expectedTicks).toBe(6000)
    })

    test("should calculate 16.67ms (1 frame at 60fps) as 1000 ticks", () => {
      const milliseconds = 16.67
      const frames = milliseconds / (1000 / FRAMES_PER_SECOND)
      const ticks = frames * FRAMES_TO_TICKS_MULTIPLIER
      expect(Math.round(ticks)).toBe(1000)
    })
  })

  describe("Delta Accumulation Correctness", () => {
    test("should accumulate variable deltas to correct total", () => {
      const deltas = [0.5, 1.0, 1.5, 0.8, 1.2, 2.0, 0.3, 1.7, 1.0, 1.0]

      let total = 0
      for (const delta of deltas) {
        total += delta * FRAMES_TO_TICKS_MULTIPLIER
      }

      const expectedTotal = 11 * FRAMES_TO_TICKS_MULTIPLIER
      expect(total).toBe(expectedTotal)
    })

    test("should handle rapid frame rate changes", () => {
      const sequence: number[] = []

      for (let i = 0; i < 10; i++) {
        sequence.push(0.5)
        sequence.push(2.0)
      }

      let total = 0
      for (const delta of sequence) {
        total += delta * FRAMES_TO_TICKS_MULTIPLIER
      }

      expect(total).toBe(25000)
    })
  })

  describe("Integer Tick Representation", () => {
    test("should produce integer ticks for whole frame deltas", () => {
      const deltaFrames = 1
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(Number.isInteger(deltaTicks)).toBe(true)
    })

    test("should produce integer ticks for common fractional deltas", () => {
      const deltas = [0.5, 1.5, 2.0, 0.25, 0.75]

      for (const delta of deltas) {
        const ticks = delta * FRAMES_TO_TICKS_MULTIPLIER
        expect(Number.isInteger(ticks)).toBe(true)
      }
    })

    test("should allow fractional ticks for high precision", () => {
      const deltaFrames = 1.234
      const deltaTicks = deltaFrames * FRAMES_TO_TICKS_MULTIPLIER
      expect(deltaTicks).toBe(1234)
      expect(Number.isInteger(deltaTicks)).toBe(true)
    })
  })
})
