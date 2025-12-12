import type { GameEngineInterface } from "@clockwork-engine/core"
import { GameObject, Vector2D } from "@clockwork-engine/core"

interface Particle {
  velocityX: number
  velocityY: number
  initialSize: number
  currentX: number
  currentY: number
  currentSize: number
  color: number
  alpha: number
}

export class ExplosionEffect extends GameObject {
  private duration: number
  private elapsedFrames: number = 0
  private particleCount: number
  private particles: Particle[] = []

  constructor(
    id: string,
    position: Vector2D,
    duration: number = 60,
    particleCount: number = 20,
    engine?: GameEngineInterface,
  ) {
    super(id, position, new Vector2D(1, 1), 1, engine)
    this.duration = duration
    this.particleCount = particleCount

    // Initialize particles
    this.initializeParticles()
  }

  private initializeParticles(): void {
    const prng = this.engine?.getPRNG()

    for (let i = 0; i < this.particleCount; i++) {
      // Random angle for circular distribution
      const angle =
        (i / this.particleCount) * Math.PI * 2 +
        (prng ? (prng.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 0.5)

      // Random velocity magnitude
      const speed = 2 + (prng ? prng.random() * 3 : Math.random() * 3) // 2-5 pixels per frame

      const initialSize = 8 + (prng ? prng.random() * 8 : Math.random() * 8) // 8-16 pixels initial size

      const particle: Particle = {
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        initialSize,
        currentX: 0, // Start at center
        currentY: 0,
        currentSize: initialSize,
        color: 0xffff00, // Start with yellow
        alpha: 1.0,
      }

      this.particles.push(particle)
    }
  }

  getType(): string {
    return "ExplosionEffect"
  }

  getDuration(): number {
    return this.duration
  }

  getElapsedFrames(): number {
    return this.elapsedFrames
  }

  getParticleCount(): number {
    return this.particleCount
  }

  getParticles(): Particle[] {
    return this.particles
  }

  getProgress(): number {
    return Math.min(this.elapsedFrames / this.duration, 1.0)
  }

  isComplete(): boolean {
    return this.elapsedFrames >= this.duration
  }

  update(deltaTicks: number, totalTicks: number): void {
    super.update(deltaTicks, totalTicks)

    this.elapsedFrames += deltaTicks

    // Update all particles
    this.updateParticles()

    // Trigger repaint since particles have changed
    this.needsRepaint = true
  }

  private updateParticles(): void {
    const progress = this.getProgress()
    const cellSize = 24 // GAME_CONFIG.CELL_SIZE

    for (const particle of this.particles) {
      // Update position based on velocity and progress
      const distance = progress * cellSize * 3.0 // Max distance is 3 cell sizes
      particle.currentX = particle.velocityX * distance
      particle.currentY = particle.velocityY * distance

      // Update size (grow then shrink)
      let sizeMultiplier: number
      if (progress < 0.2) {
        // Quick grow phase
        sizeMultiplier = 1.0 + (progress / 0.2) * 2.0 // 1.0 to 3.0
      } else if (progress < 0.7) {
        // Maintain large size
        sizeMultiplier = 3.0
      } else {
        // Shrink phase
        sizeMultiplier = 3.0 - ((progress - 0.7) / 0.3) * 2.5 // 3.0 to 0.5
      }
      particle.currentSize = particle.initialSize * sizeMultiplier

      // Update color based on progress
      if (progress < 0.4) {
        // Yellow to orange
        const factor = progress / 0.4
        particle.color = this.interpolateColor(0xffff00, 0xff6600, factor)
      } else {
        // Orange to dark red
        const factor = (progress - 0.4) / 0.6
        particle.color = this.interpolateColor(0xff6600, 0x330000, factor)
      }

      // Update alpha (fade out in final phase)
      if (progress > 0.8) {
        particle.alpha = 1.0 - (progress - 0.8) / 0.2 // Fade out in last 20%
      } else {
        particle.alpha = 1.0
      }
    }
  }

  private interpolateColor(
    color1: number,
    color2: number,
    factor: number,
  ): number {
    // Extract RGB components
    const r1 = (color1 >> 16) & 0xff
    const g1 = (color1 >> 8) & 0xff
    const b1 = color1 & 0xff

    const r2 = (color2 >> 16) & 0xff
    const g2 = (color2 >> 8) & 0xff
    const b2 = color2 & 0xff

    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * factor)
    const g = Math.round(g1 + (g2 - g1) * factor)
    const b = Math.round(b1 + (b2 - b1) * factor)

    return (r << 16) | (g << 8) | b
  }

  // Serialization
  serialize() {
    return {
      ...super.serialize(),
      duration: this.duration,
      elapsedFrames: this.elapsedFrames,
      particleCount: this.particleCount,
    }
  }

  static deserialize(data: any): ExplosionEffect {
    const explosion = new ExplosionEffect(
      data.id,
      Vector2D.deserialize(data.position),
      data.duration,
      data.particleCount,
    )
    explosion.elapsedFrames = data.elapsedFrames || 0
    return explosion
  }
}
