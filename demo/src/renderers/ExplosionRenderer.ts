import { AbstractRenderer, DisplayNode } from "@clockwork-engine/core"
import { ExplosionEffect } from "../gameObjects/ExplosionEffect"

export class ExplosionRenderer extends AbstractRenderer<ExplosionEffect> {
  private particleNodes: Map<string, DisplayNode[]> = new Map()

  constructor(gameNode: DisplayNode) {
    super(gameNode)
  }

  protected create(explosion: ExplosionEffect): DisplayNode {
    const cellSize = 24
    const position = explosion.getPosition()

    console.log(
      `💥 Creating explosion at grid position ${position.x}, ${position.y}`,
    )

    const nodeId = this.rendering.createNode()
    const container = new DisplayNode(nodeId, this.rendering)
    container.setPosition(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )

    console.log(
      `💥 Explosion container positioned at pixel ${position.x * cellSize + cellSize / 2}, ${position.y * cellSize + cellSize / 2}`,
    )

    const particles = explosion.getParticles()
    const particleNodesList: DisplayNode[] = []

    for (let i = 0; i < particles.length; i++) {
      const particleNodeId = this.rendering.createNode()
      const particleNode = new DisplayNode(particleNodeId, this.rendering)
      container.addChild(particleNode)
      particleNodesList.push(particleNode)
    }

    this.particleNodes.set(explosion.getId(), particleNodesList)

    console.log(
      `💥 Created ${particleNodesList.length} particle nodes for explosion ${explosion.getId()}`,
    )
    return container
  }

  protected repaintNode(_node: DisplayNode, explosion: ExplosionEffect): void {
    const nodes = this.particleNodes.get(explosion.getId())
    if (!nodes) return

    const particles = explosion.getParticles()

    if (explosion.getElapsedFrames() % 30 === 0) {
      console.log(
        `💥 Updating explosion ${explosion.getId()}: progress ${explosion.getProgress().toFixed(2)} (${explosion.getElapsedFrames()}/${explosion.getDuration()})`,
      )
    }

    for (let i = 0; i < nodes.length && i < particles.length; i++) {
      const particleNode = nodes[i]
      const particle = particles[i]

      particleNode.setPosition(particle.currentX, particle.currentY)

      particleNode.clearGraphics()
      particleNode.drawCircle(0, 0, particle.currentSize, particle.color)
      particleNode.setAlpha(particle.alpha)
    }
  }

  public remove(id: string): void {
    this.particleNodes.delete(id)
    super.remove(id)
  }

  public clear(): void {
    this.particleNodes.clear()
    super.clear()
  }

  public getId(explosion: ExplosionEffect): string {
    return explosion.getId()
  }
}
