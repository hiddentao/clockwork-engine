# Feature: Add drawRoundRect Support

## Summary

Add rounded rectangle drawing capability to the rendering abstraction layer. This is needed for games that use rounded corners (e.g., potion bottles in snakes-on-a-chain).

## Files to Modify

### 1. `src/platform/RenderingLayer.ts`

Add the new method to the `RenderingLayer` interface in the "Primitives" section (after `drawPolygon`):

```typescript
drawRoundRect(
  id: NodeId,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill?: Color,
  stroke?: Color,
  strokeWidth?: number,
): void
```

### 2. `src/platform/DisplayNode.ts`

Add the wrapper method (after `drawPolygon`):

```typescript
drawRoundRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill?: Color,
  stroke?: Color,
  strokeWidth?: number,
): this {
  this.rendering.drawRoundRect(
    this.id,
    x,
    y,
    width,
    height,
    radius,
    fill,
    stroke,
    strokeWidth,
  )
  return this
}
```

### 3. `src/platform/web/PixiRenderingLayer.ts`

**Update `NodeState` interface** - add `"roundRect"` to the graphicsCommands type union:

```typescript
graphicsCommands: Array<{
  type: "rectangle" | "roundRect" | "circle" | "polygon" | "line" | "polyline"
  data: any
}>
```

**Add the method** (after `drawPolygon`):

```typescript
drawRoundRect(
  id: NodeId,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill?: Color,
  stroke?: Color,
  strokeWidth?: number,
): void {
  const state = this.nodes.get(id)
  if (!state) return

  this.ensureGraphics(state)

  state.graphicsCommands.push({
    type: "roundRect",
    data: { x, y, width, height, radius, fill, stroke, strokeWidth },
  })

  this.redrawGraphics(state)
  this._needsRepaint = true
}
```

**Update `redrawGraphics` method** - add case in the switch statement:

```typescript
case "roundRect": {
  const { x, y, width, height, radius, fill, stroke, strokeWidth } = cmd.data
  if (fill !== undefined) {
    state.graphics.roundRect(x, y, width, height, radius)
    state.graphics.fill(normalizeColor(fill))
  }
  if (stroke !== undefined) {
    state.graphics.roundRect(x, y, width, height, radius)
    state.graphics.stroke({
      width: strokeWidth ?? 1,
      color: normalizeColor(stroke),
    })
  }
  break
}
```

### 4. `src/platform/memory/MemoryRenderingLayer.ts`

**Update `GraphicsCommand` interface**:

```typescript
interface GraphicsCommand {
  type: "rectangle" | "roundRect" | "circle" | "polygon" | "line" | "polyline"
  data: any
}
```

**Add the method** (after `drawPolygon`):

```typescript
drawRoundRect(
  id: NodeId,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill?: Color,
  stroke?: Color,
  strokeWidth?: number,
): void {
  const node = this.nodes.get(id)
  if (node) {
    node.graphics.push({
      type: "roundRect",
      data: { x, y, w, h, radius, fill, stroke, strokeWidth },
    })
  }
}
```

### 5. `tests/platform/MemoryRenderingLayer.test.ts`

Add test in the "Graphics Primitives" describe block:

```typescript
it("should draw rounded rectangle", () => {
  const node = rendering.createNode()
  rendering.drawRoundRect(node, 10, 20, 100, 50, 8, 0xff0000, 0x000000, 2)

  const graphics = rendering.getGraphics(node)
  expect(graphics.length).toBe(1)
  expect(graphics[0].type).toBe("roundRect")
  expect(graphics[0].data.x).toBe(10)
  expect(graphics[0].data.y).toBe(20)
  expect(graphics[0].data.w).toBe(100)
  expect(graphics[0].data.h).toBe(50)
  expect(graphics[0].data.radius).toBe(8)
  expect(graphics[0].data.fill).toBe(0xff0000)
  expect(graphics[0].data.stroke).toBe(0x000000)
  expect(graphics[0].data.strokeWidth).toBe(2)
})

it("should draw rounded rectangle with only fill", () => {
  const node = rendering.createNode()
  rendering.drawRoundRect(node, 0, 0, 50, 50, 5, 0x00ff00)

  const graphics = rendering.getGraphics(node)
  expect(graphics.length).toBe(1)
  expect(graphics[0].data.fill).toBe(0x00ff00)
  expect(graphics[0].data.stroke).toBeUndefined()
})

it("should clear rounded rectangles with clearGraphics", () => {
  const node = rendering.createNode()
  rendering.drawRoundRect(node, 0, 0, 100, 100, 10)
  rendering.clearGraphics(node)

  const graphics = rendering.getGraphics(node)
  expect(graphics.length).toBe(0)
})
```

## Verification

1. Run `bun run lint` to check types
2. Run `bun test` to verify all tests pass
3. Run `bun run build` to ensure dist is updated
