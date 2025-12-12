import { AbstractRenderer, DisplayNode } from "@clockwork-engine/core"
import { Wall } from "../gameObjects/Wall"
import { GAME_CONFIG } from "../utils/constants"

export class WallRenderer extends AbstractRenderer<Wall> {
  constructor(gameNode: DisplayNode) {
    super(gameNode)
  }

  protected create(wall: Wall): DisplayNode {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = wall.getPosition()

    const wallBody = this.createRectangle(
      cellSize,
      cellSize,
      GAME_CONFIG.COLORS.WALL,
      0,
      0,
    )

    const wallTexture = this.createRectangle(
      cellSize - 4,
      cellSize - 4,
      0x888888,
      2,
      2,
    )

    const node = this.rendering.createNode()
    const container = new DisplayNode(node, this.rendering)
    container.setPosition(position.x * cellSize, position.y * cellSize)
    container.addChild(wallBody)
    container.addChild(wallTexture)

    return container
  }

  protected repaintNode(node: DisplayNode, wall: Wall): void {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = wall.getPosition()
    node.setPosition(position.x * cellSize, position.y * cellSize)
  }

  public getId(wall: Wall): string {
    return wall.getId()
  }
}
