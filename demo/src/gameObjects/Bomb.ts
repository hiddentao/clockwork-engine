import type { GameEngineInterface } from "@hiddentao/clockwork-engine"
import { GameObject, Vector2D } from "@hiddentao/clockwork-engine"

export class Bomb extends GameObject {
  constructor(id: string, position: Vector2D, engine?: GameEngineInterface) {
    super(id, position, new Vector2D(1, 1), 1, engine)
  }

  getType(): string {
    return "Bomb"
  }

  // Serialization
  serialize() {
    return {
      ...super.serialize(),
    }
  }

  static deserialize(data: any): Bomb {
    const bomb = new Bomb(data.id, Vector2D.deserialize(data.position))
    return bomb
  }
}
