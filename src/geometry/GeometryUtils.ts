import { Vector2D } from "./Vector2D"

/**
 * Vector math and geometry utilities
 */
export class Geometry {
  /**
   * Check if a line segment intersects a rectangle
   */
  static lineIntersectsRectangle(
    lineStart: Vector2D,
    lineEnd: Vector2D,
    rectCenter: Vector2D,
    rectSize: Vector2D,
  ): boolean {
    // Calculate rectangle corners
    const halfWidth = rectSize.x / 2
    const halfHeight = rectSize.y / 2

    const rectLeft = rectCenter.x - halfWidth
    const rectRight = rectCenter.x + halfWidth
    const rectTop = rectCenter.y - halfHeight
    const rectBottom = rectCenter.y + halfHeight

    // Check if the line intersects any of the rectangle's edges
    return (
      Geometry.lineIntersectsLine(
        lineStart,
        lineEnd,
        new Vector2D(rectLeft, rectTop),
        new Vector2D(rectRight, rectTop),
      ) ||
      Geometry.lineIntersectsLine(
        lineStart,
        lineEnd,
        new Vector2D(rectRight, rectTop),
        new Vector2D(rectRight, rectBottom),
      ) ||
      Geometry.lineIntersectsLine(
        lineStart,
        lineEnd,
        new Vector2D(rectRight, rectBottom),
        new Vector2D(rectLeft, rectBottom),
      ) ||
      Geometry.lineIntersectsLine(
        lineStart,
        lineEnd,
        new Vector2D(rectLeft, rectBottom),
        new Vector2D(rectLeft, rectTop),
      )
    )
  }

  /**
   * Check if two line segments intersect
   */
  static lineIntersectsLine(
    a1: Vector2D,
    a2: Vector2D,
    b1: Vector2D,
    b2: Vector2D,
  ): boolean {
    // Line segment intersection using cross product method
    const ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)
    const ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)
    const u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y)

    // If u_b is 0, the lines are parallel
    if (u_b !== 0) {
      const ua = ua_t / u_b
      const ub = ub_t / u_b

      // If both ua and ub are between 0 and 1, the lines intersect
      if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        return true
      }
    }

    return false
  }

  /**
   * Smooth direction changes to prevent oscillation
   */
  static smoothDirection(
    currentDirection: number,
    targetDirection: number,
    factor: number,
  ): number {
    // Use Vector2D methods for angle calculations
    currentDirection = Vector2D.normalizeAngle(currentDirection)
    targetDirection = Vector2D.normalizeAngle(targetDirection)

    // Get the angle difference and apply smoothing
    const diff = Vector2D.angleDifference(currentDirection, targetDirection)

    // Apply smoothing factor
    return Vector2D.normalizeAngle(currentDirection + diff * factor)
  }

  /**
   * Blend between two angles based on a factor (0-1)
   * @param angle1 First angle in radians
   * @param angle2 Second angle in radians
   * @param factor Blend factor (0 = all angle1, 1 = all angle2)
   */
  static blendAngles(angle1: number, angle2: number, factor: number): number {
    // Ensure factor is between 0 and 1
    factor = Math.max(0, Math.min(1, factor))

    // Use Vector2D.angleDifference to get the difference
    const diff = Vector2D.angleDifference(angle1, angle2)

    // Blend the angles
    return Vector2D.normalizeAngle(angle1 + diff * factor)
  }

  /**
   * Check if two rectangular objects overlap
   */
  static objectsOverlap(
    pos1: Vector2D,
    size1: Vector2D,
    pos2: Vector2D,
    size2: Vector2D,
  ): boolean {
    const halfWidth1 = size1.x / 2
    const halfHeight1 = size1.y / 2
    const halfWidth2 = size2.x / 2
    const halfHeight2 = size2.y / 2

    const left1 = pos1.x - halfWidth1
    const right1 = pos1.x + halfWidth1
    const top1 = pos1.y - halfHeight1
    const bottom1 = pos1.y + halfHeight1

    const left2 = pos2.x - halfWidth2
    const right2 = pos2.x + halfWidth2
    const top2 = pos2.y - halfHeight2
    const bottom2 = pos2.y + halfHeight2

    // Check for overlap
    return !(
      right1 < left2 ||
      left1 > right2 ||
      bottom1 < top2 ||
      top1 > bottom2
    )
  }

  /**
   * Calculate a future position based on current position, direction and distance
   */
  static calculateFuturePosition(
    currentPosition: Vector2D,
    direction: number,
    distance: number,
  ): Vector2D {
    return new Vector2D(
      currentPosition.x + Math.cos(direction) * distance,
      currentPosition.y + Math.sin(direction) * distance,
    )
  }

  /**
   * Determine the closest edge of a rectangle to a point
   * @param position Point position
   * @param rectCenter Rectangle center position
   * @param rectSize Rectangle size
   * @returns 'left', 'right', 'top', or 'bottom'
   */
  static determineClosestEdge(
    position: Vector2D,
    rectCenter: Vector2D,
    rectSize: Vector2D,
  ): string {
    const dx = position.x - rectCenter.x
    const dy = position.y - rectCenter.y

    // Convert to relative coordinates (where rectangle is centered at origin)
    const relX = dx / (rectSize.x / 2)
    const relY = dy / (rectSize.y / 2)

    // Determine the closest edge by comparing relative distances
    if (Math.abs(relX) > Math.abs(relY)) {
      // Closer to left/right edge
      return dx > 0 ? "right" : "left"
    } else {
      // Closer to top/bottom edge
      return dy > 0 ? "bottom" : "top"
    }
  }
}
