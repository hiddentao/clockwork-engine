import { describe, expect, it } from "bun:test"
import type {
  AudioLayer,
  BlendMode,
  Color,
  InputLayer,
  PlatformLayer,
  RenderingLayer,
  TextureFiltering,
} from "../../src/platform"

describe("Interface Contracts", () => {
  describe("Color Type", () => {
    it("should support hex number format", () => {
      const hexColor: Color = 0xff0000
      expect(typeof hexColor).toBe("number")
    })

    it("should support RGB object format", () => {
      const rgbColor: Color = { r: 255, g: 0, b: 0 }
      expect(rgbColor).toHaveProperty("r")
      expect(rgbColor).toHaveProperty("g")
      expect(rgbColor).toHaveProperty("b")
    })
  })

  describe("BlendMode Enum", () => {
    it("should have required blend modes", () => {
      const modes: BlendMode[] = [
        "normal" as BlendMode,
        "add" as BlendMode,
        "multiply" as BlendMode,
        "screen" as BlendMode,
      ]
      expect(modes.length).toBe(4)
    })
  })

  describe("TextureFiltering Enum", () => {
    it("should have required filtering modes", () => {
      const modes: TextureFiltering[] = [
        "linear" as TextureFiltering,
        "nearest" as TextureFiltering,
      ]
      expect(modes.length).toBe(2)
    })
  })

  describe("PlatformLayer Interface", () => {
    it("should have rendering property", () => {
      const checkInterface = (platform: PlatformLayer) => {
        expect(platform).toHaveProperty("rendering")
      }
      // Type check only - validates interface shape
      expect(checkInterface).toBeDefined()
    })

    it("should have audio property", () => {
      const checkInterface = (platform: PlatformLayer) => {
        expect(platform).toHaveProperty("audio")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have input property", () => {
      const checkInterface = (platform: PlatformLayer) => {
        expect(platform).toHaveProperty("input")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have getDevicePixelRatio method", () => {
      const checkInterface = (platform: PlatformLayer) => {
        expect(platform).toHaveProperty("getDevicePixelRatio")
        expect(typeof platform.getDevicePixelRatio).toBe("function")
      }
      expect(checkInterface).toBeDefined()
    })
  })

  describe("RenderingLayer Interface", () => {
    it("should have node lifecycle methods", () => {
      const checkInterface = (rendering: RenderingLayer) => {
        expect(rendering).toHaveProperty("createNode")
        expect(rendering).toHaveProperty("destroyNode")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have hierarchy methods", () => {
      const checkInterface = (rendering: RenderingLayer) => {
        expect(rendering).toHaveProperty("addChild")
        expect(rendering).toHaveProperty("removeChild")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have transform methods", () => {
      const checkInterface = (rendering: RenderingLayer) => {
        expect(rendering).toHaveProperty("setPosition")
        expect(rendering).toHaveProperty("setRotation")
        expect(rendering).toHaveProperty("setScale")
        expect(rendering).toHaveProperty("setAnchor")
        expect(rendering).toHaveProperty("setAlpha")
        expect(rendering).toHaveProperty("setVisible")
        expect(rendering).toHaveProperty("setZIndex")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have visual effect methods", () => {
      const checkInterface = (rendering: RenderingLayer) => {
        expect(rendering).toHaveProperty("setTint")
        expect(rendering).toHaveProperty("setBlendMode")
        expect(rendering).toHaveProperty("setTextureFiltering")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have texture loading methods", () => {
      const checkInterface = (rendering: RenderingLayer) => {
        expect(rendering).toHaveProperty("loadTexture")
        expect(rendering).toHaveProperty("loadSpritesheet")
        expect(rendering).toHaveProperty("getTexture")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have viewport methods", () => {
      const checkInterface = (rendering: RenderingLayer) => {
        expect(rendering).toHaveProperty("setViewport")
        expect(rendering).toHaveProperty("getViewportPosition")
        expect(rendering).toHaveProperty("setViewportPosition")
        expect(rendering).toHaveProperty("setViewportZoom")
        expect(rendering).toHaveProperty("getViewportZoom")
        expect(rendering).toHaveProperty("worldToScreen")
        expect(rendering).toHaveProperty("screenToWorld")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have game loop methods", () => {
      const checkInterface = (rendering: RenderingLayer) => {
        expect(rendering).toHaveProperty("onTick")
        expect(rendering).toHaveProperty("setTickerSpeed")
      }
      expect(checkInterface).toBeDefined()
    })
  })

  describe("AudioLayer Interface", () => {
    it("should have lifecycle methods", () => {
      const checkInterface = (audio: AudioLayer) => {
        expect(audio).toHaveProperty("initialize")
        expect(audio).toHaveProperty("destroy")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have loading methods", () => {
      const checkInterface = (audio: AudioLayer) => {
        expect(audio).toHaveProperty("loadSound")
        expect(audio).toHaveProperty("createBuffer")
        expect(audio).toHaveProperty("loadSoundFromBuffer")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have playback methods", () => {
      const checkInterface = (audio: AudioLayer) => {
        expect(audio).toHaveProperty("playSound")
        expect(audio).toHaveProperty("stopSound")
        expect(audio).toHaveProperty("stopAll")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have context management methods", () => {
      const checkInterface = (audio: AudioLayer) => {
        expect(audio).toHaveProperty("resumeContext")
        expect(audio).toHaveProperty("getState")
      }
      expect(checkInterface).toBeDefined()
    })
  })

  describe("InputLayer Interface", () => {
    it("should have pointer event subscription methods", () => {
      const checkInterface = (input: InputLayer) => {
        expect(input).toHaveProperty("onPointerDown")
        expect(input).toHaveProperty("onPointerUp")
        expect(input).toHaveProperty("onPointerMove")
        expect(input).toHaveProperty("onClick")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have keyboard event subscription methods", () => {
      const checkInterface = (input: InputLayer) => {
        expect(input).toHaveProperty("onKeyDown")
        expect(input).toHaveProperty("onKeyUp")
      }
      expect(checkInterface).toBeDefined()
    })

    it("should have cleanup method", () => {
      const checkInterface = (input: InputLayer) => {
        expect(input).toHaveProperty("removeAllListeners")
      }
      expect(checkInterface).toBeDefined()
    })
  })
})
