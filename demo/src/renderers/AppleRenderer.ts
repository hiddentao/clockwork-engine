import { AbstractRenderer } from "@hiddentao/clockwork-engine"
import * as PIXI from "pixi.js"
import { Apple } from "../gameObjects/Apple"
import { GAME_CONFIG } from "../utils/constants"

export class AppleRenderer extends AbstractRenderer<Apple> {
  constructor(gameContainer: PIXI.Container) {
    super(gameContainer)
  }

  protected create(apple: Apple): PIXI.Container {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = apple.getPosition()

    // Create container for apple
    const container = new PIXI.Container()
    container.position.set(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )

    // Create main apple body
    const appleBody = this.createCircle(
      (cellSize - 4) / 2, // radius to match original sizing
      GAME_CONFIG.COLORS.APPLE,
    )
    this.addNamedChild(container, appleBody, "body")

    // Create highlight
    const highlight = this.createCircle(
      (cellSize - 4) / 8, // smaller highlight
      0xff6666, // lighter red for highlight
      -(cellSize - 4) / 6, // offset left
      -(cellSize - 4) / 6, // offset up
    )
    this.addNamedChild(container, highlight, "highlight")

    return container
  }

  protected updateContainer(container: PIXI.Container, apple: Apple): void {
    const engine = apple.getEngine()
    const currentFrame = engine ? engine.getTotalFrames() : 0

    // Update position
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = apple.getPosition()
    container.position.set(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )

    // Update alpha based on apple's age (fading effect)
    container.alpha = apple.getAlpha(currentFrame)

    // Update pulse effect using sin wave like original (frame * 0.2)
    const pulse = Math.sin(currentFrame * 0.2) * 0.1 + 0.9

    // Apply pulse to both body and highlight
    const body = this.getNamedChild(container, "body")
    const highlight = this.getNamedChild(container, "highlight")

    if (body) body.scale.set(pulse)
    if (highlight) highlight.scale.set(pulse)
  }

  public getId(apple: Apple): string {
    return apple.getId()
  }
}
