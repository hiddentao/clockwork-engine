/**
 * Event Callback Manager
 *
 * Utility class for managing event callbacks with type safety.
 * Eliminates duplicate callback array management across platform layers.
 */

export class EventCallbackManager<T> {
  private callbacks: Array<(event: T) => void> = []

  /**
   * Register a new event callback
   */
  register(callback: (event: T) => void): void {
    if (!this.callbacks.includes(callback)) {
      this.callbacks.push(callback)
    }
  }

  /**
   * Trigger all registered callbacks with an event
   */
  trigger(event: T): void {
    for (const callback of this.callbacks) {
      callback(event)
    }
  }

  /**
   * Clear all registered callbacks
   */
  clear(): void {
    this.callbacks = []
  }

  /**
   * Get the number of registered callbacks
   */
  get count(): number {
    return this.callbacks.length
  }
}
