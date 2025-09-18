/**
 * Base interface for rendering game objects in a PIXI.js display system.
 * Provides a standardized API for managing visual representations of game entities.
 *
 * @template T The type of item being rendered (e.g., Consumable, Obstacle, Snake)
 */
export interface BaseRenderer<T> {
  /**
   * Adds a new item to the renderer, creating its visual representation.
   * If the item already exists, delegates to update() instead.
   * Creates a new PIXI container, adds it to the game display, and tracks it internally.
   *
   * @param item The game object to render
   */
  add(item: T): void

  /**
   * Updates an existing item's visual representation.
   * Modifies the existing PIXI container properties (position, visibility, color, etc.)
   * without recreating the entire display object.
   *
   * @param item The game object with updated state
   */
  update(item: T): void

  /**
   * Removes an item from the renderer by its unique identifier.
   * Destroys the PIXI container, removes it from the display tree,
   * and cleans up all internal references to prevent memory leaks.
   *
   * @param id Unique identifier of the item to remove
   */
  remove(id: string): void

  /**
   * Replaces all rendered items with a new set in a single operation.
   * Efficiently handles additions, updates, and removals by comparing
   * the new item list against currently rendered items.
   * Removes items not in the new set, updates existing items, and adds new ones.
   *
   * @param items Array of all items that should be currently rendered
   */
  setItems(items: T[]): void

  /**
   * Forces a complete visual refresh of all currently rendered items.
   * Calls the update logic for every tracked item without changing
   * the set of rendered items. Useful for applying global visual changes
   * like theme updates or effect modifications.
   */
  rerender(): void

  /**
   * Extracts a unique identifier from a game object.
   * Used internally for tracking rendered items and preventing duplicates.
   * Implementation varies by renderer type (position-based, object ID, constant).
   *
   * @param item The game object to identify
   * @returns Unique string identifier for the item
   */
  getId(item: T): string

  /**
   * Completely clears the renderer and cleans up all resources.
   * Removes all PIXI containers from the display tree, destroys them
   * to free GPU memory, and clears all internal tracking maps.
   * Should be called when the renderer is no longer needed.
   */
  clear(): void
}
