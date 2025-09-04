import * as PIXI from "pixi.js"
import { DemoGameEngine } from "./engine/DemoGameEngine"
import { Apple, Snake, Wall } from "./gameObjects"
import { GAME_CONFIG } from "./utils/constants"

export class Renderer {
  private app: PIXI.Application
  private gridContainer: PIXI.Container
  private gameContainer: PIXI.Container

  constructor(app: PIXI.Application) {
    this.app = app
    this.gridContainer = new PIXI.Container()
    this.gameContainer = new PIXI.Container()

    // Add containers to stage
    this.app.stage.addChild(this.gridContainer)
    this.app.stage.addChild(this.gameContainer)

    // Draw the grid background
    this.drawGrid()
  }

  private drawGrid(): void {
    const graphics = new PIXI.Graphics()
    const cellSize = GAME_CONFIG.CELL_SIZE
    const gridSize = GAME_CONFIG.GRID_SIZE

    // Grid lines
    graphics.setStrokeStyle({ width: 1, color: 0x333366 })

    // Vertical lines
    for (let x = 0; x <= gridSize; x++) {
      const xPos = x * cellSize
      graphics.moveTo(xPos, 0)
      graphics.lineTo(xPos, gridSize * cellSize)
    }

    // Horizontal lines
    for (let y = 0; y <= gridSize; y++) {
      const yPos = y * cellSize
      graphics.moveTo(0, yPos)
      graphics.lineTo(gridSize * cellSize, yPos)
    }

    graphics.stroke()
    this.gridContainer.addChild(graphics)
  }

  public render(engine: DemoGameEngine): void {
    // Clear previous frame
    this.gameContainer.removeChildren()

    // Get game objects
    const snakeGroup = engine.getGameObjectGroup("Snake")
    const appleGroup = engine.getGameObjectGroup("Apple")
    const wallGroup = engine.getGameObjectGroup("Wall")

    // Render snakes
    if (snakeGroup) {
      const snakes = snakeGroup.getAll()
      for (const snake of snakes) {
        if (snake instanceof Snake) {
          this.renderSnake(snake)
        }
      }
    }

    // Render apples
    if (appleGroup) {
      const apples = appleGroup.getAll()
      for (const apple of apples) {
        if (apple instanceof Apple) {
          this.renderApple(apple, engine.getTotalFrames())
        }
      }
    }

    // Render walls
    if (wallGroup) {
      const walls = wallGroup.getAll()
      for (const wall of walls) {
        if (wall instanceof Wall) {
          this.renderWall(wall)
        }
      }
    }
  }

  private renderSnake(snake: Snake): void {
    const segments = snake.getSegments()
    const cellSize = GAME_CONFIG.CELL_SIZE

    segments.forEach((segment, index) => {
      const graphics = new PIXI.Graphics()

      // Head is brighter green, body is darker
      const color = index === 0 ? 0x00ff00 : 0x00cc00

      graphics.rect(
        segment.position.x * cellSize + 1,
        segment.position.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2,
      )
      graphics.fill({ color })

      this.gameContainer.addChild(graphics)
    })
  }

  private renderApple(apple: Apple, frame: number): void {
    const position = apple.getPosition()
    const cellSize = GAME_CONFIG.CELL_SIZE

    const graphics = new PIXI.Graphics()

    // Pulsing effect based on frame
    const pulse = Math.sin(frame * 0.2) * 0.1 + 0.9
    const size = (cellSize - 4) * pulse

    graphics.circle(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2,
      size / 2,
    )
    graphics.fill({ color: 0xff0000 })

    // Highlight
    graphics.circle(
      position.x * cellSize + cellSize / 2 - size / 6,
      position.y * cellSize + cellSize / 2 - size / 6,
      size / 8,
    )
    graphics.fill({ color: 0xff6666 })

    this.gameContainer.addChild(graphics)
  }

  private renderWall(wall: Wall): void {
    const position = wall.getPosition()
    const cellSize = GAME_CONFIG.CELL_SIZE

    const graphics = new PIXI.Graphics()

    graphics.rect(
      position.x * cellSize,
      position.y * cellSize,
      cellSize,
      cellSize,
    )
    graphics.fill({ color: 0x666666 })

    // Add some texture
    graphics.rect(
      position.x * cellSize + 2,
      position.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4,
    )
    graphics.fill({ color: 0x888888 })

    this.gameContainer.addChild(graphics)
  }
}
