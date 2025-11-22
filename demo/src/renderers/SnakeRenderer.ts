import { AbstractRenderer, DisplayNode } from "@hiddentao/clockwork-engine"
import { Snake } from "../gameObjects/Snake"
import { GAME_CONFIG } from "../utils/constants"

export class SnakeRenderer extends AbstractRenderer<Snake> {
  private segmentNodes: Map<string, DisplayNode[]> = new Map()

  constructor(gameNode: DisplayNode) {
    super(gameNode)
  }

  protected create(snake: Snake): DisplayNode {
    const node = this.rendering.createNode()
    const container = new DisplayNode(node, this.rendering)
    this.updateSnakeSegments(container, snake)
    return container
  }

  protected repaintNode(node: DisplayNode, snake: Snake): void {
    this.updateSnakeSegments(node, snake)
  }

  private updateSnakeSegments(container: DisplayNode, snake: Snake): void {
    const segments = snake.getSegments()
    const cellSize = GAME_CONFIG.CELL_SIZE
    const snakeId = snake.getId()

    const existingSegments = this.segmentNodes.get(snakeId) || []
    existingSegments.forEach((seg) => {
      container.removeChild(seg)
      seg.destroy()
    })
    this.segmentNodes.set(snakeId, [])

    const newSegments: DisplayNode[] = []

    segments.forEach((segment, index) => {
      const isHead = index === 0
      const color = isHead
        ? GAME_CONFIG.COLORS.SNAKE_HEAD
        : GAME_CONFIG.COLORS.SNAKE_BODY

      const segmentGraphic = this.createRectangle(
        cellSize - 2,
        cellSize - 2,
        color,
        1,
        1,
      )

      const segmentNode = this.rendering.createNode()
      const segmentContainer = new DisplayNode(segmentNode, this.rendering)
      segmentContainer.setPosition(
        segment.position.x * cellSize,
        segment.position.y * cellSize,
      )

      segmentContainer.addChild(segmentGraphic)
      container.addChild(segmentContainer)
      newSegments.push(segmentContainer)
    })

    this.segmentNodes.set(snakeId, newSegments)
  }

  public getId(snake: Snake): string {
    return snake.getId()
  }

  public remove(id: string): void {
    const segments = this.segmentNodes.get(id)
    if (segments) {
      this.segmentNodes.delete(id)
    }
    super.remove(id)
  }
}
