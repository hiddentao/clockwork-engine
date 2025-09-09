export class EventEmitter<T extends Record<string, (...args: any[]) => void>> {
  protected listeners: { [K in keyof T]?: Set<T[K]> } = {}

  on<K extends keyof T>(event: K, callback: T[K]): void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set()
    }
    this.listeners[event]?.add(callback)
  }

  off<K extends keyof T>(event: K, callback: T[K]): void {
    this.listeners[event]?.delete(callback)
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    this.listeners[event]?.forEach((callback) => callback(...args))
  }

  clearListeners(): void {
    for (const key in this.listeners) {
      if (this.listeners[key]) {
        this.listeners[key]?.clear()
      }
    }
  }
}
