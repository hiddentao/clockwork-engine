import { beforeEach, describe, expect, it } from "bun:test"
import { PRNG } from "../src/PRNG"

describe("PRNG", () => {
  let prng: PRNG

  beforeEach(() => {
    prng = new PRNG()
  })

  describe("Deterministic behavior", () => {
    it("should produce identical sequences with same seed", () => {
      const seed = "test-seed-123"
      const prng1 = new PRNG(seed)
      const prng2 = new PRNG(seed)

      const sequence1 = Array.from({ length: 10 }, () => prng1.random())
      const sequence2 = Array.from({ length: 10 }, () => prng2.random())

      expect(sequence1).toEqual(sequence2)
    })

    it("should produce different sequences with different seeds", () => {
      const prng1 = new PRNG("seed1")
      const prng2 = new PRNG("seed2")

      const sequence1 = Array.from({ length: 10 }, () => prng1.random())
      const sequence2 = Array.from({ length: 10 }, () => prng2.random())

      expect(sequence1).not.toEqual(sequence2)
    })

    it("should produce same sequence after re-initialization with same seed", () => {
      const seed = "consistent-seed"
      prng.initialize(seed)

      const firstSequence = Array.from({ length: 5 }, () => prng.random())

      prng.initialize(seed)
      const secondSequence = Array.from({ length: 5 }, () => prng.random())

      expect(firstSequence).toEqual(secondSequence)
    })
  })

  describe("Random number generation", () => {
    beforeEach(() => {
      prng.initialize("test")
    })

    it("should generate numbers between 0 and 1", () => {
      for (let i = 0; i < 100; i++) {
        const value = prng.random()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    })

    it("should generate integers within specified range", () => {
      const min = 10
      const max = 20

      for (let i = 0; i < 100; i++) {
        const value = prng.randomInt(min, max)
        expect(value).toBeGreaterThanOrEqual(min)
        expect(value).toBeLessThanOrEqual(max)
        expect(Number.isInteger(value)).toBe(true)
      }
    })

    it("should handle edge cases for randomInt", () => {
      // Single value range
      expect(prng.randomInt(5, 5)).toBe(5)

      // Negative range
      const negValue = prng.randomInt(-10, -5)
      expect(negValue).toBeGreaterThanOrEqual(-10)
      expect(negValue).toBeLessThanOrEqual(-5)
    })

    it("should generate floats within specified range", () => {
      const min = 1.5
      const max = 3.7

      for (let i = 0; i < 100; i++) {
        const value = prng.randomFloat(min, max)
        expect(value).toBeGreaterThanOrEqual(min)
        expect(value).toBeLessThan(max)
      }
    })

    it("should generate boolean values", () => {
      const results = Array.from({ length: 100 }, () => prng.randomBoolean())
      const trueCount = results.filter(Boolean).length
      const falseCount = results.length - trueCount

      // Should have both true and false values (probabilistic test)
      expect(trueCount).toBeGreaterThan(0)
      expect(falseCount).toBeGreaterThan(0)
    })
  })

  describe("Random choice", () => {
    beforeEach(() => {
      prng.initialize("choice-test")
    })

    it("should choose from array elements", () => {
      const choices = ["apple", "banana", "cherry"]

      for (let i = 0; i < 100; i++) {
        const choice = prng.randomChoice(choices)
        expect(choices).toContain(choice)
      }
    })

    it("should handle single element array", () => {
      const choice = prng.randomChoice(["only"])
      expect(choice).toBe("only")
    })

    it("should throw error for empty array", () => {
      expect(() => prng.randomChoice([])).toThrow(
        "Cannot choose from empty array",
      )
    })

    it("should distribute choices evenly over large sample", () => {
      const choices = ["A", "B", "C"]
      const results = Array.from({ length: 3000 }, () =>
        prng.randomChoice(choices),
      )

      const counts = choices.map(
        (choice) => results.filter((result) => result === choice).length,
      )

      // Each choice should appear roughly 1000 times (±200 for randomness)
      counts.forEach((count) => {
        expect(count).toBeGreaterThan(800)
        expect(count).toBeLessThan(1200)
      })
    })
  })

  describe("Seed handling", () => {
    it("should work without initial seed", () => {
      const prng = new PRNG()
      expect(() => prng.random()).not.toThrow()
    })

    it("should accept string seeds", () => {
      const prng = new PRNG("string-seed")
      expect(() => prng.random()).not.toThrow()
    })

    it("should produce different sequences with different seeds", () => {
      const prng1 = new PRNG("seed1")
      const prng2 = new PRNG("seed2")

      // Different seeds should produce different sequences
      const val1 = prng1.random()
      const val2 = prng2.random()

      expect(val1).not.toBe(val2)
    })
  })

  describe("Performance and edge cases", () => {
    it("should handle rapid successive calls", () => {
      prng.initialize("performance-test")

      const start = Date.now()
      for (let i = 0; i < 10000; i++) {
        prng.random()
      }
      const duration = Date.now() - start

      // Should complete 10k calls in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000)
    })

    it("should maintain consistency after many iterations", () => {
      const seed = "consistency-test"
      const prng1 = new PRNG(seed)
      const prng2 = new PRNG(seed)

      // Generate many numbers to test consistency
      for (let i = 0; i < 1000; i++) {
        expect(prng1.random()).toBe(prng2.random())
      }
    })
  })
})
