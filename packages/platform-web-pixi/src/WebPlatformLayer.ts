/**
 * Web Platform Layer
 *
 * Browser-based platform implementation composing Web-specific layers.
 */

import type { PlatformLayer, ViewportOptions } from "@clockwork-engine/core"
import { PixiRenderingLayer } from "./PixiRenderingLayer"
import { WebAudioLayer } from "./WebAudioLayer"
import { WebInputLayer } from "./WebInputLayer"

export interface WebPlatformOptions extends ViewportOptions {
  backgroundColor?: number
}

export class WebPlatformLayer implements PlatformLayer {
  rendering: PixiRenderingLayer
  audio: WebAudioLayer
  input: WebInputLayer
  private canvas: HTMLCanvasElement

  constructor(container: HTMLDivElement, options: WebPlatformOptions) {
    this.canvas = document.createElement("canvas")
    this.canvas.width = options.screenWidth
    this.canvas.height = options.screenHeight
    container.appendChild(this.canvas)

    this.rendering = new PixiRenderingLayer(this.canvas, options)
    this.audio = new WebAudioLayer()
    this.input = new WebInputLayer(container, this.audio)
  }

  async init(): Promise<void> {
    await this.rendering.init()
    await this.audio.initialize()
  }

  destroy(): void {
    this.rendering.destroy()
    this.audio.destroy()
    this.input.removeAllListeners()

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
  }

  getDevicePixelRatio(): number {
    return window.devicePixelRatio || 1
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }
}
