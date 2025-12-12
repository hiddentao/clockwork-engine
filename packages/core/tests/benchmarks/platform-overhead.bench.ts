import { MemoryPlatformLayer } from "@clockwork-engine/platform-memory"
import type { NodeId } from "../../src/platform"
import { formatSuite, suite } from "./framework"

/**
 * Benchmark platform layer overhead
 * Measures the cost of platform abstraction vs direct operations
 */

async function runPlatformOverheadBenchmarks() {
  const platform = new MemoryPlatformLayer()

  // Pre-create nodes for reuse
  const nodes: NodeId[] = []
  for (let i = 0; i < 1000; i++) {
    nodes.push(platform.rendering.createNode())
  }

  const results = await suite("Platform Overhead Benchmarks", [
    {
      name: "Create node (1000x)",
      fn: () => {
        for (let i = 0; i < 1000; i++) {
          const node = platform.rendering.createNode()
          platform.rendering.destroyNode(node)
        }
      },
    },
    {
      name: "Set position (1000x)",
      fn: () => {
        for (let i = 0; i < nodes.length; i++) {
          platform.rendering.setPosition(
            nodes[i],
            Math.random() * 1000,
            Math.random() * 1000,
          )
        }
      },
    },
    {
      name: "Get position (1000x)",
      fn: () => {
        for (let i = 0; i < nodes.length; i++) {
          platform.rendering.getPosition(nodes[i])
        }
      },
    },
    {
      name: "Set rotation (1000x)",
      fn: () => {
        for (let i = 0; i < nodes.length; i++) {
          platform.rendering.setRotation(nodes[i], Math.random() * Math.PI * 2)
        }
      },
    },
    {
      name: "Set scale (1000x)",
      fn: () => {
        for (let i = 0; i < nodes.length; i++) {
          platform.rendering.setScale(
            nodes[i],
            Math.random() * 2,
            Math.random() * 2,
          )
        }
      },
    },
    {
      name: "Set alpha (1000x)",
      fn: () => {
        for (let i = 0; i < nodes.length; i++) {
          platform.rendering.setAlpha(nodes[i], Math.random())
        }
      },
    },
    {
      name: "Set visible (1000x)",
      fn: () => {
        for (let i = 0; i < nodes.length; i++) {
          platform.rendering.setVisible(nodes[i], Math.random() > 0.5)
        }
      },
    },
    {
      name: "Draw rectangle (1000x)",
      fn: () => {
        for (let i = 0; i < nodes.length; i++) {
          platform.rendering.drawRectangle(nodes[i], 0, 0, 100, 100, 0xff0000)
        }
      },
    },
    {
      name: "Draw circle (1000x)",
      fn: () => {
        for (let i = 0; i < nodes.length; i++) {
          platform.rendering.drawCircle(nodes[i], 0, 0, 50, 0x00ff00)
        }
      },
    },
    {
      name: "Add/remove child (1000x)",
      fn: () => {
        const parent = platform.rendering.createNode()
        for (let i = 0; i < 1000; i++) {
          const child = platform.rendering.createNode()
          platform.rendering.addChild(parent, child)
          platform.rendering.removeChild(parent, child)
          platform.rendering.destroyNode(child)
        }
        platform.rendering.destroyNode(parent)
      },
    },
  ])

  console.log(formatSuite(results))
}

// Run if executed directly
if (import.meta.main) {
  runPlatformOverheadBenchmarks()
}
