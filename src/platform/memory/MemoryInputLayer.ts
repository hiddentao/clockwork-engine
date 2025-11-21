/**
 * Memory Input Layer
 *
 * Headless input implementation for testing and replay.
 * Provides manual event triggering for test scenarios.
 */

import type { InputEvent, InputLayer, KeyboardInputEvent } from "../InputLayer"

type InputCallback = (event: InputEvent) => void
type KeyboardCallback = (event: KeyboardInputEvent) => void

export class MemoryInputLayer implements InputLayer {
  private pointerDownCallbacks: InputCallback[] = []
  private pointerUpCallbacks: InputCallback[] = []
  private pointerMoveCallbacks: InputCallback[] = []
  private clickCallbacks: InputCallback[] = []
  private keyDownCallbacks: KeyboardCallback[] = []
  private keyUpCallbacks: KeyboardCallback[] = []

  // Pointer event subscription
  onPointerDown(callback: InputCallback): void {
    this.pointerDownCallbacks.push(callback)
  }

  onPointerUp(callback: InputCallback): void {
    this.pointerUpCallbacks.push(callback)
  }

  onPointerMove(callback: InputCallback): void {
    this.pointerMoveCallbacks.push(callback)
  }

  onClick(callback: InputCallback): void {
    this.clickCallbacks.push(callback)
  }

  // Keyboard event subscription
  onKeyDown(callback: KeyboardCallback): void {
    this.keyDownCallbacks.push(callback)
  }

  onKeyUp(callback: KeyboardCallback): void {
    this.keyUpCallbacks.push(callback)
  }

  // Cleanup
  removeAllListeners(): void {
    this.pointerDownCallbacks = []
    this.pointerUpCallbacks = []
    this.pointerMoveCallbacks = []
    this.clickCallbacks = []
    this.keyDownCallbacks = []
    this.keyUpCallbacks = []
  }

  // Manual event triggering for testing
  triggerPointerDown(event: InputEvent): void {
    for (const callback of this.pointerDownCallbacks) {
      callback(event)
    }
  }

  triggerPointerUp(event: InputEvent): void {
    for (const callback of this.pointerUpCallbacks) {
      callback(event)
    }
  }

  triggerPointerMove(event: InputEvent): void {
    for (const callback of this.pointerMoveCallbacks) {
      callback(event)
    }
  }

  triggerClick(event: InputEvent): void {
    for (const callback of this.clickCallbacks) {
      callback(event)
    }
  }

  triggerKeyDown(event: KeyboardInputEvent): void {
    for (const callback of this.keyDownCallbacks) {
      callback(event)
    }
  }

  triggerKeyUp(event: KeyboardInputEvent): void {
    for (const callback of this.keyUpCallbacks) {
      callback(event)
    }
  }
}
