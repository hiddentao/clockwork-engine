import type { Color, RenderingLayer } from "../platform"
import { DisplayNode } from "../platform/DisplayNode"
import { GameState } from "../types"

/**
 * Abstract base implementation for game object renderers.
 * Provides common functionality for managing visual representations of game entities
 * including creation, updating, removal, and lifecycle management.
 *
 * Platform-agnostic: works with any RenderingLayer implementation.
 *
 * Child classes must implement create() to define how their specific items are rendered
 * and getId() to provide unique identification for tracking.
 *
 * @template T The type of game object being rendered
 */
export abstract class AbstractRenderer<T> {
  protected gameNode: DisplayNode
  protected rendering: RenderingLayer
  protected itemNodes: Map<string, DisplayNode> = new Map()
  protected items: Map<string, T> = new Map()
  protected gameState: GameState = GameState.READY

  constructor(gameNode: DisplayNode) {
    this.gameNode = gameNode
    this.rendering = gameNode.getRendering()
  }

  /**
   * Creates the visual representation for a game object.
   * Must return a DisplayNode that will be added to the display tree.
   *
   * @param item The game object to create visuals for
   * @returns A DisplayNode containing the item's visual elements
   */
  protected abstract create(item: T): DisplayNode

  /**
   * Updates the game state for this renderer.
   * Allows renderers to react to game state changes (e.g., pause animations, change visual appearance).
   *
   * @param state The new game state
   */
  public updateGameState(state: GameState): void {
    this.gameState = state
  }

  /**
   * Extracts a unique identifier from a game object.
   * Used for tracking and preventing duplicate renders.
   *
   * @param item The game object to identify
   * @returns Unique string identifier for the item
   */
  public abstract getId(item: T): string

  /**
   * Adds a new item to the renderer, creating its visual representation.
   * If the item already exists, delegates to update() instead of creating a duplicate.
   *
   * @param item The game object to render
   */
  public add(item: T): void {
    try {
      const id = this.getId(item)
      if (this.itemNodes.has(id)) {
        this.update(item)
        return
      }

      const node = this.create(item)
      this.gameNode.addChild(node)
      this.itemNodes.set(id, node)
      this.items.set(id, item)

      // Call updateNode for newly created items to handle initial paint
      this.updateNode(node, item)
    } catch (error) {
      console.error(`Error adding item in ${this.constructor.name}:`, error)
    }
  }

  /**
   * Updates an existing item's visual representation.
   * Modifies the node properties without recreating the entire display object.
   * If the item doesn't exist, it will be created.
   *
   * @param item The game object with updated state
   */
  public update(item: T): void {
    try {
      const id = this.getId(item)
      const node = this.itemNodes.get(id)
      if (node) {
        this.updateNode(node, item)
        this.items.set(id, item)
      } else {
        this.add(item)
      }
    } catch (error) {
      console.error(`Error updating item in ${this.constructor.name}:`, error)
    }
  }

  /**
   * Removes an item from the renderer by its unique identifier.
   * Destroys the node and cleans up all references.
   *
   * @param id Unique identifier of the item to remove
   */
  public remove(id: string): void {
    try {
      const node = this.itemNodes.get(id)
      if (node) {
        this.gameNode.removeChild(node)
        node.destroy()
        this.itemNodes.delete(id)
        this.items.delete(id)
      }
    } catch (error) {
      console.error(`Error removing item in ${this.constructor.name}:`, error)
    }
  }

  /**
   * Replaces all rendered items with a new set in a single operation.
   * Efficiently handles additions, updates, and removals by comparing
   * the new item list against currently rendered items.
   *
   * @param items Array of all items that should be currently rendered
   */
  public setItems(items: T[]): void {
    try {
      const existingItemIds = Array.from(this.itemNodes.keys())
      const newItemIds = new Set<string>()

      for (const item of items) {
        const id = this.getId(item)
        newItemIds.add(id)

        if (this.itemNodes.has(id)) {
          this.update(item)
        } else {
          this.add(item)
        }
      }

      for (const id of existingItemIds) {
        if (!newItemIds.has(id)) {
          this.remove(id)
        }
      }
    } catch (error) {
      console.error(`Error setting items in ${this.constructor.name}:`, error)
    }
  }

  /**
   * Calculates transparency for objects based on their health status.
   * Objects become progressively transparent as health decreases below the threshold.
   *
   * @param currentHealth Current health of the object
   * @param maxHealth Maximum health of the object
   * @param threshold Health threshold below which transparency begins (defaults to half max health)
   * @returns Alpha value for visual transparency
   */
  protected calculateHealthBasedAlpha(
    currentHealth: number,
    maxHealth: number,
    threshold: number = maxHealth * 0.5,
  ): number {
    if (currentHealth <= 0) return 0.3
    if (currentHealth >= threshold || currentHealth >= maxHealth) return 1.0

    return 0.3 + 0.7 * (currentHealth / threshold)
  }

  /**
   * Creates a filled rectangle as a DisplayNode.
   *
   * @param width Width of the rectangle
   * @param height Height of the rectangle
   * @param color Fill color
   * @param x X position (defaults to center horizontally)
   * @param y Y position (defaults to center vertically)
   * @returns A new DisplayNode with the rectangle drawn
   */
  protected createRectangle(
    width: number,
    height: number,
    color: Color,
    x?: number,
    y?: number,
  ): DisplayNode {
    const node = this.rendering.createNode()
    const displayNode = new DisplayNode(node, this.rendering)

    x = x ?? -width / 2
    y = y ?? -height / 2

    this.rendering.drawRectangle(node, x, y, width, height, color)
    return displayNode
  }

  /**
   * Creates a filled circle as a DisplayNode.
   *
   * @param radius Radius of the circle
   * @param color Fill color
   * @param x X position (defaults to origin)
   * @param y Y position (defaults to origin)
   * @returns A new DisplayNode with the circle drawn
   */
  protected createCircle(
    radius: number,
    color: Color,
    x = 0,
    y = 0,
  ): DisplayNode {
    const node = this.rendering.createNode()
    const displayNode = new DisplayNode(node, this.rendering)

    this.rendering.drawCircle(node, x, y, radius, color)
    return displayNode
  }

  /**
   * Creates a filled polygon as a DisplayNode.
   *
   * @param points Array of coordinates in sequence
   * @param color Fill color
   * @returns A new DisplayNode with the polygon drawn
   */
  protected createPolygon(points: number[], color: Color): DisplayNode {
    const node = this.rendering.createNode()
    const displayNode = new DisplayNode(node, this.rendering)

    this.rendering.drawPolygon(node, points, color)
    return displayNode
  }

  /**
   * Creates a rectangular border outline without fill.
   *
   * @param width Width of the rectangle
   * @param height Height of the rectangle
   * @param strokeWidth Width of the border line
   * @param color Border color
   * @param alpha Transparency of the border (defaults to opaque)
   * @returns A new DisplayNode with the border rectangle drawn
   */
  protected createBorderRectangle(
    width: number,
    height: number,
    strokeWidth: number,
    color: Color,
    alpha = 1,
  ): DisplayNode {
    const node = this.rendering.createNode()
    const displayNode = new DisplayNode(node, this.rendering)

    this.rendering.drawRectangle(
      node,
      0,
      0,
      width,
      height,
      undefined,
      color,
      strokeWidth,
    )
    displayNode.setAlpha(alpha)

    return displayNode
  }

  /**
   * Creates a positioned node with a body graphic as its child.
   *
   * @param x X position
   * @param y Y position
   * @param rotation Rotation in radians (optional)
   * @param bodyNode The node to use as the body
   * @returns A DisplayNode with the body node as a child
   */
  protected createStandardNode(
    x: number,
    y: number,
    rotation: number | undefined = undefined,
    bodyNode: DisplayNode,
  ): DisplayNode {
    const node = this.rendering.createNode()
    const displayNode = new DisplayNode(node, this.rendering)

    displayNode.setPosition(x, y)
    if (rotation !== undefined) {
      displayNode.setRotation(rotation)
    }

    displayNode.addChild(bodyNode)

    return displayNode
  }

  /**
   * Updates a node's visual properties based on the item's current state.
   * Checks the needsRepaint flag and only calls repaintNode if needed.
   *
   * @param node The DisplayNode to update
   * @param item The game object with current state
   */
  protected updateNode(node: DisplayNode, item: T): void {
    // Check if item has needsRepaint property (for GameObject instances)
    if (
      typeof item === "object" &&
      item !== null &&
      "needsRepaint" in item &&
      (item as any).needsRepaint
    ) {
      this.repaintNode(node, item)
      ;(item as any).needsRepaint = false
    } else if (
      typeof item !== "object" ||
      item === null ||
      !("needsRepaint" in item)
    ) {
      // For backwards compatibility with non-GameObject items, always repaint
      this.repaintNode(node, item)
    }
  }

  /**
   * Repaints a node's visual properties based on the item's current state.
   * Default implementation performs no updates. Child classes should override
   * this method to implement specific repaint behavior.
   *
   * @param _node The DisplayNode to repaint
   * @param _item The game object with current state
   */
  protected repaintNode(_node: DisplayNode, _item: T): void {
    // Default implementation performs no updates
  }

  /**
   * Completely clears the renderer and cleans up all resources.
   */
  public clear(): void {
    const entries = Array.from(this.itemNodes.entries())
    for (const [id, node] of entries) {
      this.gameNode.removeChild(node)
      node.destroy()
      this.itemNodes.delete(id)
      this.items.delete(id)
    }
  }

  /**
   * Retrieves the DisplayNode for a specific item.
   *
   * @param id Unique identifier of the item
   * @returns The DisplayNode or undefined if not found
   */
  public getNode(id: string): DisplayNode | undefined {
    return this.itemNodes.get(id)
  }

  /**
   * Retrieves a specific game object by its identifier.
   *
   * @param id Unique identifier of the item
   * @returns The game object or undefined if not found
   */
  public getItem(id: string): T | undefined {
    return this.items.get(id)
  }

  /**
   * Returns a map of all currently tracked game objects.
   *
   * @returns Map containing all items keyed by their identifiers
   */
  public getAllItems(): Map<string, T> {
    return this.items
  }

  /**
   * Forces a complete visual refresh of all currently rendered items.
   * Calls the update logic for every tracked item without changing
   * the set of rendered items.
   */
  public rerender(): void {
    try {
      for (const [id, item] of this.items.entries()) {
        const node = this.itemNodes.get(id)
        if (node) {
          this.updateNode(node, item)
        }
      }
    } catch (error) {
      console.error(
        `Error rerendering items in ${this.constructor.name}:`,
        error,
      )
    }
  }
}
