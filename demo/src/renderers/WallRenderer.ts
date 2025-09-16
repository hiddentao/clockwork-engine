import { AbstractRenderer, PIXI } from "@hiddentao/clockwork-engine"
import { Wall } from "../gameObjects/Wall"
import { GAME_CONFIG } from "../utils/constants"

export class WallRenderer extends AbstractRenderer<Wall> {
  constructor(gameContainer: PIXI.Container) {
    super(gameContainer)
  }

  protected create(wall: Wall): PIXI.Container {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = wall.getPosition()

    // Create container for wall
    const container = new PIXI.Container()
    container.position.set(position.x * cellSize, position.y * cellSize)

    // Create main wall body (full cell size)
    const wallBody = this.createRectangle(
      cellSize,
      cellSize,
      GAME_CONFIG.COLORS.WALL,
      0, // position at origin within container
      0,
    )
    this.addNamedChild(container, wallBody, "body")

    // Create texture effect (inner lighter rectangle)
    const wallTexture = this.createRectangle(
      cellSize - 4,
      cellSize - 4,
      0x888888, // lighter gray for texture
      2, // offset by 2px
      2,
    )
    this.addNamedChild(container, wallTexture, "texture")

    return container
  }

  protected repaintContainer(container: PIXI.Container, wall: Wall): void {
    // Update position (walls typically don't move, but good practice)
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = wall.getPosition()
    container.position.set(position.x * cellSize, position.y * cellSize)
  }

  public getId(wall: Wall): string {
    return wall.getId()
  }
}
