# Rendering System Architecture

The Clockwork engine provides a complete 2D rendering system built on PIXI.js, designed for high-performance game graphics with deterministic behavior.

## Core Components

### GameCanvas

`GameCanvas` is an abstract base class that creates and manages a PIXI.js application with viewport controls.

**Key Features:**
- PIXI.js application lifecycle management
- Viewport integration with pixi-viewport for camera controls (pan, zoom, drag)
- Automatic update loop integration with game engine
- Responsive canvas resizing
- Event handling and user input processing
- Game layer initialization through abstract methods

**Usage:**
```typescript
class MyGameCanvas extends GameCanvas {
  protected initializeGameLayers(): void {
    // Register renderers for different game object types
    this.addRenderer("Player", new PlayerRenderer(this.gameContainer))
    this.addRenderer("Enemy", new EnemyRenderer(this.gameContainer))
  }
}

// Create canvas instance
const canvas = await MyGameCanvas.create(domElement, {
  width: 800,
  height: 600,
  worldWidth: 2000,
  worldHeight: 2000,
  backgroundColor: 0x1a1a2e,
  antialias: false,
  enableDrag: true,
  enablePinch: true,
  enableWheel: true,
  minZoom: 0.5,
  maxZoom: 2.0,
  initialZoom: 1.0
})
```

### AbstractRenderer<T>

`AbstractRenderer<T>` is a generic base class for creating game object renderers with built-in PIXI container management.

**Key Features:**
- Generic typing for specific game object types
- Automatic PIXI container lifecycle management
- Helper methods for common graphics operations
- Efficient batch operations (add/update/remove/setItems)
- Named child management for complex graphics

**Required Methods:**
- `create(gameObject: T): PIXI.Container` - Creates initial PIXI graphics
- `getId(gameObject: T): string` - Returns unique identifier for the game object

**Optional Methods:**
- `updateContainer(container: PIXI.Container, gameObject: T): void` - Updates existing container

**Helper Methods:**
- `createRectangle(width, height, color, x?, y?)` - Creates rectangle graphics
- `createCircle(radius, color, x?, y?)` - Creates circle graphics
- `addNamedChild(parent, child, name)` - Adds child with name reference
- `getNamedChild(parent, name)` - Retrieves child by name

**Example Implementation:**
```typescript
export class SnakeRenderer extends AbstractRenderer<Snake> {
  constructor(gameContainer: PIXI.Container) {
    super(gameContainer)
  }

  protected create(snake: Snake): PIXI.Container {
    const container = new PIXI.Container()
    this.updateSnakeSegments(container, snake)
    return container
  }

  protected updateContainer(container: PIXI.Container, snake: Snake): void {
    this.updateSnakeSegments(container, snake)
  }

  private updateSnakeSegments(container: PIXI.Container, snake: Snake): void {
    const segments = snake.getSegments()
    const cellSize = GAME_CONFIG.CELL_SIZE

    // Clear existing segments
    container.removeChildren()

    // Create graphics for each segment
    segments.forEach((segment, index) => {
      const isHead = index === 0
      const color = isHead ? 0x00ff00 : 0x008800

      const segmentGraphic = this.createRectangle(
        cellSize - 2,
        cellSize - 2,
        color,
        1, // center within cell
        1
      )

      const segmentContainer = new PIXI.Container()
      segmentContainer.position.set(
        segment.position.x * cellSize,
        segment.position.y * cellSize
      )

      segmentContainer.addChild(segmentGraphic)
      container.addChild(segmentContainer)
    })
  }

  public getId(snake: Snake): string {
    return snake.getId()
  }
}
```

### BaseRenderer Interface

`BaseRenderer` defines the standard interface that all renderers must implement:

```typescript
interface BaseRenderer {
  add(item: any): void
  update(item: any): void
  remove(itemId: string): void
  setItems(items: any[]): void
}
```

## Positioning and Coordinates

The rendering system uses a grid-based coordinate system where:

- **Game coordinates** are logical positions (e.g., grid cells)
- **PIXI coordinates** are pixel positions on screen
- **Conversion**: `pixelPosition = gamePosition * cellSize`

### Best Practices for Positioning

1. **Grid-aligned objects** (walls, tiles):
   ```typescript
   container.position.set(
     gamePosition.x * cellSize,
     gamePosition.y * cellSize
   )
   ```

2. **Centered objects** (circles, sprites):
   ```typescript
   container.position.set(
     gamePosition.x * cellSize + cellSize / 2,
     gamePosition.y * cellSize + cellSize / 2
   )
   ```

3. **Inset objects** (with borders):
   ```typescript
   const graphic = this.createRectangle(
     cellSize - 2, // smaller size
     cellSize - 2,
     color,
     1, // offset to center
     1
   )
   ```

## Integration with Game Engine

The rendering system integrates seamlessly with the Clockwork game engine:

### Canvas Setup
```typescript
// 1. Create game engine
const engine = new MyGameEngine()

// 2. Create and configure canvas
const canvas = await MyGameCanvas.create(domElement, config)

// 3. Associate engine with canvas
canvas.setGameEngine(engine)

// 4. Engine automatically calls renderers during update loop
```

### Automatic Rendering
The GameCanvas automatically:
- Calls renderers when game objects are added/updated/removed
- Manages PIXI container lifecycle
- Handles viewport updates and camera controls
- Processes user input events

### Renderer Registration
Renderers are registered by game object type in `initializeGameLayers()`:

```typescript
protected initializeGameLayers(): void {
  // Type string must match GameObject.getType()
  this.addRenderer("Snake", new SnakeRenderer(this.gameContainer))
  this.addRenderer("Apple", new AppleRenderer(this.gameContainer))
  this.addRenderer("Wall", new WallRenderer(this.gameContainer))
}
```

## Performance Considerations

### Efficient Updates
- Use `updateContainer()` for dynamic objects that change frequently
- Minimize `removeChildren()` calls - reuse containers when possible
- Use object pooling for frequently created/destroyed objects

### Graphics Optimization
- Use `PIXI.Graphics` for simple shapes
- Use `PIXI.Sprite` for textured objects
- Consider `PIXI.ParticleContainer` for many similar objects
- Set `antialias: false` for pixel-perfect graphics

### Memory Management
- AbstractRenderer automatically handles container cleanup
- Use `destroy()` methods on PIXI objects when manually managing lifecycle
- Avoid memory leaks by removing event listeners

## Example: Complete Renderer Implementation

```typescript
export class AppleRenderer extends AbstractRenderer<Apple> {
  constructor(gameContainer: PIXI.Container) {
    super(gameContainer)
  }

  protected create(apple: Apple): PIXI.Container {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = apple.getPosition()

    // Create container positioned at cell center
    const container = new PIXI.Container()
    container.position.set(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2
    )

    // Create main apple body
    const appleBody = this.createCircle(
      (cellSize - 4) / 2, // radius
      0xff0000 // red color
    )
    this.addNamedChild(container, appleBody, "body")

    // Create highlight
    const highlight = this.createCircle(
      (cellSize - 4) / 8, // smaller radius
      0xff6666, // lighter red
      -(cellSize - 4) / 6, // offset left
      -(cellSize - 4) / 6  // offset up
    )
    this.addNamedChild(container, highlight, "highlight")

    return container
  }

  protected updateContainer(container: PIXI.Container, apple: Apple): void {
    const cellSize = GAME_CONFIG.CELL_SIZE
    const position = apple.getPosition()
    
    // Update position
    container.position.set(
      position.x * cellSize + cellSize / 2,
      position.y * cellSize + cellSize / 2
    )

    // Update alpha based on age
    container.alpha = apple.getAlpha()

    // Apply pulse effect
    const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.9
    const body = this.getNamedChild(container, "body")
    const highlight = this.getNamedChild(container, "highlight")

    if (body) body.scale.set(pulse)
    if (highlight) highlight.scale.set(pulse)
  }

  public getId(apple: Apple): string {
    return apple.getId()
  }
}
```

This rendering system provides a powerful, flexible foundation for creating high-performance 2D games with the Clockwork engine.