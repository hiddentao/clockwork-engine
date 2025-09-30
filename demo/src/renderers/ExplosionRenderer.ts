import { AbstractRenderer, PIXI } from "@hiddentao/clockwork-engine"
import { ExplosionEffect } from "../gameObjects/ExplosionEffect"

export class ExplosionRenderer extends AbstractRenderer<ExplosionEffect> {
  private particleGraphics: Map<string, PIXI.Graphics[]> = new Map()

  constructor(gameContainer: PIXI.Container) {
    super(gameContainer)
  }

  protected create(explosion: ExplosionEffect): PIXI.Container {
    const cellSize = 24
    const position = explosion.getPosition()

    console.log(
      `💥 Creating explosion at grid position ${position.x}, ${position.y}`,
    )

    // Create container for explosion
    const container = new PIXI.Container()
    container.position.set(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )

    console.log(
      `💥 Explosion container positioned at pixel ${container.position.x}, ${container.position.y}`,
    )

    // Create graphics for each particle
    const graphics: PIXI.Graphics[] = []
    const particles = explosion.getParticles()

    for (let i = 0; i < particles.length; i++) {
      const graphic = this.createGraphics()
      container.addChild(graphic)
      graphics.push(graphic)
    }

    // Store graphics for this explosion
    this.particleGraphics.set(explosion.getId(), graphics)

    console.log(
      `💥 Created ${graphics.length} particle graphics for explosion ${explosion.getId()}`,
    )
    return container
  }

  protected repaintContainer(
    _container: PIXI.Container,
    explosion: ExplosionEffect,
  ): void {
    const graphics = this.particleGraphics.get(explosion.getId())
    if (!graphics) return

    const particles = explosion.getParticles()

    if (explosion.getElapsedFrames() % 30 === 0) {
      console.log(
        `💥 Updating explosion ${explosion.getId()}: progress ${explosion.getProgress().toFixed(2)} (${explosion.getElapsedFrames()}/${explosion.getDuration()})`,
      )
    }

    // Update each particle graphic based on particle data
    for (let i = 0; i < graphics.length && i < particles.length; i++) {
      const graphic = graphics[i]
      const particle = particles[i]

      // Update position from particle data
      graphic.position.set(particle.currentX, particle.currentY)

      // Redraw particle with current state
      graphic.clear()
      graphic.circle(0, 0, particle.currentSize)
      graphic.fill({ color: particle.color, alpha: particle.alpha })
    }
  }

  public remove(id: string): void {
    this.particleGraphics.delete(id)
    super.remove(id)
  }

  public clear(): void {
    this.particleGraphics.clear()
    super.clear()
  }

  public getId(explosion: ExplosionEffect): string {
    return explosion.getId()
  }
}
