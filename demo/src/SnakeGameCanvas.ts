import {
  GameCanvas,
  type GameCanvasOptions,
  PIXI,
} from "@hiddentao/clockwork-engine"
import { Apple, Snake, Wall } from "./gameObjects"
import { AppleRenderer } from "./renderers/AppleRenderer"
import { SnakeRenderer } from "./renderers/SnakeRenderer"
import { WallRenderer } from "./renderers/WallRenderer"
import { GAME_CONFIG } from "./utils/constants"

export class SnakeGameCanvas extends GameCanvas {
  private gridGraphics: PIXI.Graphics | null = null
  private appleRenderer: AppleRenderer | null = null
  private snakeRenderer: SnakeRenderer | null = null
  private wallRenderer: WallRenderer | null = null

  constructor(options: GameCanvasOptions) {
    super(options)
  }

  protected initializeGameLayers(): void {
    // Create and add grid background
    this.drawGrid()

    // Initialize renderers for game objects
    this.appleRenderer = new AppleRenderer(this.gameContainer)
    this.snakeRenderer = new SnakeRenderer(this.gameContainer)
    this.wallRenderer = new WallRenderer(this.gameContainer)
  }

  private drawGrid(): void {
    this.gridGraphics = new PIXI.Graphics()
    const cellSize = GAME_CONFIG.CELL_SIZE
    const gridSize = GAME_CONFIG.GRID_SIZE

    // Grid lines
    this.gridGraphics.setStrokeStyle({
      width: 1,
      color: GAME_CONFIG.COLORS.GRID,
    })

    // Vertical lines
    for (let x = 0; x <= gridSize; x++) {
      const xPos = x * cellSize
      this.gridGraphics.moveTo(xPos, 0)
      this.gridGraphics.lineTo(xPos, gridSize * cellSize)
    }

    // Horizontal lines
    for (let y = 0; y <= gridSize; y++) {
      const yPos = y * cellSize
      this.gridGraphics.moveTo(0, yPos)
      this.gridGraphics.lineTo(gridSize * cellSize, yPos)
    }

    this.gridGraphics.stroke()
    this.gameContainer.addChildAt(this.gridGraphics, 0) // Add as background layer
  }

  protected render(_deltaFrames: number): void {
    if (!this.gameEngine) return

    // Get all game objects from the engine
    const apples =
      (this.gameEngine
        .getGameObjectGroup("Apple")
        ?.getAllActive() as Apple[]) || []
    const snakes =
      (this.gameEngine
        .getGameObjectGroup("Snake")
        ?.getAllActive() as Snake[]) || []
    const walls =
      (this.gameEngine.getGameObjectGroup("Wall")?.getAllActive() as Wall[]) ||
      []

    // Update renderers with current game state
    if (this.appleRenderer) {
      this.appleRenderer.setItems(apples)
    }
    if (this.snakeRenderer) {
      this.snakeRenderer.setItems(snakes)
    }
    if (this.wallRenderer) {
      this.wallRenderer.setItems(walls)
    }
  }

  public destroy(): void {
    // Clean up renderers
    if (this.appleRenderer) {
      this.appleRenderer.destroy()
      this.appleRenderer = null
    }
    if (this.snakeRenderer) {
      this.snakeRenderer.destroy()
      this.snakeRenderer = null
    }
    if (this.wallRenderer) {
      this.wallRenderer.destroy()
      this.wallRenderer = null
    }

    // Clean up grid
    if (this.gridGraphics) {
      this.gridGraphics.destroy()
      this.gridGraphics = null
    }

    super.destroy()
  }
}
