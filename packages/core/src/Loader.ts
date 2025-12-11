/**
 * Options for fetchData method.
 * @property requiredForValidation - If true, this data is needed for deterministic replay validation
 */
export type FetchDataOptions = {
  requiredForValidation?: boolean
  [key: string]: any
}

/**
 * Abstract base class for data loading.
 * Provides a flexible interface for loading data from different sources.
 *
 * Implementations should return:
 * - Text data (JSON, etc.) as plain strings
 * - Binary data (images, audio) as data URL strings (e.g., "data:image/png;base64,...")
 */
export abstract class Loader {
  /**
   * Fetch data by ID from the configured source.
   *
   * @param id - The identifier for the data to fetch
   * @param options - Optional options including requiredForReplay flag and other properties
   * @returns Promise that resolves to the data as a string.
   *          For binary assets (images, audio), return a data URL string.
   */
  abstract fetchData(id: string, options?: FetchDataOptions): Promise<string>
}
