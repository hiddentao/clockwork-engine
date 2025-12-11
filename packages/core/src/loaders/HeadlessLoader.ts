import { type FetchDataOptions, Loader } from "../Loader"

/**
 * Headless loader wrapper that returns empty strings for non-essential data.
 * For data marked as requiredForReplay, forwards the request to the wrapped loader.
 *
 * Use cases:
 * - Server-side replay validation (loads only replay-essential data)
 * - Automated testing with minimal asset dependencies
 * - CI/CD environments where only critical assets are needed
 */
export class HeadlessLoader extends Loader {
  private wrappedLoader: Loader

  constructor(loader: Loader) {
    super()
    this.wrappedLoader = loader
  }

  /**
   * Fetch data by ID.
   * Returns empty string for non-essential data, forwards to wrapped loader for replay-essential data.
   *
   * @param id - The identifier for the data to fetch
   * @param options - Options including requiredForValidation flag
   * @returns Promise that resolves to the data or empty string
   */
  async fetchData(id: string, options?: FetchDataOptions): Promise<string> {
    if (options?.requiredForValidation) {
      return this.wrappedLoader.fetchData(id, options)
    }
    return ""
  }
}
