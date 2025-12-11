/**
 * Platform Layer Interface
 *
 * Top-level interface that composes all platform-specific subsystems
 * (rendering, audio, input) and provides device-level capabilities.
 */

import type { AudioLayer } from "./AudioLayer"
import type { InputLayer } from "./InputLayer"
import type { RenderingLayer } from "./RenderingLayer"

/**
 * Main platform layer interface
 */
export interface PlatformLayer {
  /**
   * Rendering subsystem (display, sprites, primitives, viewport)
   */
  rendering: RenderingLayer

  /**
   * Audio subsystem (sound loading, playback, procedural audio)
   */
  audio: AudioLayer

  /**
   * Input subsystem (pointer, keyboard events)
   */
  input: InputLayer

  /**
   * Get device pixel ratio for high-DPI displays
   */
  getDevicePixelRatio(): number
}
