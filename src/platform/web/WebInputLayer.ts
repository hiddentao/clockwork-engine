/**
 * Web Input Layer
 *
 * DOM-based input implementation wrapping pointer and keyboard events.
 */

import type { InputEvent, InputLayer, KeyboardInputEvent } from "../InputLayer"

export class WebInputLayer implements InputLayer {
  private pointerDownCallbacks: Array<(event: InputEvent) => void> = []
  private pointerUpCallbacks: Array<(event: InputEvent) => void> = []
  private pointerMoveCallbacks: Array<(event: InputEvent) => void> = []
  private clickCallbacks: Array<(event: InputEvent) => void> = []
  private keyDownCallbacks: Array<(event: KeyboardInputEvent) => void> = []
  private keyUpCallbacks: Array<(event: KeyboardInputEvent) => void> = []

  private boundPointerDownHandler: (e: MouseEvent) => void
  private boundPointerUpHandler: (e: MouseEvent) => void
  private boundPointerMoveHandler: (e: MouseEvent) => void
  private boundClickHandler: (e: MouseEvent) => void
  private boundKeyDownHandler: (e: KeyboardEvent) => void
  private boundKeyUpHandler: (e: KeyboardEvent) => void

  constructor(private readonly container: HTMLElement) {
    this.boundPointerDownHandler = this.handlePointerDown.bind(this)
    this.boundPointerUpHandler = this.handlePointerUp.bind(this)
    this.boundPointerMoveHandler = this.handlePointerMove.bind(this)
    this.boundClickHandler = this.handleClick.bind(this)
    this.boundKeyDownHandler = this.handleKeyDown.bind(this)
    this.boundKeyUpHandler = this.handleKeyUp.bind(this)

    container.addEventListener("pointerdown", this.boundPointerDownHandler)
    container.addEventListener("pointerup", this.boundPointerUpHandler)
    container.addEventListener("pointermove", this.boundPointerMoveHandler)
    container.addEventListener("click", this.boundClickHandler)
    window.addEventListener("keydown", this.boundKeyDownHandler)
    window.addEventListener("keyup", this.boundKeyUpHandler)
  }

  onPointerDown(callback: (event: InputEvent) => void): void {
    this.pointerDownCallbacks.push(callback)
  }

  onPointerUp(callback: (event: InputEvent) => void): void {
    this.pointerUpCallbacks.push(callback)
  }

  onPointerMove(callback: (event: InputEvent) => void): void {
    this.pointerMoveCallbacks.push(callback)
  }

  onClick(callback: (event: InputEvent) => void): void {
    this.clickCallbacks.push(callback)
  }

  onKeyDown(callback: (event: KeyboardInputEvent) => void): void {
    this.keyDownCallbacks.push(callback)
  }

  onKeyUp(callback: (event: KeyboardInputEvent) => void): void {
    this.keyUpCallbacks.push(callback)
  }

  removeAllListeners(): void {
    this.container.removeEventListener(
      "pointerdown",
      this.boundPointerDownHandler,
    )
    this.container.removeEventListener("pointerup", this.boundPointerUpHandler)
    this.container.removeEventListener(
      "pointermove",
      this.boundPointerMoveHandler,
    )
    this.container.removeEventListener("click", this.boundClickHandler)
    window.removeEventListener("keydown", this.boundKeyDownHandler)
    window.removeEventListener("keyup", this.boundKeyUpHandler)

    this.pointerDownCallbacks = []
    this.pointerUpCallbacks = []
    this.pointerMoveCallbacks = []
    this.clickCallbacks = []
    this.keyDownCallbacks = []
    this.keyUpCallbacks = []
  }

  private handlePointerDown(e: MouseEvent): void {
    const event = this.normalizePointerEvent(e)
    for (const callback of this.pointerDownCallbacks) {
      callback(event)
    }
  }

  private handlePointerUp(e: MouseEvent): void {
    const event = this.normalizePointerEvent(e)
    for (const callback of this.pointerUpCallbacks) {
      callback(event)
    }
  }

  private handlePointerMove(e: MouseEvent): void {
    const event = this.normalizePointerEvent(e)
    for (const callback of this.pointerMoveCallbacks) {
      callback(event)
    }
  }

  private handleClick(e: MouseEvent): void {
    const event = this.normalizePointerEvent(e)
    for (const callback of this.clickCallbacks) {
      callback(event)
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const event: KeyboardInputEvent = {
      key: e.key,
      code: e.code,
      timestamp: Date.now(),
    }
    for (const callback of this.keyDownCallbacks) {
      callback(event)
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const event: KeyboardInputEvent = {
      key: e.key,
      code: e.code,
      timestamp: Date.now(),
    }
    for (const callback of this.keyUpCallbacks) {
      callback(event)
    }
  }

  private normalizePointerEvent(e: MouseEvent): InputEvent {
    const rect = this.container.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      button: e.button,
      timestamp: Date.now(),
    }
  }
}
