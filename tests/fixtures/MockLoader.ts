import { Loader } from "../../src/Loader"

/**
 * Mock implementation of Loader for testing purposes
 * Provides controllable behavior for testing different scenarios
 */
export class MockLoader extends Loader {
  private data: Map<string, string> = new Map()
  private failOnIds: Set<string> = new Set()
  private asyncDelay: number = 0
  private fetchCallCount: number = 0
  private storeCallCount: number = 0

  /**
   * Fetch data by ID from the mock store
   * @param id - The identifier for the data to fetch
   * @param meta - Optional metadata containing type and other properties
   * @returns Promise that resolves to the data as a string
   */
  async fetchData(id: string, meta?: Record<string, any>): Promise<string> {
    this.fetchCallCount++

    // Simulate async delay if configured
    if (this.asyncDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.asyncDelay))
    }

    const type = meta?.type || "unknown"
    const key = `${type}:${id}`

    // Check if this ID should fail
    if (this.failOnIds.has(id) || this.failOnIds.has(key)) {
      throw new Error(`Mock error for id: ${id}`)
    }

    // Try with type prefix first
    if (this.data.has(key)) {
      return this.data.get(key)!
    }

    // Fall back to ID without prefix
    if (this.data.has(id)) {
      return this.data.get(id)!
    }

    throw new Error(`Data not found for id: ${id} (type: ${type})`)
  }

  /**
   * Set mock data for a given ID
   * @param id - The identifier
   * @param data - The data to return
   * @param type - Optional type prefix
   */
  setMockData(id: string, data: string, type?: string): void {
    const key = type ? `${type}:${id}` : id
    this.data.set(key, data)
  }

  /**
   * Configure the loader to fail for specific IDs
   * @param ids - Array of IDs that should trigger failures
   */
  setFailureIds(...ids: string[]): void {
    this.failOnIds.clear()
    ids.forEach((id) => this.failOnIds.add(id))
  }

  /**
   * Set artificial async delay for testing timing behavior
   * @param delay - Delay in milliseconds
   */
  setAsyncDelay(delay: number): void {
    this.asyncDelay = delay
  }

  /**
   * Get the number of times fetchData was called
   */
  getFetchCallCount(): number {
    return this.fetchCallCount
  }

  /**
   * Get the number of times storeData was called (if implemented)
   */
  getStoreCallCount(): number {
    return this.storeCallCount
  }

  /**
   * Reset all mock state
   */
  reset(): void {
    this.data.clear()
    this.failOnIds.clear()
    this.asyncDelay = 0
    this.fetchCallCount = 0
    this.storeCallCount = 0
  }

  /**
   * Check if data exists for the given ID (for testing)
   * @param id - The identifier to check
   * @param type - Optional type prefix
   */
  hasMockData(id: string, type?: string): boolean {
    const key = type ? `${type}:${id}` : id
    return this.data.has(key) || this.data.has(id)
  }

  /**
   * Get all mock data keys
   */
  getMockDataKeys(): string[] {
    return Array.from(this.data.keys())
  }

  /**
   * Store data (minimal implementation for testing)
   * @param id - The identifier
   * @param data - The data to store
   * @param type - Optional type prefix
   */
  async storeData(id: string, data: string, type?: string): Promise<void> {
    this.storeCallCount++
    const key = type ? `${type}:${id}` : id
    this.data.set(key, data)
  }
}
