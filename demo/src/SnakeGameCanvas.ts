import {
  DisplayNode,
  GameCanvas,
  type GameCanvasOptions,
  type PlatformLayer,
} from "@clockwork-engine/core"
import { Apple, Bomb, Snake, Wall } from "./gameObjects"
import { ExplosionEffect } from "./gameObjects/ExplosionEffect"
import { AppleRenderer } from "./renderers/AppleRenderer"
import { BombRenderer } from "./renderers/BombRenderer"
import { ExplosionRenderer } from "./renderers/ExplosionRenderer"
import { SnakeRenderer } from "./renderers/SnakeRenderer"
import { WallRenderer } from "./renderers/WallRenderer"
import { GAME_CONFIG } from "./utils/constants"

export class SnakeGameCanvas extends GameCanvas {
  private gridNode: DisplayNode | null = null
  private appleRenderer: AppleRenderer | null = null
  private bombRenderer: BombRenderer | null = null
  private snakeRenderer: SnakeRenderer | null = null
  private wallRenderer: WallRenderer | null = null
  private explosionRenderer: ExplosionRenderer | null = null

  constructor(options: GameCanvasOptions, platform: PlatformLayer) {
    super(options, platform)
  }

  protected setupRenderers(): void {
    // Clean up existing grid
    if (this.gridNode) {
      this.gridNode.destroy()
      this.gridNode = null
    }

    // Create and add grid background
    this.drawGrid()

    // Initialize renderers for game objects
    this.appleRenderer = new AppleRenderer(this.gameNode)
    this.bombRenderer = new BombRenderer(this.gameNode)
    this.snakeRenderer = new SnakeRenderer(this.gameNode)
    this.wallRenderer = new WallRenderer(this.gameNode)
    this.explosionRenderer = new ExplosionRenderer(this.gameNode)

    // Register renderers with GameCanvas for state management
    this.registerRenderer("apple", this.appleRenderer)
    this.registerRenderer("bomb", this.bombRenderer)
    this.registerRenderer("snake", this.snakeRenderer)
    this.registerRenderer("wall", this.wallRenderer)
    this.registerRenderer("explosion", this.explosionRenderer)
  }

  private drawGrid(): void {
    const gridNodeId = this.rendering.createNode()
    this.gridNode = new DisplayNode(gridNodeId, this.rendering)

    const cellSize = GAME_CONFIG.CELL_SIZE
    const gridSize = GAME_CONFIG.GRID_SIZE

    // Vertical lines
    for (let x = 0; x <= gridSize; x++) {
      const xPos = x * cellSize
      this.rendering.drawLine(
        gridNodeId,
        xPos,
        0,
        xPos,
        gridSize * cellSize,
        GAME_CONFIG.COLORS.GRID,
        1,
      )
    }

    // Horizontal lines
    for (let y = 0; y <= gridSize; y++) {
      const yPos = y * cellSize
      this.rendering.drawLine(
        gridNodeId,
        0,
        yPos,
        gridSize * cellSize,
        yPos,
        GAME_CONFIG.COLORS.GRID,
        1,
      )
    }

    // Add grid as first child of game node (background layer)
    this.gameNode.addChild(this.gridNode)
    this.gridNode.setZIndex(-1)
  }

  protected render(_deltaTicks: number): void {
    if (!this.gameEngine) return

    // Get all game objects from the engine
    const apples =
      (this.gameEngine
        .getGameObjectGroup("Apple")
        ?.getAllActive() as Apple[]) || []
    const bombs =
      (this.gameEngine.getGameObjectGroup("Bomb")?.getAllActive() as Bomb[]) ||
      []
    const snakes =
      (this.gameEngine
        .getGameObjectGroup("Snake")
        ?.getAllActive() as Snake[]) || []
    const walls =
      (this.gameEngine.getGameObjectGroup("Wall")?.getAllActive() as Wall[]) ||
      []
    const explosions =
      (this.gameEngine
        .getGameObjectGroup("ExplosionEffect")
        ?.getAllActive() as ExplosionEffect[]) || []

    // Update renderers with current game state
    if (this.appleRenderer) {
      this.appleRenderer.setItems(apples)
    }
    if (this.bombRenderer) {
      this.bombRenderer.setItems(bombs)
    }
    if (this.snakeRenderer) {
      this.snakeRenderer.setItems(snakes)
    }
    if (this.wallRenderer) {
      this.wallRenderer.setItems(walls)
    }
    if (this.explosionRenderer) {
      this.explosionRenderer.setItems(explosions)
    }
  }

  public destroy(): void {
    // Clean up renderers
    if (this.appleRenderer) {
      this.appleRenderer.clear()
      this.appleRenderer = null
    }
    if (this.bombRenderer) {
      this.bombRenderer.clear()
      this.bombRenderer = null
    }
    if (this.snakeRenderer) {
      this.snakeRenderer.clear()
      this.snakeRenderer = null
    }
    if (this.wallRenderer) {
      this.wallRenderer.clear()
      this.wallRenderer = null
    }
    if (this.explosionRenderer) {
      this.explosionRenderer.clear()
      this.explosionRenderer = null
    }

    // Clean up grid
    if (this.gridNode) {
      this.gridNode.destroy()
      this.gridNode = null
    }

    super.destroy()
  }
}
