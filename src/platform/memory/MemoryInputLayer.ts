/**
 * Memory Input Layer
 *
 * Headless input implementation for testing and replay.
 * Provides manual event triggering for test scenarios.
 */

import type { InputEvent, InputLayer, KeyboardInputEvent } from "../InputLayer"
import { EventCallbackManager } from "../utils/EventCallbackManager"

export class MemoryInputLayer implements InputLayer {
  private pointerDownCallbacks = new EventCallbackManager<InputEvent>()
  private pointerUpCallbacks = new EventCallbackManager<InputEvent>()
  private pointerMoveCallbacks = new EventCallbackManager<InputEvent>()
  private clickCallbacks = new EventCallbackManager<InputEvent>()
  private keyDownCallbacks = new EventCallbackManager<KeyboardInputEvent>()
  private keyUpCallbacks = new EventCallbackManager<KeyboardInputEvent>()

  // Pointer event subscription
  onPointerDown(callback: (event: InputEvent) => void): void {
    this.pointerDownCallbacks.register(callback)
  }

  onPointerUp(callback: (event: InputEvent) => void): void {
    this.pointerUpCallbacks.register(callback)
  }

  onPointerMove(callback: (event: InputEvent) => void): void {
    this.pointerMoveCallbacks.register(callback)
  }

  onClick(callback: (event: InputEvent) => void): void {
    this.clickCallbacks.register(callback)
  }

  // Keyboard event subscription
  onKeyDown(callback: (event: KeyboardInputEvent) => void): void {
    this.keyDownCallbacks.register(callback)
  }

  onKeyUp(callback: (event: KeyboardInputEvent) => void): void {
    this.keyUpCallbacks.register(callback)
  }

  // Cleanup
  removeAllListeners(): void {
    this.pointerDownCallbacks.clear()
    this.pointerUpCallbacks.clear()
    this.pointerMoveCallbacks.clear()
    this.clickCallbacks.clear()
    this.keyDownCallbacks.clear()
    this.keyUpCallbacks.clear()
  }

  // Manual event triggering for testing
  triggerPointerDown(event: InputEvent): void {
    this.pointerDownCallbacks.trigger(event)
  }

  triggerPointerUp(event: InputEvent): void {
    this.pointerUpCallbacks.trigger(event)
  }

  triggerPointerMove(event: InputEvent): void {
    this.pointerMoveCallbacks.trigger(event)
  }

  triggerClick(event: InputEvent): void {
    this.clickCallbacks.trigger(event)
  }

  triggerKeyDown(event: KeyboardInputEvent): void {
    this.keyDownCallbacks.trigger(event)
  }

  triggerKeyUp(event: KeyboardInputEvent): void {
    this.keyUpCallbacks.trigger(event)
  }
}
