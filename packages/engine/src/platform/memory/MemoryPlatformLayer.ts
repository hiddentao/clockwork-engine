/**
 * Memory Platform Layer
 *
 * Complete headless platform implementation for testing and replay validation.
 * Composes rendering, audio, and input layers without browser dependencies.
 */

import type { PlatformLayer } from "../PlatformLayer"
import { MemoryAudioLayer } from "./MemoryAudioLayer"
import { MemoryInputLayer } from "./MemoryInputLayer"
import { MemoryRenderingLayer } from "./MemoryRenderingLayer"

export class MemoryPlatformLayer implements PlatformLayer {
  rendering: MemoryRenderingLayer
  audio: MemoryAudioLayer
  input: MemoryInputLayer

  constructor() {
    this.rendering = new MemoryRenderingLayer()
    this.audio = new MemoryAudioLayer()
    this.input = new MemoryInputLayer()
  }

  getDevicePixelRatio(): number {
    // Always 1 for headless environment
    return 1
  }
}
