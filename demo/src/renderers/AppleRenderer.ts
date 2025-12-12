import { AbstractRenderer, DisplayNode } from "@clockwork-engine/core"
import { Apple } from "../gameObjects/Apple"
import { GAME_CONFIG } from "../utils/constants"

export class AppleRenderer extends AbstractRenderer<Apple> {
  private bodyNodes: Map<string, DisplayNode> = new Map()
  private highlightNodes: Map<string, DisplayNode> = new Map()

  constructor(gameNode: DisplayNode) {
    super(gameNode)
  }

  protected create(apple: Apple): DisplayNode {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = apple.getPosition()

    const appleBody = this.createCircle(
      (cellSize - 4) / 2,
      GAME_CONFIG.COLORS.APPLE,
    )

    const highlight = this.createCircle(
      (cellSize - 4) / 8,
      0xff6666,
      -(cellSize - 4) / 6,
      -(cellSize - 4) / 6,
    )

    const node = this.rendering.createNode()
    const container = new DisplayNode(node, this.rendering)
    container.setPosition(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )
    container.addChild(appleBody)
    container.addChild(highlight)

    this.bodyNodes.set(apple.getId(), appleBody)
    this.highlightNodes.set(apple.getId(), highlight)

    return container
  }

  protected repaintNode(node: DisplayNode, apple: Apple): void {
    const engine = apple.getEngine()
    const currentTick = engine ? engine.getTotalTicks() : 0

    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = apple.getPosition()
    node.setPosition(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )

    node.setAlpha(apple.getAlpha(currentTick))

    const pulse = Math.sin(currentTick * 0.2) * 0.1 + 0.9

    const body = this.bodyNodes.get(apple.getId())
    const highlight = this.highlightNodes.get(apple.getId())

    if (body) body.setScale(pulse)
    if (highlight) highlight.setScale(pulse)
  }

  public remove(id: string): void {
    this.bodyNodes.delete(id)
    this.highlightNodes.delete(id)
    super.remove(id)
  }

  public clear(): void {
    this.bodyNodes.clear()
    this.highlightNodes.clear()
    super.clear()
  }

  public getId(apple: Apple): string {
    return apple.getId()
  }
}
