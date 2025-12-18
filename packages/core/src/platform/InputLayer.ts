/**
 * Input Layer Interface
 *
 * Platform-agnostic input abstraction that wraps input systems
 * like DOM events or provides recording-based implementations.
 */

/**
 * Pointer/Mouse input event
 */
export interface InputEvent {
  x: number
  y: number
  button?: number
}

/**
 * Keyboard input event
 */
export interface KeyboardInputEvent {
  key: string
  code: string
}

/**
 * Main input layer interface
 */
export interface InputLayer {
  // Pointer event subscription
  onPointerDown(callback: (event: InputEvent) => void): void
  onPointerUp(callback: (event: InputEvent) => void): void
  onPointerMove(callback: (event: InputEvent) => void): void
  onClick(callback: (event: InputEvent) => void): void

  // Keyboard event subscription
  onKeyDown(callback: (event: KeyboardInputEvent) => void): void
  onKeyUp(callback: (event: KeyboardInputEvent) => void): void

  // Cleanup
  removeAllListeners(): void
}
