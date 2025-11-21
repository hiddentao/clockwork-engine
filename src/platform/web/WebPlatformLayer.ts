/**
 * Web Platform Layer
 *
 * Browser-based platform implementation composing Web-specific layers.
 */

import type { PlatformLayer } from "../PlatformLayer"
import type { ViewportOptions } from "../RenderingLayer"
import { PixiRenderingLayer } from "./PixiRenderingLayer"
import { WebAudioLayer } from "./WebAudioLayer"
import { WebInputLayer } from "./WebInputLayer"

export class WebPlatformLayer implements PlatformLayer {
  rendering: PixiRenderingLayer
  audio: WebAudioLayer
  input: WebInputLayer

  constructor(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    viewportOptions: ViewportOptions,
  ) {
    this.rendering = new PixiRenderingLayer(canvas, viewportOptions)
    this.audio = new WebAudioLayer()
    this.input = new WebInputLayer(container)
  }

  async init(): Promise<void> {
    await this.rendering.init()
    await this.audio.initialize()
  }

  destroy(): void {
    this.rendering.destroy()
    this.audio.destroy()
    this.input.removeAllListeners()
  }

  getDevicePixelRatio(): number {
    return window.devicePixelRatio || 1
  }
}
