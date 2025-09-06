import { beforeEach, describe, expect, it } from "bun:test"
import { PRNG } from "../../src/PRNG"

describe("PRNG", () => {
  let prng: PRNG

  beforeEach(() => {
    prng = new PRNG()
  })

  describe("Initialization", () => {
    it("should initialize with default seed", () => {
      expect(prng).toBeDefined()
    })

    it("should initialize with custom seed", () => {
      const customPrng = new PRNG("custom-seed")
      expect(customPrng).toBeDefined()
    })

    it("should accept initialize method", () => {
      prng.initialize("test-seed")
      expect(prng).toBeDefined()
    })

    it("should handle empty seed", () => {
      prng.initialize("")
      const value = prng.random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    })

    it("should handle undefined seed", () => {
      try {
        prng.initialize(undefined as any)
        const value = prng.random()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      } catch (error) {
        // It's acceptable if undefined seed throws an error
        expect(error).toBeDefined()
      }
    })
  })

  describe("Determinism", () => {
    it("should produce identical sequences with same seed", () => {
      const seed = "deterministic-test"

      const prng1 = new PRNG(seed)
      const prng2 = new PRNG(seed)

      const sequence1: number[] = []
      const sequence2: number[] = []

      for (let i = 0; i < 100; i++) {
        sequence1.push(prng1.random())
        sequence2.push(prng2.random())
      }

      expect(sequence1).toEqual(sequence2)
    })

    it("should produce different sequences with different seeds", () => {
      const prng1 = new PRNG("seed1")
      const prng2 = new PRNG("seed2")

      const sequence1: number[] = []
      const sequence2: number[] = []

      for (let i = 0; i < 50; i++) {
        sequence1.push(prng1.random())
        sequence2.push(prng2.random())
      }

      expect(sequence1).not.toEqual(sequence2)
    })

    it("should be repeatable after reinitialization", () => {
      const seed = "repeatable-test"

      prng.initialize(seed)
      const firstSequence: number[] = []
      for (let i = 0; i < 20; i++) {
        firstSequence.push(prng.random())
      }

      prng.initialize(seed)
      const secondSequence: number[] = []
      for (let i = 0; i < 20; i++) {
        secondSequence.push(prng.random())
      }

      expect(firstSequence).toEqual(secondSequence)
    })

    it("should handle numeric seeds consistently", () => {
      const prng1 = new PRNG("123")
      const prng2 = new PRNG("123")

      expect(prng1.random()).toBe(prng2.random())
      expect(prng1.random()).toBe(prng2.random())
      expect(prng1.random()).toBe(prng2.random())
    })

    it("should handle long string seeds", () => {
      const longSeed =
        "this-is-a-very-long-seed-string-that-should-still-work-correctly-" +
        "x".repeat(1000)

      const prng1 = new PRNG(longSeed)
      const prng2 = new PRNG(longSeed)

      for (let i = 0; i < 10; i++) {
        expect(prng1.random()).toBe(prng2.random())
      }
    })
  })

  describe("random()", () => {
    beforeEach(() => {
      prng.initialize("test-random")
    })

    it("should return values in range [0, 1)", () => {
      for (let i = 0; i < 1000; i++) {
        const value = prng.random()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    })

    it("should produce values that appear random", () => {
      const values: number[] = []
      for (let i = 0; i < 100; i++) {
        values.push(prng.random())
      }

      // Check that we don't get too many identical values
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).toBeGreaterThan(80) // At least 80% unique

      // Check distribution (rough test)
      const lowValues = values.filter((v) => v < 0.5).length
      const highValues = values.filter((v) => v >= 0.5).length

      // Should be roughly balanced (allow for some variance)
      expect(Math.abs(lowValues - highValues)).toBeLessThan(30)
    })

    it("should never return exactly 1.0", () => {
      for (let i = 0; i < 10000; i++) {
        const value = prng.random()
        expect(value).not.toBe(1.0)
      }
    })

    it("should produce reasonable distribution across buckets", () => {
      const buckets = new Array(10).fill(0)

      for (let i = 0; i < 10000; i++) {
        const value = prng.random()
        const bucket = Math.floor(value * 10)
        buckets[bucket]++
      }

      // Each bucket should have roughly 1000 values (±300 for variance)
      buckets.forEach((count) => {
        expect(count).toBeGreaterThan(700)
        expect(count).toBeLessThan(1300)
      })
    })
  })

  describe("randomInt()", () => {
    beforeEach(() => {
      prng.initialize("test-int")
    })

    it("should return integers in specified range", () => {
      for (let i = 0; i < 1000; i++) {
        const value = prng.randomInt(5, 15)
        expect(Number.isInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(5)
        expect(value).toBeLessThanOrEqual(15)
      }
    })

    it("should handle range from 0 to max", () => {
      for (let i = 0; i < 100; i++) {
        const value = prng.randomInt(0, 10)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(10)
        expect(Number.isInteger(value)).toBe(true)
      }
    })

    it("should handle min === max", () => {
      for (let i = 0; i < 10; i++) {
        const value = prng.randomInt(7, 7)
        expect(value).toBe(7)
      }
    })

    it("should handle negative ranges", () => {
      for (let i = 0; i < 100; i++) {
        const value = prng.randomInt(-10, -5)
        expect(value).toBeGreaterThanOrEqual(-10)
        expect(value).toBeLessThanOrEqual(-5)
        expect(Number.isInteger(value)).toBe(true)
      }
    })

    it("should handle range crossing zero", () => {
      for (let i = 0; i < 100; i++) {
        const value = prng.randomInt(-5, 5)
        expect(value).toBeGreaterThanOrEqual(-5)
        expect(value).toBeLessThanOrEqual(5)
        expect(Number.isInteger(value)).toBe(true)
      }
    })

    it("should distribute values evenly", () => {
      const counts = new Map<number, number>()
      const min = 0
      const max = 4

      for (let i = 0; i < 5000; i++) {
        const value = prng.randomInt(min, max)
        counts.set(value, (counts.get(value) || 0) + 1)
      }

      // Should hit all values in range
      for (let i = min; i <= max; i++) {
        expect(counts.has(i)).toBe(true)
        expect(counts.get(i)!).toBeGreaterThan(800) // Roughly 1000 each ±200
      }
    })

    it("should handle large ranges", () => {
      const value = prng.randomInt(0, 1000000)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1000000)
      expect(Number.isInteger(value)).toBe(true)
    })

    it("should handle reversed range gracefully", () => {
      // The current implementation doesn't validate range order
      const value = prng.randomInt(10, 5)
      expect(typeof value).toBe("number")
      expect(Number.isInteger(value)).toBe(true)
    })
  })

  describe("randomFloat()", () => {
    beforeEach(() => {
      prng.initialize("test-float")
    })

    it("should return floats in specified range", () => {
      for (let i = 0; i < 1000; i++) {
        const value = prng.randomFloat(2.5, 7.8)
        expect(value).toBeGreaterThanOrEqual(2.5)
        expect(value).toBeLessThan(7.8)
        expect(typeof value).toBe("number")
      }
    })

    it("should handle range from 0 to max", () => {
      for (let i = 0; i < 100; i++) {
        const value = prng.randomFloat(0, 5.5)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(5.5)
      }
    })

    it("should handle min === max", () => {
      const value = prng.randomFloat(3.14, 3.14)
      expect(value).toBe(3.14)
    })

    it("should handle very small ranges", () => {
      for (let i = 0; i < 100; i++) {
        const value = prng.randomFloat(1.0, 1.001)
        expect(value).toBeGreaterThanOrEqual(1.0)
        expect(value).toBeLessThan(1.001)
      }
    })

    it("should handle negative ranges", () => {
      for (let i = 0; i < 100; i++) {
        const value = prng.randomFloat(-5.5, -1.2)
        expect(value).toBeGreaterThanOrEqual(-5.5)
        expect(value).toBeLessThan(-1.2)
      }
    })

    it("should handle reversed range gracefully", () => {
      // The current implementation doesn't validate range order
      const value = prng.randomFloat(10.5, 5.2)
      expect(typeof value).toBe("number")
    })
  })

  describe("randomChoice()", () => {
    beforeEach(() => {
      prng.initialize("test-choice")
    })

    it("should return element from array", () => {
      const array = ["a", "b", "c", "d", "e"]

      for (let i = 0; i < 100; i++) {
        const choice = prng.randomChoice(array)
        expect(array).toContain(choice)
      }
    })

    it("should handle single element array", () => {
      const array = ["only"]

      for (let i = 0; i < 10; i++) {
        const choice = prng.randomChoice(array)
        expect(choice).toBe("only")
      }
    })

    it("should handle different data types", () => {
      const numbers = [1, 2, 3, 4, 5]
      const objects = [{ id: 1 }, { id: 2 }, { id: 3 }]

      for (let i = 0; i < 50; i++) {
        const numberChoice = prng.randomChoice(numbers)
        expect(numbers).toContain(numberChoice)

        const objectChoice = prng.randomChoice(objects)
        expect(objects).toContain(objectChoice)
      }
    })

    it("should distribute choices relatively evenly", () => {
      const array = ["A", "B", "C", "D", "E"]
      const counts = new Map<string, number>()

      for (let i = 0; i < 5000; i++) {
        const choice = prng.randomChoice(array)
        counts.set(choice, (counts.get(choice) || 0) + 1)
      }

      // Each choice should appear roughly 1000 times (±300)
      array.forEach((item) => {
        expect(counts.has(item)).toBe(true)
        expect(counts.get(item)!).toBeGreaterThan(700)
        expect(counts.get(item)!).toBeLessThan(1300)
      })
    })

    it("should throw error for empty array", () => {
      expect(() => prng.randomChoice([])).toThrow()
    })

    it("should not modify original array", () => {
      const original = ["a", "b", "c"]
      const copy = [...original]

      for (let i = 0; i < 10; i++) {
        prng.randomChoice(original)
      }

      expect(original).toEqual(copy)
    })
  })

  describe("randomBoolean()", () => {
    beforeEach(() => {
      prng.initialize("test-boolean")
    })

    it("should return boolean values", () => {
      for (let i = 0; i < 100; i++) {
        const value = prng.randomBoolean()
        expect(typeof value).toBe("boolean")
      }
    })

    it("should return roughly balanced true/false values", () => {
      let trueCount = 0
      let falseCount = 0

      for (let i = 0; i < 1000; i++) {
        if (prng.randomBoolean()) {
          trueCount++
        } else {
          falseCount++
        }
      }

      // Should be roughly balanced (allow for variance)
      expect(trueCount).toBeGreaterThan(300)
      expect(trueCount).toBeLessThan(700)
      expect(falseCount).toBeGreaterThan(300)
      expect(falseCount).toBeLessThan(700)
      expect(trueCount + falseCount).toBe(1000)
    })

    it("should be deterministic with same seed", () => {
      const prng1 = new PRNG("boolean-deterministic")
      const prng2 = new PRNG("boolean-deterministic")

      for (let i = 0; i < 20; i++) {
        expect(prng1.randomBoolean()).toBe(prng2.randomBoolean())
      }
    })
  })

  describe("Performance", () => {
    beforeEach(() => {
      prng.initialize("performance-test")
    })

    it("should generate random numbers quickly", () => {
      const startTime = performance.now()

      for (let i = 0; i < 100000; i++) {
        prng.random()
      }

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in less than 1 second
    })

    it("should generate random integers quickly", () => {
      const startTime = performance.now()

      for (let i = 0; i < 50000; i++) {
        prng.randomInt(0, 1000)
      }

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(500)
    })

    it("should generate random choices from large arrays efficiently", () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i)

      const startTime = performance.now()
      for (let i = 0; i < 1000; i++) {
        prng.randomChoice(largeArray)
      }
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe("Edge Cases", () => {
    it("should handle very long seeds", () => {
      const longSeed = "x".repeat(100000)
      const prng1 = new PRNG(longSeed)
      const prng2 = new PRNG(longSeed)

      expect(prng1.random()).toBe(prng2.random())
    })

    it("should handle special character seeds", () => {
      const specialSeed = "!@#$%^&*()_+-=[]{}|;':\",./<>?"
      const prng1 = new PRNG(specialSeed)
      const prng2 = new PRNG(specialSeed)

      for (let i = 0; i < 5; i++) {
        expect(prng1.random()).toBe(prng2.random())
      }
    })

    it("should handle Unicode seeds", () => {
      const unicodeSeed = "测试种子🎲🎯🎪"
      const prng1 = new PRNG(unicodeSeed)
      const prng2 = new PRNG(unicodeSeed)

      expect(prng1.random()).toBe(prng2.random())
    })

    it("should handle extreme integer ranges", () => {
      const min = -1000000
      const max = 1000000

      for (let i = 0; i < 100; i++) {
        const value = prng.randomInt(min, max)
        expect(value).toBeGreaterThanOrEqual(min)
        expect(value).toBeLessThanOrEqual(max)
        expect(Number.isInteger(value)).toBe(true)
      }
    })

    it("should handle very small float ranges", () => {
      const min = 0.9999999
      const max = 1.0000001

      for (let i = 0; i < 100; i++) {
        const value = prng.randomFloat(min, max)
        expect(value).toBeGreaterThanOrEqual(min)
        expect(value).toBeLessThan(max)
      }
    })

    it("should maintain state consistency after many operations", () => {
      const seed = "consistency-test"
      const prng1 = new PRNG(seed)
      const prng2 = new PRNG(seed)

      // Perform many different operations
      for (let i = 0; i < 1000; i++) {
        expect(prng1.random()).toBe(prng2.random())

        if (i % 10 === 0) {
          expect(prng1.randomInt(0, 100)).toBe(prng2.randomInt(0, 100))
        }

        if (i % 20 === 0) {
          const arr = ["a", "b", "c", "d"]
          expect(prng1.randomChoice(arr)).toBe(prng2.randomChoice(arr))
        }
      }
    })
  })

  describe("Statistical Quality", () => {
    beforeEach(() => {
      prng.initialize("stats-test")
    })

    it("should pass basic chi-square test for uniformity", () => {
      const buckets = 10
      const trials = 10000
      const expected = trials / buckets
      const counts = new Array(buckets).fill(0)

      for (let i = 0; i < trials; i++) {
        const bucket = Math.floor(prng.random() * buckets)
        counts[bucket]++
      }

      // Calculate chi-square statistic
      let chiSquare = 0
      for (const count of counts) {
        chiSquare += Math.pow(count - expected, 2) / expected
      }

      // For 9 degrees of freedom, critical value at 95% confidence is ~16.9
      expect(chiSquare).toBeLessThan(20) // Allow some variance
    })

    it("should not show obvious patterns in bit distribution", () => {
      const values: number[] = []

      for (let i = 0; i < 1000; i++) {
        values.push(prng.random())
      }

      // Check that we don't have obvious patterns like all values > 0.8
      const veryHigh = values.filter((v) => v > 0.9).length
      const veryLow = values.filter((v) => v < 0.1).length

      expect(veryHigh).toBeLessThan(150) // Should be roughly 100 ±50
      expect(veryLow).toBeLessThan(150)
      expect(veryHigh).toBeGreaterThan(50)
      expect(veryLow).toBeGreaterThan(50)
    })
  })
})
