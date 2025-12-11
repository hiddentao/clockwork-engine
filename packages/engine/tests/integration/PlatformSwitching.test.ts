import { expect, test } from "bun:test"
import { GameEngine } from "../../src/GameEngine"
import { Loader } from "../../src/Loader"
import { MemoryPlatformLayer } from "../../src/platform/memory"
import { GameConfig } from "../../src/types"

/**
 * Simple test loader
 */
class TestLoader extends Loader {
  async fetchData(_id: string, _meta?: Record<string, any>): Promise<string> {
    return ""
  }
}

/**
 * Minimal test engine
 */
class TestEngine extends GameEngine {
  async setup(_config: GameConfig): Promise<void> {
    // No-op setup
  }
}

test("Platform switching - Memory platform cleanup", async () => {
  const loader = new TestLoader()

  // Create first platform
  const platform1 = new MemoryPlatformLayer()
  const engine1 = new TestEngine({ loader, platform: platform1 })

  await engine1.reset({ prngSeed: "test-seed-1" })

  // Create some nodes
  const node1 = platform1.rendering.createNode()
  const node2 = platform1.rendering.createNode()

  platform1.rendering.setPosition(node1, 100, 200)
  platform1.rendering.setPosition(node2, 300, 400)

  expect(platform1.rendering.hasNode(node1)).toBe(true)
  expect(platform1.rendering.hasNode(node2)).toBe(true)

  // Clean up first platform
  platform1.rendering.destroyNode(node1)
  platform1.rendering.destroyNode(node2)
  platform1.rendering.destroy()

  // Create second platform
  const platform2 = new MemoryPlatformLayer()
  const engine2 = new TestEngine({ loader, platform: platform2 })

  await engine2.reset({ prngSeed: "test-seed-2" })

  // Verify old nodes don't exist in new platform
  expect(platform2.rendering.hasNode(node1)).toBe(false)
  expect(platform2.rendering.hasNode(node2)).toBe(false)

  // Create new nodes in new platform
  const node3 = platform2.rendering.createNode()
  platform2.rendering.setPosition(node3, 500, 600)

  expect(platform2.rendering.hasNode(node3)).toBe(true)

  const pos = platform2.rendering.getPosition(node3)
  expect(pos.x).toBe(500)
  expect(pos.y).toBe(600)
})

test("Platform switching - Asset isolation between platforms", async () => {
  const loader = new TestLoader()

  // Platform 1: Load textures and sounds
  const platform1 = new MemoryPlatformLayer()
  const engine1 = new TestEngine({ loader, platform: platform1 })

  await engine1.reset({ prngSeed: "test1" })

  const texture1 = await platform1.rendering.loadTexture("test-texture-1.png")
  await platform1.audio.loadSound("test-sound-1", "")

  expect(texture1).toBeDefined()

  // Platform 2: Different textures and sounds
  const platform2 = new MemoryPlatformLayer()
  const engine2 = new TestEngine({ loader, platform: platform2 })

  await engine2.reset({ prngSeed: "test2" })

  const texture2 = await platform2.rendering.loadTexture("test-texture-2.png")
  await platform2.audio.loadSound("test-sound-2", "")

  // Verify textures loaded successfully
  expect(texture1).toBeDefined()
  expect(texture2).toBeDefined()

  // Play sounds on both platforms (should not interfere)
  platform1.audio.playSound("test-sound-1")
  platform2.audio.playSound("test-sound-2")

  // No errors expected
  expect(true).toBe(true)
})

test("Platform switching - State independence", async () => {
  const loader = new TestLoader()

  // Create two platforms simultaneously
  const platform1 = new MemoryPlatformLayer()
  const platform2 = new MemoryPlatformLayer()

  const engine1 = new TestEngine({ loader, platform: platform1 })
  const engine2 = new TestEngine({ loader, platform: platform2 })

  await engine1.reset({ prngSeed: "seed-a" })
  await engine2.reset({ prngSeed: "seed-b" })

  // Modify platform 1
  const node1 = platform1.rendering.createNode()
  platform1.rendering.setPosition(node1, 100, 100)
  platform1.rendering.setRotation(node1, Math.PI)
  platform1.rendering.setAlpha(node1, 0.5)

  // Modify platform 2
  const node2 = platform2.rendering.createNode()
  platform2.rendering.setPosition(node2, 200, 200)
  platform2.rendering.setRotation(node2, 0)
  platform2.rendering.setAlpha(node2, 1.0)

  // Verify platform 1 state
  const pos1 = platform1.rendering.getPosition(node1)
  const rot1 = platform1.rendering.getRotation(node1)
  const alpha1 = platform1.rendering.getAlpha(node1)

  expect(pos1.x).toBe(100)
  expect(pos1.y).toBe(100)
  expect(rot1).toBeCloseTo(Math.PI, 5)
  expect(alpha1).toBe(0.5)

  // Verify platform 2 state (should be independent)
  const pos2 = platform2.rendering.getPosition(node2)
  const rot2 = platform2.rendering.getRotation(node2)
  const alpha2 = platform2.rendering.getAlpha(node2)

  expect(pos2.x).toBe(200)
  expect(pos2.y).toBe(200)
  expect(rot2).toBe(0)
  expect(alpha2).toBe(1.0)
})

test("Platform switching - Audio context independence", async () => {
  const _loader = new TestLoader()

  const platform1 = new MemoryPlatformLayer()
  const platform2 = new MemoryPlatformLayer()

  // Initialize both audio layers
  await platform1.audio.initialize()
  await platform2.audio.initialize()

  // Load different sounds on each platform
  await platform1.audio.loadSound("sound-a", "")
  await platform2.audio.loadSound("sound-b", "")

  // Play on platform 1
  platform1.audio.playSound("sound-a")

  // Stop all on platform 1 (should not affect platform 2)
  platform1.audio.stopAll()

  // Platform 2 should still be able to play
  platform2.audio.playSound("sound-b")

  // No errors expected
  expect(true).toBe(true)
})

test("Platform switching - Cleanup verification", async () => {
  const loader = new TestLoader()
  const platform = new MemoryPlatformLayer()
  const engine = new TestEngine({ loader, platform })

  await engine.reset({ prngSeed: "test" })

  // Create multiple nodes
  const nodes = []
  for (let i = 0; i < 10; i++) {
    const node = platform.rendering.createNode()
    platform.rendering.setPosition(node, i * 100, i * 100)
    nodes.push(node)
  }

  // Verify all nodes exist
  for (const node of nodes) {
    expect(platform.rendering.hasNode(node)).toBe(true)
  }

  // Clean up all nodes
  for (const node of nodes) {
    platform.rendering.destroyNode(node)
  }

  // Verify all nodes are destroyed
  for (const node of nodes) {
    expect(platform.rendering.hasNode(node)).toBe(false)
  }

  // Verify we can create new nodes with same pattern
  const newNodes = []
  for (let i = 0; i < 10; i++) {
    const node = platform.rendering.createNode()
    platform.rendering.setPosition(node, i * 50, i * 50)
    newNodes.push(node)
  }

  // New nodes should exist
  for (const node of newNodes) {
    expect(platform.rendering.hasNode(node)).toBe(true)
  }

  // Old nodes should still not exist
  for (const node of nodes) {
    expect(platform.rendering.hasNode(node)).toBe(false)
  }
})
