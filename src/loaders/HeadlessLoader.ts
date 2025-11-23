import { Loader } from "../Loader"

/**
 * Headless loader implementation that returns empty strings for all data.
 * Enables headless replay and testing without requiring actual asset files.
 * Works with MemoryPlatformLayer which handles empty asset data gracefully.
 *
 * Use cases:
 * - Server-side replay validation
 * - Automated testing without asset dependencies
 * - CI/CD environments where assets aren't available
 */
export class HeadlessLoader extends Loader {
  /**
   * Fetch data by ID - always returns empty string for headless operation.
   * MemoryPlatformLayer is designed to handle empty data without errors.
   *
   * @param _id - The identifier for the data (ignored in headless mode)
   * @param _meta - Optional metadata (ignored in headless mode)
   * @returns Promise that resolves to empty string
   */
  async fetchData(_id: string, _meta?: Record<string, any>): Promise<string> {
    return ""
  }
}
