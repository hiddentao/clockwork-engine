/**
 * Measures the execution time of a callback function using the Performance API
 * @param label - A descriptive label for the measurement
 * @param callback - The function to measure
 * @returns The result of the callback function
 */
export function measureTime<T>(label: string, callback: () => T): T {
  const startTime = performance.now()

  try {
    const result = callback()
    const endTime = performance.now()
    const elapsed = endTime - startTime

    console.log(`[${label}] Time elapsed: ${elapsed.toFixed(3)}ms`)

    return result
  } catch (error) {
    const endTime = performance.now()
    const elapsed = endTime - startTime

    console.log(`[${label}] Time elapsed (with error): ${elapsed.toFixed(3)}ms`)
    throw error
  }
}

/**
 * Async version for measuring asynchronous operations
 * @param label - A descriptive label for the measurement
 * @param callback - The async function to measure
 * @returns The result of the callback function
 */
export async function measureTimeAsync<T>(
  label: string,
  callback: () => Promise<T>,
): Promise<T> {
  const startTime = performance.now()

  try {
    const result = await callback()
    const endTime = performance.now()
    const elapsed = endTime - startTime

    console.log(`[${label}] Time elapsed: ${elapsed.toFixed(3)}ms`)

    return result
  } catch (error) {
    const endTime = performance.now()
    const elapsed = endTime - startTime

    console.log(`[${label}] Time elapsed (with error): ${elapsed.toFixed(3)}ms`)
    throw error
  }
}

/**
 * Advanced timing function that returns both result and timing information
 * @param label - A descriptive label for the measurement
 * @param callback - The function to measure
 * @param logger - Optional custom logging function
 * @returns Object containing the result and timing information
 */
export function measureTimeWithResult<T>(
  label: string,
  callback: () => T,
  logger?: (message: string) => void,
): { result: T; elapsed: number; label: string } {
  const startTime = performance.now()

  try {
    const result = callback()
    const endTime = performance.now()
    const elapsed = endTime - startTime

    const message = `[${label}] Time elapsed: ${elapsed.toFixed(3)}ms`
    if (logger) {
      logger(message)
    } else {
      console.log(message)
    }

    return { result, elapsed, label }
  } catch (error) {
    const endTime = performance.now()
    const elapsed = endTime - startTime

    const message = `[${label}] Time elapsed (with error): ${elapsed.toFixed(3)}ms`
    if (logger) {
      logger(message)
    } else {
      console.log(message)
    }

    throw error
  }
}

/**
 * Async version of measureTimeWithResult
 * @param label - A descriptive label for the measurement
 * @param callback - The async function to measure
 * @param logger - Optional custom logging function
 * @returns Object containing the result and timing information
 */
export async function measureTimeWithResultAsync<T>(
  label: string,
  callback: () => Promise<T>,
  logger?: (message: string) => void,
): Promise<{ result: T; elapsed: number; label: string }> {
  const startTime = performance.now()

  try {
    const result = await callback()
    const endTime = performance.now()
    const elapsed = endTime - startTime

    const message = `[${label}] Time elapsed: ${elapsed.toFixed(3)}ms`
    if (logger) {
      logger(message)
    } else {
      console.log(message)
    }

    return { result, elapsed, label }
  } catch (error) {
    const endTime = performance.now()
    const elapsed = endTime - startTime

    const message = `[${label}] Time elapsed (with error): ${elapsed.toFixed(3)}ms`
    if (logger) {
      logger(message)
    } else {
      console.log(message)
    }

    throw error
  }
}
