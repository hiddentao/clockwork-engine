/**
 * Web Input Layer
 *
 * DOM-based input implementation wrapping pointer and keyboard events.
 */

import type {
  AudioLayer,
  InputEvent,
  InputLayer,
  KeyboardInputEvent,
} from "@clockwork-engine/core"
import { EventCallbackManager } from "@clockwork-engine/core"

export class WebInputLayer implements InputLayer {
  private pointerDownCallbacks = new EventCallbackManager<InputEvent>()
  private pointerUpCallbacks = new EventCallbackManager<InputEvent>()
  private pointerMoveCallbacks = new EventCallbackManager<InputEvent>()
  private clickCallbacks = new EventCallbackManager<InputEvent>()
  private keyDownCallbacks = new EventCallbackManager<KeyboardInputEvent>()
  private keyUpCallbacks = new EventCallbackManager<KeyboardInputEvent>()

  private boundPointerDownHandler: (e: MouseEvent) => void
  private boundPointerUpHandler: (e: MouseEvent) => void
  private boundPointerMoveHandler: (e: MouseEvent) => void
  private boundClickHandler: (e: MouseEvent) => void
  private boundKeyDownHandler: (e: KeyboardEvent) => void
  private boundKeyUpHandler: (e: KeyboardEvent) => void

  constructor(
    private readonly container: HTMLElement,
    private readonly audioLayer?: AudioLayer,
  ) {
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

  onKeyDown(callback: (event: KeyboardInputEvent) => void): void {
    this.keyDownCallbacks.register(callback)
  }

  onKeyUp(callback: (event: KeyboardInputEvent) => void): void {
    this.keyUpCallbacks.register(callback)
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

    this.pointerDownCallbacks.clear()
    this.pointerUpCallbacks.clear()
    this.pointerMoveCallbacks.clear()
    this.clickCallbacks.clear()
    this.keyDownCallbacks.clear()
    this.keyUpCallbacks.clear()
  }

  private handlePointerDown(e: MouseEvent): void {
    const event = this.normalizePointerEvent(e)
    this.pointerDownCallbacks.trigger(event)
  }

  private handlePointerUp(e: MouseEvent): void {
    const event = this.normalizePointerEvent(e)
    this.pointerUpCallbacks.trigger(event)
  }

  private handlePointerMove(e: MouseEvent): void {
    const event = this.normalizePointerEvent(e)
    this.pointerMoveCallbacks.trigger(event)
  }

  private handleClick(e: MouseEvent): void {
    this.audioLayer?.tryResumeOnce()
    const event = this.normalizePointerEvent(e)
    this.clickCallbacks.trigger(event)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.audioLayer?.tryResumeOnce()
    const event: KeyboardInputEvent = {
      key: e.key,
      code: e.code,
      timestamp: Date.now(),
    }
    this.keyDownCallbacks.trigger(event)
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const event: KeyboardInputEvent = {
      key: e.key,
      code: e.code,
      timestamp: Date.now(),
    }
    this.keyUpCallbacks.trigger(event)
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
