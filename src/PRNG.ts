import alea from "alea"

export class PRNG {
  private rng: () => number

  constructor(seed?: string) {
    this.rng = alea()
    if (seed) {
      this.initialize(seed)
    }
  }

  initialize(seed: string): void {
    this.rng = alea(seed)
  }

  random(): number {
    return this.rng()
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min
  }

  randomChoice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot choose from empty array")
    }
    const index = this.randomInt(0, array.length - 1)
    return array[index]
  }

  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min
  }

  randomBoolean(): boolean {
    return this.random() < 0.5
  }
}
