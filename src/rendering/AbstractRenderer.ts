import { PIXI } from "../lib/pixi"
import type { BaseRenderer } from "./BaseRenderer"

/**
 * Abstract base implementation of the BaseRenderer interface for PIXI.js game objects.
 * Provides common functionality for managing visual representations of game entities
 * including creation, updating, removal, and lifecycle management.
 *
 * Child classes must implement create() to define how their specific items are rendered
 * and getId() to provide unique identification for tracking.
 *
 * @template T The type of game object being rendered
 */
export abstract class AbstractRenderer<T> implements BaseRenderer<T> {
  protected gameContainer: PIXI.Container
  protected itemSprites: Map<string, PIXI.Container> = new Map()
  protected items: Map<string, T> = new Map()

  constructor(gameContainer: PIXI.Container) {
    this.gameContainer = gameContainer
  }

  /**
   * Creates the visual representation for a game object.
   * Must return a PIXI.Container that will be added to the display tree.
   *
   * @param item The game object to create visuals for
   * @returns A PIXI container containing the item's visual elements
   */
  protected abstract create(item: T): PIXI.Container

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
      if (this.itemSprites.has(id)) {
        this.update(item)
        return
      }

      const container = this.create(item)
      this.gameContainer.addChild(container)
      this.itemSprites.set(id, container)
      this.items.set(id, item)

      // Call updateContainer for newly created items to handle initial paint
      this.updateContainer(container, item)
    } catch (error) {
      console.error(`Error adding item in ${this.constructor.name}:`, error)
    }
  }

  /**
   * Updates an existing item's visual representation.
   * Modifies the PIXI container properties without recreating the entire display object.
   * If the item doesn't exist, it will be created.
   *
   * @param item The game object with updated state
   */
  public update(item: T): void {
    try {
      const id = this.getId(item)
      const container = this.itemSprites.get(id)
      if (container) {
        this.updateContainer(container, item)
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
   * Destroys the PIXI container and cleans up all references.
   *
   * @param id Unique identifier of the item to remove
   */
  public remove(id: string): void {
    try {
      const container = this.itemSprites.get(id)
      if (container) {
        this.gameContainer.removeChild(container)
        container.destroy({ children: true })
        this.itemSprites.delete(id)
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
      const existingItemIds = Array.from(this.itemSprites.keys())
      const newItemIds = new Set<string>()

      for (const item of items) {
        const id = this.getId(item)
        newItemIds.add(id)

        if (this.itemSprites.has(id)) {
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
   * Adds a display object as a named child to a container.
   * Enables retrieval by name for later reference.
   *
   * @param container The parent container
   * @param child The child display object
   * @param name The name to assign to the child
   */
  protected addNamedChild(
    container: PIXI.Container,
    child: PIXI.Container | PIXI.Graphics,
    name: string,
  ): void {
    child.label = name
    container.addChild(child)
  }

  /**
   * Retrieves a named child from a container.
   *
   * @param container The parent container
   * @param name The name of the child to retrieve
   * @returns The named child or undefined if not found
   */
  protected getNamedChild<T extends PIXI.Container | PIXI.Graphics>(
    container: PIXI.Container,
    name: string,
  ): T | undefined {
    return container.getChildByLabel(name) as T | undefined
  }

  /**
   * Creates a PIXI Graphics object with automatic cleanup on removal.
   * Graphics objects will automatically destroy themselves when removed from their parent.
   *
   * @returns A new PIXI.Graphics instance with cleanup behavior
   */
  protected createGraphics(): PIXI.Graphics {
    const graphics = new PIXI.Graphics()

    // Auto-cleanup when removed from parent
    // This is essential for preventing memory leaks
    graphics.on("removed", () => {
      graphics.destroy()
    })

    return graphics
  }

  /**
   * Creates a filled rectangle graphic.
   *
   * @param width Width of the rectangle
   * @param height Height of the rectangle
   * @param color Fill color in hexadecimal format
   * @param x X position (defaults to center horizontally)
   * @param y Y position (defaults to center vertically)
   * @returns A new Graphics object with the rectangle drawn
   */
  protected createRectangle(
    width: number,
    height: number,
    color: number,
    x?: number,
    y?: number,
  ): PIXI.Graphics {
    const graphics = this.createGraphics()
    x = x ?? -width / 2
    y = y ?? -height / 2
    return graphics.rect(x, y, width, height).fill(color)
  }

  /**
   * Creates a filled circle graphic.
   *
   * @param radius Radius of the circle
   * @param color Fill color in hexadecimal format
   * @param x X position (defaults to origin)
   * @param y Y position (defaults to origin)
   * @returns A new Graphics object with the circle drawn
   */
  protected createCircle(
    radius: number,
    color: number,
    x = 0,
    y = 0,
  ): PIXI.Graphics {
    const graphics = this.createGraphics()
    return graphics.circle(x, y, radius).fill(color)
  }

  /**
   * Creates a filled polygon graphic from coordinate points.
   *
   * @param points Array of coordinates in sequence
   * @param color Fill color in hexadecimal format
   * @returns A new Graphics object with the polygon drawn
   */
  protected createPolygon(points: number[], color: number): PIXI.Graphics {
    const graphics = this.createGraphics()
    return graphics.poly(points).fill(color)
  }

  /**
   * Creates a rectangular border outline without fill.
   *
   * @param width Width of the rectangle
   * @param height Height of the rectangle
   * @param strokeWidth Width of the border line
   * @param color Border color in hexadecimal format
   * @param alpha Transparency of the border (defaults to opaque)
   * @returns A new Graphics object with the border rectangle drawn
   */
  protected createBorderRectangle(
    width: number,
    height: number,
    strokeWidth: number,
    color: number,
    alpha = 1,
  ): PIXI.Graphics {
    const graphics = this.createGraphics()
    return graphics
      .rect(0, 0, width, height)
      .stroke({ width: strokeWidth, color, alpha })
  }

  /**
   * Creates a positioned container with a body graphic as its main child.
   * The body graphic is added as a named child for easy retrieval.
   *
   * @param x X position
   * @param y Y position
   * @param rotation Rotation in radians (optional)
   * @param bodyGraphic The graphic to use as the body
   * @returns A container with the body graphic as a named child
   */
  protected createStandardContainer(
    x: number,
    y: number,
    rotation: number | undefined = undefined,
    bodyGraphic: PIXI.Graphics,
  ): PIXI.Container {
    const container = new PIXI.Container()
    container.position.set(x, y)
    if (rotation !== undefined) {
      container.rotation = rotation
    }

    this.addNamedChild(container, bodyGraphic, "body")

    return container
  }

  /**
   * Updates a container's visual properties based on the item's current state.
   * Checks the needsRepaint flag and only calls repaintContainer if needed.
   *
   * @param container The PIXI container to update
   * @param item The game object with current state
   */
  protected updateContainer(container: PIXI.Container, item: T): void {
    // Check if item has needsRepaint property (for GameObject instances)
    if (
      typeof item === "object" &&
      item !== null &&
      "needsRepaint" in item &&
      (item as any).needsRepaint
    ) {
      this.repaintContainer(container, item)
      ;(item as any).needsRepaint = false
    } else if (
      typeof item !== "object" ||
      item === null ||
      !("needsRepaint" in item)
    ) {
      // For backwards compatibility with non-GameObject items, always repaint
      this.repaintContainer(container, item)
    }
  }

  /**
   * Repaints a container's visual properties based on the item's current state.
   * Default implementation performs no updates. Child classes should override
   * this method to implement specific repaint behavior.
   *
   * @param _container The PIXI container to repaint
   * @param _item The game object with current state
   */
  protected repaintContainer(_container: PIXI.Container, _item: T): void {
    // Default implementation performs no updates
  }

  /**
   * Completely destroys the renderer and cleans up all resources.
   * Removes all PIXI containers from the display tree and frees GPU memory.
   */
  public destroy(): void {
    const entries = Array.from(this.itemSprites.entries())
    for (const [id, container] of entries) {
      this.gameContainer.removeChild(container)
      container.destroy({ children: true })
      this.itemSprites.delete(id)
      this.items.delete(id)
    }
  }

  /**
   * Retrieves the PIXI container for a specific item.
   *
   * @param id Unique identifier of the item
   * @returns The PIXI container or undefined if not found
   */
  public getContainer(id: string): PIXI.Container | undefined {
    return this.itemSprites.get(id)
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
        const container = this.itemSprites.get(id)
        if (container) {
          this.updateContainer(container, item)
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
