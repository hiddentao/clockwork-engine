import { AbstractRenderer, PIXI } from "@hiddentao/clockwork-engine"
import { Snake } from "../gameObjects/Snake"
import { GAME_CONFIG } from "../utils/constants"

export class SnakeRenderer extends AbstractRenderer<Snake> {
  constructor(gameContainer: PIXI.Container) {
    super(gameContainer)
  }

  protected create(snake: Snake): PIXI.Container {
    const container = new PIXI.Container()
    this.updateSnakeSegments(container, snake)
    return container
  }

  protected repaintContainer(container: PIXI.Container, snake: Snake): void {
    this.updateSnakeSegments(container, snake)
  }

  private updateSnakeSegments(container: PIXI.Container, snake: Snake): void {
    const segments = snake.getSegments()
    const cellSize = GAME_CONFIG.CELL_SIZE

    // Clear existing segments
    container.removeChildren()

    // Create graphics for each segment
    segments.forEach((segment, index) => {
      const isHead = index === 0
      const color = isHead
        ? GAME_CONFIG.COLORS.SNAKE_HEAD
        : GAME_CONFIG.COLORS.SNAKE_BODY

      // Create segment graphic (centered within cell)
      const segmentGraphic = this.createRectangle(
        cellSize - 2, // slightly smaller to show grid
        cellSize - 2,
        color,
        1, // center the rectangle within the cell
        1,
      )

      // Position the segment at grid position
      const segmentContainer = new PIXI.Container()
      segmentContainer.position.set(
        segment.position.x * cellSize,
        segment.position.y * cellSize,
      )

      this.addNamedChild(segmentContainer, segmentGraphic, "body")
      container.addChild(segmentContainer)
    })
  }

  public getId(snake: Snake): string {
    return snake.getId()
  }
}
