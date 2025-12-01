import { type FetchDataOptions, Loader } from "@hiddentao/clockwork-engine"

/**
 * Demo implementation of the Loader interface
 * Provides in-memory data storage for game configurations, levels, and assets
 */
export class DemoLoader extends Loader {
  private data: Map<string, any> = new Map()

  constructor() {
    super()
    this.initializeDefaultData()
  }

  /**
   * Initialize default game data
   */
  private initializeDefaultData(): void {
    // Game configuration data
    this.data.set(
      "config:game",
      JSON.stringify({
        gridSize: 20,
        snakeMoveInterval: 8,
        wallSpawnInterval: 180,
        targetApples: 10,
        appleTimeout: 300,
        cellSize: 30,
        colors: {
          background: 0x1a1a2e,
          snake: 0x16a085,
          apple: 0xe74c3c,
          wall: 0x95a5a6,
        },
      }),
    )
  }

  /**
   * Fetch data by ID from the in-memory store
   * @param id - The identifier for the data to fetch
   * @param options - Optional options containing type and other properties
   * @returns Promise that resolves to the data as a string
   */
  async fetchData(id: string, options?: FetchDataOptions): Promise<string> {
    // Simulate network delay
    await this.simulateAsyncDelay()

    const type = options?.type || "unknown"
    const key = `${type}:${id}`

    if (this.data.has(key)) {
      return this.data.get(key)!
    }

    // Check if key exists without type prefix
    if (this.data.has(id)) {
      return this.data.get(id)!
    }

    throw new Error(`Data not found for id: ${id} (type: ${type})`)
  }

  /**
   * Store data in the loader (useful for save games, user preferences, etc.)
   * @param id - The identifier for the data
   * @param data - The data to store as a string
   * @param options - Optional options containing type and other properties
   */
  async storeData(
    id: string,
    data: string,
    options?: FetchDataOptions,
  ): Promise<void> {
    await this.simulateAsyncDelay()

    const type = options?.type || "unknown"
    const key = `${type}:${id}`

    this.data.set(key, data)
  }

  /**
   * Check if data exists for the given id
   * @param id - The identifier to check
   * @param options - Optional options containing type and other properties
   */
  async hasData(id: string, options?: FetchDataOptions): Promise<boolean> {
    const type = options?.type || "unknown"
    const key = `${type}:${id}`

    return this.data.has(key) || this.data.has(id)
  }

  /**
   * Get all available data keys for a given type
   * @param type - The type of data to list
   */
  async listDataKeys(type?: string): Promise<string[]> {
    if (!type) {
      return Array.from(this.data.keys())
    }

    return Array.from(this.data.keys())
      .filter((key) => key.startsWith(`${type}:`))
      .map((key) => key.substring(type.length + 1))
  }

  /**
   * Clear all data from the loader
   */
  clearData(): void {
    this.data.clear()
    this.initializeDefaultData()
  }

  /**
   * Simulate async delay to mimic real network/file operations
   */
  private async simulateAsyncDelay(): Promise<void> {
    const delay = Math.random() * 50 + 10 // 10-60ms delay
    return new Promise((resolve) => setTimeout(resolve, delay))
  }

  /**
   * Get the raw data map for testing purposes
   */
  public getDataMap(): Map<string, any> {
    return new Map(this.data)
  }
}
