export class Vector2D {
  public x: number
  public y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y)
  }

  public subtract(other: Vector2D): Vector2D {
    return new Vector2D(this.x - other.x, this.y - other.y)
  }

  public scale(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar)
  }

  public dot(other: Vector2D): number {
    return this.x * other.x + this.y * other.y
  }

  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  public distance(other: Vector2D): number {
    return Vector2D.distance(this, other)
  }

  public normalize(): Vector2D {
    const len = this.length()
    if (len === 0) {
      return new Vector2D(0, 0)
    }
    return new Vector2D(this.x / len, this.y / len)
  }

  public rotate(angle: number): Vector2D {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return new Vector2D(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos,
    )
  }

  /**
   * Calculate the angle of this vector in radians
   * @returns The angle in radians [-PI, PI]
   */
  public angle(): number {
    return Math.atan2(this.y, this.x)
  }

  /**
   * Calculate the angle between this vector and another vector
   * @param other The other vector
   * @returns The angle in radians between the two vectors
   */
  public angleBetween(other: Vector2D): number {
    return Math.atan2(other.y - this.y, other.x - this.x)
  }

  public clone(): Vector2D {
    return new Vector2D(this.x, this.y)
  }

  public toString(): string {
    return `(${this.x}, ${this.y})`
  }

  /**
   * Serialize this Vector2D to a plain object
   */
  public serialize(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }

  /**
   * Deserialize a plain object to a Vector2D
   */
  public static deserialize(data: { x: number; y: number }): Vector2D {
    return new Vector2D(data.x, data.y)
  }

  /**
   * Calculate distance between two vectors
   */
  public static distance(v1: Vector2D, v2: Vector2D): number {
    const dx = v1.x - v2.x
    const dy = v1.y - v2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Calculate squared distance between two vectors (more efficient for comparisons)
   */
  public static distanceSquared(v1: Vector2D, v2: Vector2D): number {
    const dx = v1.x - v2.x
    const dy = v1.y - v2.y
    return dx * dx + dy * dy
  }

  /**
   * Check if two positions are within a specified distance of each other
   * @param v1 First position
   * @param v2 Second position
   * @param distance Maximum distance between positions
   * @returns True if the positions are within the specified distance
   */
  public static isWithinDistance(
    v1: Vector2D,
    v2: Vector2D,
    distance: number,
  ): boolean {
    return Vector2D.distanceSquared(v1, v2) <= distance * distance
  }

  /**
   * Normalize angle to (-PI, PI) range
   */
  public static normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI
    while (angle < -Math.PI) angle += 2 * Math.PI
    return angle
  }

  /**
   * Calculate the shortest angle difference between two angles
   * @param angle1 First angle in radians
   * @param angle2 Second angle in radians
   * @returns The shortest angle difference in radians
   */
  public static angleDifference(angle1: number, angle2: number): number {
    // Normalize both angles to (-PI, PI) range
    angle1 = Vector2D.normalizeAngle(angle1)
    angle2 = Vector2D.normalizeAngle(angle2)

    // Find the shortest angle difference
    let diff = angle2 - angle1
    if (diff > Math.PI) diff -= 2 * Math.PI
    if (diff < -Math.PI) diff += 2 * Math.PI

    return diff
  }
}
