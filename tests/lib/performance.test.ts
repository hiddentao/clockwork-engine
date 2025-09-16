import { beforeEach, describe, expect, it, mock } from "bun:test"
import {
  measureTime,
  measureTimeAsync,
  measureTimeWithResult,
  measureTimeWithResultAsync,
} from "../../src/lib/performance"

describe("Performance Utilities", () => {
  let consoleSpy: any

  beforeEach(() => {
    consoleSpy = mock(() => {
      // Mock console.log for testing
    })
    console.log = consoleSpy
  })

  describe("measureTime", () => {
    it("should measure execution time of synchronous function", () => {
      const result = measureTime("test operation", () => {
        // Simulate some work
        let sum = 0
        for (let i = 0; i < 1000; i++) {
          sum += i
        }
        return sum
      })

      expect(result).toBe(499500) // Sum of 0 to 999
      expect(consoleSpy).toHaveBeenCalledTimes(1)
      expect(consoleSpy.mock.calls[0][0]).toMatch(
        /\[test operation\] Time elapsed: \d+\.\d{3}ms/,
      )
    })

    it("should measure time even when function throws error", () => {
      expect(() => {
        measureTime("error operation", () => {
          throw new Error("Test error")
        })
      }).toThrow("Test error")

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      expect(consoleSpy.mock.calls[0][0]).toMatch(
        /\[error operation\] Time elapsed \(with error\): \d+\.\d{3}ms/,
      )
    })

    it("should return the exact result of the callback", () => {
      const testObject = { value: 42, name: "test" }
      const result = measureTime("object return", () => testObject)

      expect(result).toBe(testObject)
      expect(result).toEqual({ value: 42, name: "test" })
    })

    it("should handle functions that return undefined", () => {
      const result = measureTime("void function", () => {
        // Function that returns undefined
      })

      expect(result).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })

    it("should handle functions that return null", () => {
      const result = measureTime("null function", () => null)

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe("measureTimeAsync", () => {
    it("should measure execution time of async function", async () => {
      const result = await measureTimeAsync("async test", async () => {
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 10))
        return "async result"
      })

      expect(result).toBe("async result")
      expect(consoleSpy).toHaveBeenCalledTimes(1)
      expect(consoleSpy.mock.calls[0][0]).toMatch(
        /\[async test\] Time elapsed: \d+\.\d{3}ms/,
      )
    })

    it("should measure time even when async function throws error", async () => {
      try {
        await measureTimeAsync("async error", async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          throw new Error("Async error")
        })
        expect(false).toBe(true) // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe("Async error")
      }

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      expect(consoleSpy.mock.calls[0][0]).toMatch(
        /\[async error\] Time elapsed \(with error\): \d+\.\d{3}ms/,
      )
    })

    it("should handle async functions that return promises", async () => {
      const result = await measureTimeAsync("promise return", async () => {
        return Promise.resolve(123)
      })

      expect(result).toBe(123)
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe("measureTimeWithResult", () => {
    it("should return result and timing information", () => {
      const outcome = measureTimeWithResult("detailed test", () => {
        return "test result"
      })

      expect(outcome).toMatchObject({
        result: "test result",
        label: "detailed test",
      })
      expect(typeof outcome.elapsed).toBe("number")
      expect(outcome.elapsed).toBeGreaterThanOrEqual(0)
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })

    it("should use custom logger when provided", () => {
      const loggedMessages: string[] = []
      const customLogger = (message: string) => {
        loggedMessages.push(message)
      }

      const outcome = measureTimeWithResult(
        "custom log test",
        () => {
          return "logged result"
        },
        customLogger,
      )

      expect(outcome.result).toBe("logged result")
      expect(loggedMessages).toHaveLength(1)
      expect(loggedMessages[0]).toMatch(
        /\[custom log test\] Time elapsed: \d+\.\d{3}ms/,
      )
      expect(consoleSpy).toHaveBeenCalledTimes(0) // Should not use console.log
    })

    it("should handle errors and still return timing info", () => {
      const loggedMessages: string[] = []
      const customLogger = (message: string) => {
        loggedMessages.push(message)
      }

      expect(() => {
        measureTimeWithResult(
          "error with result",
          () => {
            throw new Error("Test error with result")
          },
          customLogger,
        )
      }).toThrow("Test error with result")

      expect(loggedMessages).toHaveLength(1)
      expect(loggedMessages[0]).toMatch(
        /\[error with result\] Time elapsed \(with error\): \d+\.\d{3}ms/,
      )
    })
  })

  describe("measureTimeWithResultAsync", () => {
    it("should return result and timing information for async operations", async () => {
      const outcome = await measureTimeWithResultAsync(
        "async detailed test",
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          return "async test result"
        },
      )

      expect(outcome).toMatchObject({
        result: "async test result",
        label: "async detailed test",
      })
      expect(typeof outcome.elapsed).toBe("number")
      expect(outcome.elapsed).toBeGreaterThanOrEqual(0)
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })

    it("should use custom logger for async operations", async () => {
      const loggedMessages: string[] = []
      const customLogger = (message: string) => {
        loggedMessages.push(message)
      }

      const outcome = await measureTimeWithResultAsync(
        "async custom log",
        async () => {
          return "async logged result"
        },
        customLogger,
      )

      expect(outcome.result).toBe("async logged result")
      expect(loggedMessages).toHaveLength(1)
      expect(loggedMessages[0]).toMatch(
        /\[async custom log\] Time elapsed: \d+\.\d{3}ms/,
      )
      expect(consoleSpy).toHaveBeenCalledTimes(0)
    })

    it("should handle async errors and still log timing", async () => {
      const loggedMessages: string[] = []
      const customLogger = (message: string) => {
        loggedMessages.push(message)
      }

      try {
        await measureTimeWithResultAsync(
          "async error with result",
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 5))
            throw new Error("Async error with result")
          },
          customLogger,
        )
        expect(false).toBe(true) // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe("Async error with result")
      }

      expect(loggedMessages).toHaveLength(1)
      expect(loggedMessages[0]).toMatch(
        /\[async error with result\] Time elapsed \(with error\): \d+\.\d{3}ms/,
      )
    })
  })

  describe("Performance characteristics", () => {
    it("should have minimal overhead for measureTime", () => {
      const iterations = 1000

      // Measure the overhead of the timing function itself
      const startTime = performance.now()
      for (let i = 0; i < iterations; i++) {
        measureTime("overhead test", () => i * 2)
      }
      const endTime = performance.now()

      const totalTime = endTime - startTime
      const avgTimePerCall = totalTime / iterations

      // The overhead should be very small (less than 1ms per call on average)
      expect(avgTimePerCall).toBeLessThan(1)
      expect(consoleSpy).toHaveBeenCalledTimes(iterations)
    })

    it("should accurately measure different execution times", () => {
      // Test with a function that takes a predictable amount of time
      const outcome1 = measureTimeWithResult("quick operation", () => {
        let sum = 0
        for (let i = 0; i < 100; i++) {
          sum += i
        }
        return sum
      })

      const outcome2 = measureTimeWithResult("slower operation", () => {
        let sum = 0
        for (let i = 0; i < 10000; i++) {
          sum += i
        }
        return sum
      })

      // The slower operation should take more time
      expect(outcome2.elapsed).toBeGreaterThan(outcome1.elapsed)
      expect(outcome1.result).toBe(4950) // Sum of 0 to 99
      expect(outcome2.result).toBe(49995000) // Sum of 0 to 9999
    })
  })
})
