import { AbstractRenderer, DisplayNode } from "@clockwork-engine/core"
import { Bomb } from "../gameObjects/Bomb"
import { GAME_CONFIG } from "../utils/constants"

export class BombRenderer extends AbstractRenderer<Bomb> {
  constructor(gameNode: DisplayNode) {
    super(gameNode)
  }

  protected create(bomb: Bomb): DisplayNode {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = bomb.getPosition()

    const bombBody = this.createCircle(
      (cellSize - 4) / 2,
      GAME_CONFIG.COLORS.BOMB,
    )

    const center = this.createCircle((cellSize - 4) / 6, 0xcc4400)

    const fuse = this.createRectangle(
      2,
      (cellSize - 4) / 4,
      0xffff00,
      0,
      -(cellSize - 4) / 3,
    )

    const node = this.rendering.createNode()
    const container = new DisplayNode(node, this.rendering)
    container.setPosition(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )
    container.addChild(bombBody)
    container.addChild(center)
    container.addChild(fuse)

    return container
  }

  protected repaintNode(node: DisplayNode, bomb: Bomb): void {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = bomb.getPosition()
    node.setPosition(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )
  }

  public getId(bomb: Bomb): string {
    return bomb.getId()
  }
}
