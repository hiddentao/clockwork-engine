/**
 * Display Node
 *
 * OOP-style wrapper around NodeId providing fluent interface for rendering operations.
 * All methods delegate to the underlying RenderingLayer.
 */

import type { RenderingLayer } from "./RenderingLayer"
import type {
  BlendMode,
  Color,
  NodeId,
  TextureFiltering,
  TextureId,
} from "./types"

export class DisplayNode {
  constructor(
    private readonly id: NodeId,
    private readonly rendering: RenderingLayer,
  ) {}

  // Hierarchy (fluent interface)
  addChild(child: DisplayNode): this {
    this.rendering.addChild(this.id, child.id)
    return this
  }

  removeChild(child: DisplayNode): this {
    this.rendering.removeChild(this.id, child.id)
    return this
  }

  destroy(): void {
    this.rendering.destroyNode(this.id)
  }

  // Transform (fluent interface)
  setPosition(x: number, y: number): this {
    this.rendering.setPosition(this.id, x, y)
    return this
  }

  setRotation(radians: number): this {
    this.rendering.setRotation(this.id, radians)
    return this
  }

  setScale(scaleX: number, scaleY?: number): this {
    this.rendering.setScale(this.id, scaleX, scaleY ?? scaleX)
    return this
  }

  setAnchor(anchorX: number, anchorY: number): this {
    this.rendering.setAnchor(this.id, anchorX, anchorY)
    return this
  }

  setAlpha(alpha: number): this {
    this.rendering.setAlpha(this.id, alpha)
    return this
  }

  setVisible(visible: boolean): this {
    this.rendering.setVisible(this.id, visible)
    return this
  }

  setZIndex(z: number): this {
    this.rendering.setZIndex(this.id, z)
    return this
  }

  // Size (fluent interface)
  setSize(width: number, height: number): this {
    this.rendering.setSize(this.id, width, height)
    return this
  }

  getSize(): { width: number; height: number } {
    return this.rendering.getSize(this.id)
  }

  // Visual effects (fluent interface)
  setTint(color: Color): this {
    this.rendering.setTint(this.id, color)
    return this
  }

  setBlendMode(mode: BlendMode): this {
    this.rendering.setBlendMode(this.id, mode)
    return this
  }

  setTextureFiltering(filtering: TextureFiltering): this {
    this.rendering.setTextureFiltering(this.id, filtering)
    return this
  }

  // Bounds query
  getBounds(): { x: number; y: number; width: number; height: number } {
    return this.rendering.getBounds(this.id)
  }

  // Visual content (fluent interface)
  setSprite(textureId: TextureId): this {
    this.rendering.setSprite(this.id, textureId)
    return this
  }

  setAnimatedSprite(textureIds: TextureId[], ticksPerFrame: number): this {
    this.rendering.setAnimatedSprite(this.id, textureIds, ticksPerFrame)
    return this
  }

  playAnimation(loop: boolean = false): this {
    this.rendering.playAnimation(this.id, loop)
    return this
  }

  stopAnimation(): this {
    this.rendering.stopAnimation(this.id)
    return this
  }

  // Primitives (fluent interface)
  drawRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): this {
    this.rendering.drawRectangle(
      this.id,
      x,
      y,
      width,
      height,
      fill,
      stroke,
      strokeWidth,
    )
    return this
  }

  drawCircle(
    x: number,
    y: number,
    radius: number,
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): this {
    this.rendering.drawCircle(this.id, x, y, radius, fill, stroke, strokeWidth)
    return this
  }

  drawPolygon(
    points: number[],
    fill?: Color,
    stroke?: Color,
    strokeWidth?: number,
  ): this {
    this.rendering.drawPolygon(this.id, points, fill, stroke, strokeWidth)
    return this
  }

  // Line drawing (fluent interface)
  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Color,
    width?: number,
  ): this {
    this.rendering.drawLine(this.id, x1, y1, x2, y2, color, width)
    return this
  }

  drawPolyline(points: number[], color: Color, width?: number): this {
    this.rendering.drawPolyline(this.id, points, color, width)
    return this
  }

  clearGraphics(): this {
    this.rendering.clearGraphics(this.id)
    return this
  }

  // Access
  getId(): NodeId {
    return this.id
  }

  getNodeId(): NodeId {
    return this.id
  }

  getRendering(): RenderingLayer {
    return this.rendering
  }
}
