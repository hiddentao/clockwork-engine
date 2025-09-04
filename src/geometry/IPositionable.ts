import { Vector2D } from "./Vector2D"

export interface IPositionable {
  getPosition: () => Vector2D
  getSize: () => Vector2D
}
