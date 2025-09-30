import { AbstractRenderer, PIXI } from "@hiddentao/clockwork-engine"
import { Bomb } from "../gameObjects/Bomb"
import { GAME_CONFIG } from "../utils/constants"

export class BombRenderer extends AbstractRenderer<Bomb> {
  constructor(gameContainer: PIXI.Container) {
    super(gameContainer)
  }

  protected create(bomb: Bomb): PIXI.Container {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = bomb.getPosition()

    // Create container for bomb
    const container = new PIXI.Container()
    container.position.set(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )

    // Create main bomb body (circular like apple)
    const bombBody = this.createCircle(
      (cellSize - 4) / 2, // radius to match apple sizing
      GAME_CONFIG.COLORS.BOMB,
    )
    this.addNamedChild(container, bombBody, "body")

    // Create darker center
    const center = this.createCircle(
      (cellSize - 4) / 6, // smaller center
      0xcc4400, // darker orange
    )
    this.addNamedChild(container, center, "center")

    // Create fuse highlight
    const fuse = this.createRectangle(
      2, // width
      (cellSize - 4) / 4, // height
      0xffff00, // yellow fuse
      0, // x offset
      -(cellSize - 4) / 3, // y offset (above bomb)
    )
    this.addNamedChild(container, fuse, "fuse")

    return container
  }

  protected repaintContainer(container: PIXI.Container, bomb: Bomb): void {
    // Update position
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = bomb.getPosition()
    container.position.set(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
    )

    // Bomb doesn't change over time like apple, so no alpha or pulse effects needed
    // Could add a subtle danger pulse if desired
  }

  public getId(bomb: Bomb): string {
    return bomb.getId()
  }
}
