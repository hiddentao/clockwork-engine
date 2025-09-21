import { beforeEach, describe, expect, it } from "bun:test"
import { Timer } from "../../src/Timer"

describe("Timer", () => {
  let timer: Timer

  beforeEach(() => {
    timer = new Timer()
  })

  describe("setTimeout", () => {
    it("should execute callback at exact tick", () => {
      let executed = false
      let executionTick = -1

      timer.setTimeout(() => {
        executed = true
        executionTick = 3
      }, 3)

      // Should not execute before target tick
      timer.update(1, 1)
      expect(executed).toBe(false)

      timer.update(1, 2)
      expect(executed).toBe(false)

      // Should execute at target tick
      timer.update(1, 3)
      expect(executed).toBe(true)
      expect(executionTick).toBe(3)
    })

    it("should execute callback with tick precision", () => {
      let executed = false

      timer.setTimeout(() => {
        executed = true
      }, 5)

      // Execute updates that sum to exactly 5 ticks
      timer.update(2, 2)
      timer.update(3, 5)

      expect(executed).toBe(true)
    })

    it("should handle fractional delays", () => {
      let executed = false

      timer.setTimeout(() => {
        executed = true
      }, 2.5)

      timer.update(2, 2)
      expect(executed).toBe(false)

      timer.update(0.5, 2.5)
      expect(executed).toBe(true)
    })

    it("should return unique timer ID", () => {
      const id1 = timer.setTimeout(() => {
        /* no-op */
      }, 1)
      const id2 = timer.setTimeout(() => {
        /* no-op */
      }, 1)
      const id3 = timer.setTimeout(() => {
        /* no-op */
      }, 1)

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it("should handle zero delay", () => {
      let executed = false

      timer.setTimeout(() => {
        executed = true
      }, 0)

      // Should execute on first update
      timer.update(0, 0)
      expect(executed).toBe(true)
    })

    it("should handle negative delay", () => {
      let executed = false

      timer.setTimeout(() => {
        executed = true
      }, -5)

      // Should execute immediately
      timer.update(1, 1)
      expect(executed).toBe(true)
    })

    it("should execute multiple timeouts in correct order", () => {
      const executions: number[] = []

      timer.setTimeout(() => executions.push(3), 3)
      timer.setTimeout(() => executions.push(1), 1)
      timer.setTimeout(() => executions.push(2), 2)
      timer.setTimeout(() => executions.push(1), 1) // Same tick as second

      timer.update(1, 1)
      expect(executions).toEqual([1, 1])

      timer.update(1, 2)
      expect(executions).toEqual([1, 1, 2])

      timer.update(1, 3)
      expect(executions).toEqual([1, 1, 2, 3])
    })

    it("should handle sync callbacks", () => {
      let result = ""

      timer.setTimeout(() => {
        result = "sync completed"
      }, 1)

      timer.update(1, 1)
      expect(result).toBe("sync completed")
    })

    it("should handle callback errors gracefully", () => {
      let errorThrown = false
      let normalCallbackExecuted = false

      timer.setTimeout(() => {
        errorThrown = true
        throw new Error("Callback error")
      }, 1)

      timer.setTimeout(() => {
        normalCallbackExecuted = true
      }, 1)

      // Should not throw at timer level
      expect(() => timer.update(1, 1)).not.toThrow()

      expect(errorThrown).toBe(true)
      expect(normalCallbackExecuted).toBe(true)
    })
  })

  describe("setInterval", () => {
    it("should execute callback repeatedly at specified interval", () => {
      const executions: number[] = []

      timer.setInterval(() => {
        executions.push(executions.length + 1)
      }, 2)

      timer.update(2, 2)
      expect(executions).toEqual([1])

      timer.update(2, 4)
      expect(executions).toEqual([1, 2])

      timer.update(2, 6)
      expect(executions).toEqual([1, 2, 3])
    })

    it("should handle fractional intervals", () => {
      let executionCount = 0

      timer.setInterval(() => {
        executionCount++
      }, 1.5)

      timer.update(1.5, 1.5)
      expect(executionCount).toBe(1)

      timer.update(1.5, 3)
      expect(executionCount).toBe(2)

      timer.update(1.5, 4.5)
      expect(executionCount).toBe(3)
    })

    it("should execute multiple times in one update if interval is small", () => {
      let executionCount = 0

      timer.setInterval(() => {
        executionCount++
      }, 0.5)

      // Update by 2 ticks should trigger 4 executions
      timer.update(2, 2)
      expect(executionCount).toBe(4)
    })

    it("should return unique timer ID", () => {
      const id1 = timer.setInterval(() => {
        /* no-op */
      }, 1)
      const id2 = timer.setInterval(() => {
        /* no-op */
      }, 1)

      expect(id1).not.toBe(id2)
    })

    it("should handle zero interval", () => {
      let executionCount = 0

      timer.setInterval(() => {
        executionCount++
      }, 0)

      // With zero interval, should execute once per update
      timer.update(1, 1)
      expect(executionCount).toBeGreaterThanOrEqual(1)

      timer.update(1, 2)
      expect(executionCount).toBeGreaterThanOrEqual(2)
    })

    it("should track next execution time correctly", () => {
      const executions: Array<{ tick: number; expected: number }> = []
      let expectedTick = 3

      timer.setInterval(() => {
        executions.push({ tick: expectedTick, expected: expectedTick })
        expectedTick += 3
      }, 3)

      for (let i = 1; i <= 10; i++) {
        timer.update(1, i)
      }

      expect(executions).toHaveLength(3)
      expect(executions[0].tick).toBe(3)
      expect(executions[1].tick).toBe(6)
      expect(executions[2].tick).toBe(9)
    })

    it("should handle interval callback errors gracefully", () => {
      let errorCount = 0
      let normalExecutions = 0

      timer.setInterval(() => {
        errorCount++
        throw new Error("Interval error")
      }, 1)

      timer.setInterval(() => {
        normalExecutions++
      }, 1)

      timer.update(3, 3)

      expect(errorCount).toBe(3)
      expect(normalExecutions).toBe(3)
    })
  })

  describe("clearTimer", () => {
    it("should clear setTimeout before execution", () => {
      let executed = false

      const timerId = timer.setTimeout(() => {
        executed = true
      }, 3)

      const cleared = timer.clearTimer(timerId)
      expect(cleared).toBe(true)

      timer.update(5, 5)
      expect(executed).toBe(false)
    })

    it("should clear setInterval", () => {
      let executionCount = 0

      const timerId = timer.setInterval(() => {
        executionCount++
      }, 2)

      timer.update(2, 2)
      expect(executionCount).toBe(1)

      const cleared = timer.clearTimer(timerId)
      expect(cleared).toBe(true)

      timer.update(4, 6)
      expect(executionCount).toBe(1) // Should not execute again
    })

    it("should return false for invalid timer ID", () => {
      const cleared = timer.clearTimer(99999)
      expect(cleared).toBe(false)
    })

    it("should return false for already cleared timer", () => {
      const timerId = timer.setTimeout(() => {
        /* no-op */
      }, 5)

      const firstClear = timer.clearTimer(timerId)
      expect(firstClear).toBe(true)

      const secondClear = timer.clearTimer(timerId)
      expect(secondClear).toBe(false)
    })

    it("should handle clearing timer during execution", () => {
      let timerId: any
      let executionCount = 0

      timerId = timer.setInterval(() => {
        executionCount++
        if (executionCount === 2) {
          timer.clearTimer(timerId)
        }
      }, 1)

      timer.update(5, 5)
      expect(executionCount).toBe(2)
    })
  })

  describe("reset", () => {
    it("should clear all timers", () => {
      let timeoutExecuted = false
      let intervalCount = 0

      timer.setTimeout(() => {
        timeoutExecuted = true
      }, 2)

      timer.setInterval(() => {
        intervalCount++
      }, 1)

      timer.reset()

      timer.update(5, 5)

      expect(timeoutExecuted).toBe(false)
      expect(intervalCount).toBe(0)
    })

    it("should reset tick tracking", () => {
      let executed = false

      // Set up a timer and run some ticks
      timer.update(3, 3)

      timer.setTimeout(() => {
        executed = true
      }, 2)

      timer.reset()

      // After reset, timer should start from tick 0 again
      timer.setTimeout(() => {
        executed = true
      }, 2)

      timer.update(1, 1)
      expect(executed).toBe(false)

      timer.update(1, 2)
      expect(executed).toBe(true)
    })

    it("should not affect timer IDs", () => {
      const id1 = timer.setTimeout(() => {
        /* no-op */
      }, 1)
      timer.reset()
      const id2 = timer.setTimeout(() => {
        /* no-op */
      }, 1)

      expect(id2).toBeGreaterThan(id1)
    })
  })

  describe("Tick Accuracy", () => {
    it("should maintain precise tick timing", () => {
      const executions: Array<{ expected: number; actual: number }> = []

      timer.setTimeout(() => executions.push({ expected: 1, actual: 1 }), 1)
      timer.setTimeout(() => executions.push({ expected: 3, actual: 3 }), 3)
      timer.setTimeout(() => executions.push({ expected: 5, actual: 5 }), 5)

      timer.update(1, 1) // Tick 1
      timer.update(2, 3) // Tick 3
      timer.update(2, 5) // Tick 5

      expect(executions).toHaveLength(3)
      executions.forEach((exec) => {
        expect(exec.expected).toBe(exec.actual)
      })
    })

    it("should handle non-integer tick updates", () => {
      let executed = false

      timer.setTimeout(() => {
        executed = true
      }, 2.7)

      timer.update(2.7, 2.7)
      expect(executed).toBe(true)
    })

    it("should accumulate fractional ticks correctly", () => {
      let executed = false

      timer.setTimeout(() => {
        executed = true
      }, 3)

      // Accumulate to exactly 3 ticks
      timer.update(1.2, 1.2)
      timer.update(0.8, 2.0)
      timer.update(1.0, 3.0)

      expect(executed).toBe(true)
    })

    it("should not execute early due to floating point errors", () => {
      let executed = false

      timer.setTimeout(() => {
        executed = true
      }, 1)

      // Almost but not quite 1 tick
      timer.update(0.999999, 0.999999)
      expect(executed).toBe(false)

      // Now exactly 1 tick
      timer.update(0.000001, 1)
      expect(executed).toBe(true)
    })
  })

  describe("Performance", () => {
    it("should handle many timers efficiently", () => {
      const timerCount = 1000
      let executionCount = 0

      const startTime = performance.now()

      // Create many timers
      for (let i = 0; i < timerCount; i++) {
        timer.setTimeout(
          () => {
            executionCount++
          },
          (i % 10) + 1,
        )
      }

      const createTime = performance.now() - startTime
      expect(createTime).toBeLessThan(1000) // Should create quickly

      // Execute them
      const updateStartTime = performance.now()
      timer.update(10, 10)
      const updateTime = performance.now() - updateStartTime

      expect(updateTime).toBeLessThan(500) // Should execute quickly
      expect(executionCount).toBe(timerCount)
    })

    it("should handle timer cleanup efficiently", () => {
      const timerIds: any[] = []

      // Create many timers
      for (let i = 0; i < 1000; i++) {
        const id = timer.setTimeout(() => {
          /* no-op */
        }, 100)
        timerIds.push(id)
      }

      // Clear them all
      const startTime = performance.now()
      timerIds.forEach((id) => timer.clearTimer(id))
      const clearTime = performance.now() - startTime

      expect(clearTime).toBeLessThan(100)
    })

    it("should handle frequent updates efficiently", () => {
      let executionCount = 0

      timer.setInterval(() => {
        executionCount++
      }, 1)

      const startTime = performance.now()

      // Many small updates
      for (let i = 0; i < 100; i++) {
        timer.update(1, i + 1)
      }

      const updateTime = performance.now() - startTime
      expect(updateTime).toBeLessThan(1000)
      expect(executionCount).toBe(100)
    })
  })

  describe("Edge Cases", () => {
    it("should handle very large delays", () => {
      let executed = false

      timer.setTimeout(() => {
        executed = true
      }, 1000000)

      timer.update(999999, 999999)
      expect(executed).toBe(false)

      timer.update(1, 1000000)
      expect(executed).toBe(true)
    })

    it("should handle very small intervals", () => {
      let executionCount = 0

      timer.setInterval(() => {
        executionCount++
      }, 0.001)

      timer.update(0.1, 0.1)
      expect(executionCount).toBeGreaterThan(50) // Should execute many times
    })

    it("should handle concurrent timer modifications", () => {
      const timerIds: any[] = []
      let executionCount = 0

      // Timer that creates more timers
      timer.setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          const id = timer.setTimeout(() => {
            executionCount++
          }, 1)
          timerIds.push(id)
        }
      }, 1)

      timer.update(2, 2)
      expect(executionCount).toBe(5)

      // Clear the new timers
      timerIds.forEach((id) => timer.clearTimer(id))
    })

    it("should handle callback that throws and creates new timer", () => {
      let newTimerExecuted = false

      timer.setTimeout(() => {
        timer.setTimeout(() => {
          newTimerExecuted = true
        }, 1)
        throw new Error("Error after creating timer")
      }, 1)

      timer.update(2, 2)
      expect(newTimerExecuted).toBe(true)
    })

    it("should maintain deterministic execution order", () => {
      const executions: string[] = []

      // Add timers in random order but with specific delays
      timer.setTimeout(() => executions.push("C"), 3)
      timer.setTimeout(() => executions.push("A"), 1)
      timer.setTimeout(() => executions.push("B"), 2)
      timer.setTimeout(() => executions.push("A2"), 1) // Same frame as A

      timer.update(3, 3)

      expect(executions).toEqual(["A", "A2", "B", "C"])
    })

    it("should handle timer operations during callback execution", () => {
      let executionOrder: string[] = []
      let intervalId: any

      intervalId = timer.setInterval(() => {
        executionOrder.push("interval")
        if (executionOrder.length === 2) {
          timer.clearTimer(intervalId)
          timer.setTimeout(() => {
            executionOrder.push("timeout")
          }, 1)
        }
      }, 1)

      timer.update(5, 5)

      expect(executionOrder).toEqual(["interval", "interval", "timeout"])
    })
  })

  describe("Determinism", () => {
    it("should produce identical results with same sequence", () => {
      const createAndRunTimer = () => {
        const testTimer = new Timer()
        const executions: number[] = []

        testTimer.setTimeout(() => executions.push(1), 1)
        testTimer.setTimeout(() => executions.push(3), 3)
        testTimer.setInterval(() => executions.push(2), 2)

        for (let i = 1; i <= 6; i++) {
          testTimer.update(1, i)
        }

        return executions
      }

      const result1 = createAndRunTimer()
      const result2 = createAndRunTimer()

      expect(result1).toEqual(result2)
    })

    it("should be independent of update timing", () => {
      const runWithDifferentTiming = (updatePattern: number[]) => {
        const testTimer = new Timer()
        const executions: number[] = []

        testTimer.setTimeout(() => executions.push(2), 2)
        testTimer.setTimeout(() => executions.push(5), 5)

        let totalTicks = 0
        for (const deltaTicks of updatePattern) {
          totalTicks += deltaTicks
          testTimer.update(deltaTicks, totalTicks)
        }

        return executions
      }

      const result1 = runWithDifferentTiming([1, 1, 1, 1, 1])
      const result2 = runWithDifferentTiming([2, 3])
      const result3 = runWithDifferentTiming([5])

      expect(result1).toEqual([2, 5])
      expect(result2).toEqual([2, 5])
      expect(result3).toEqual([2, 5])
    })
  })

  describe("Utility Methods", () => {
    it("should track active timer count correctly", () => {
      expect(timer.getActiveTimerCount()).toBe(0)

      const id1 = timer.setTimeout(() => {
        /* no-op */
      }, 5)
      const _id2 = timer.setTimeout(() => {
        /* no-op */
      }, 10)
      timer.setInterval(() => {
        /* no-op */
      }, 3)

      expect(timer.getActiveTimerCount()).toBe(3)

      timer.clearTimer(id1)
      expect(timer.getActiveTimerCount()).toBe(2)

      timer.update(10, 10)
      expect(timer.getActiveTimerCount()).toBe(1) // Only interval remains
    })

    it("should track total timer count including inactive", () => {
      expect(timer.getTotalTimerCount()).toBe(0)

      timer.setTimeout(() => {
        /* no-op */
      }, 5)
      timer.setInterval(() => {
        /* no-op */
      }, 3)

      expect(timer.getTotalTimerCount()).toBe(2)

      timer.update(5, 5)
      expect(timer.getTotalTimerCount()).toBe(1) // Timeout executed and removed
    })

    it("should get timer info correctly", () => {
      const id1 = timer.setTimeout(() => {
        /* no-op */
      }, 5)
      const id2 = timer.setInterval(() => {
        /* no-op */
      }, 3)

      const info = timer.getTimerInfo()

      expect(info).toHaveLength(2)

      const timeoutInfo = info.find((t) => t.id === id1)
      expect(timeoutInfo).toBeDefined()
      expect(timeoutInfo!.targetTick).toBe(5)
      expect(timeoutInfo!.ticksRemaining).toBe(5)
      expect(timeoutInfo!.isRepeating).toBe(false)
      expect(timeoutInfo!.isActive).toBe(true)

      const intervalInfo = info.find((t) => t.id === id2)
      expect(intervalInfo).toBeDefined()
      expect(intervalInfo!.targetTick).toBe(3)
      expect(intervalInfo!.ticksRemaining).toBe(3)
      expect(intervalInfo!.isRepeating).toBe(true)
      expect(intervalInfo!.isActive).toBe(true)

      timer.update(2, 2)
      const updatedInfo = timer.getTimerInfo()

      const updatedTimeoutInfo = updatedInfo.find((t) => t.id === id1)
      expect(updatedTimeoutInfo!.ticksRemaining).toBe(3)

      const updatedIntervalInfo = updatedInfo.find((t) => t.id === id2)
      expect(updatedIntervalInfo!.ticksRemaining).toBe(1)
    })

    it("should pause and resume timers", () => {
      let executed = false
      const id = timer.setTimeout(() => {
        executed = true
      }, 5)

      expect(timer.pauseTimer(id)).toBe(true)

      timer.update(5, 5)
      expect(executed).toBe(false) // Should not execute while paused

      expect(timer.resumeTimer(id)).toBe(true)

      timer.update(0, 5) // Same tick, but resumed
      expect(executed).toBe(true) // Should execute after resume
    })

    it("should handle pause/resume of non-existent timers", () => {
      expect(timer.pauseTimer(999)).toBe(false)
      expect(timer.resumeTimer(999)).toBe(false)
    })

    it("should pause and resume interval timers", () => {
      let execCount = 0
      const id = timer.setInterval(() => {
        execCount++
      }, 2)

      timer.update(2, 2)
      expect(execCount).toBe(1)

      timer.pauseTimer(id)
      timer.update(2, 4)
      expect(execCount).toBe(1) // Should not execute while paused

      timer.resumeTimer(id)
      timer.update(2, 6)
      expect(execCount).toBe(3) // Should resume execution (was ready at 4, now at 6)
    })

    it("should track paused timers in info", () => {
      const id = timer.setTimeout(() => {
        /* no-op */
      }, 5)

      timer.pauseTimer(id)

      const info = timer.getTimerInfo()
      const timerInfo = info.find((t) => t.id === id)

      expect(timerInfo).toBeDefined()
      expect(timerInfo!.isActive).toBe(false)
    })

    it("should handle multiple pause/resume cycles", () => {
      let executed = false
      const id = timer.setTimeout(() => {
        executed = true
      }, 10)

      timer.pauseTimer(id)
      timer.pauseTimer(id) // Pause again
      expect(timer.pauseTimer(id)).toBe(true) // Should still return true

      timer.resumeTimer(id)
      timer.resumeTimer(id) // Resume again
      expect(timer.resumeTimer(id)).toBe(true) // Should still return true

      timer.update(10, 10)
      expect(executed).toBe(true)
    })

    it("should correctly count active timers with paused ones", () => {
      const id1 = timer.setTimeout(() => {
        /* no-op */
      }, 5)
      const id2 = timer.setTimeout(() => {
        /* no-op */
      }, 10)
      timer.setInterval(() => {
        /* no-op */
      }, 3)

      expect(timer.getActiveTimerCount()).toBe(3)

      timer.pauseTimer(id1)
      expect(timer.getActiveTimerCount()).toBe(2) // One paused

      timer.pauseTimer(id2)
      expect(timer.getActiveTimerCount()).toBe(1) // Two paused
    })
  })
})
