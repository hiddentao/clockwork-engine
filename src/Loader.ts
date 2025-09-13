/**
 * Abstract base class for data loading
 * Provides a flexible interface for loading data from different sources
 */
export abstract class Loader {
  /**
   * Fetch data by ID from the configured source
   * @param id - The identifier for the data to fetch
   * @param meta - Optional metadata object containing additional properties like type
   * @returns Promise that resolves to the data as a string
   */
  abstract fetchData(id: string, meta?: Record<string, any>): Promise<string>
}
