import alea from "alea"

export class PRNG {
  protected rng: () => number
  protected seed: string = ""

  constructor(seed?: string) {
    this.rng = alea()
    if (seed) {
      this.initialize(seed)
    }
  }

  initialize(seed: string): void {
    this.seed = seed
    this.rng = alea(seed)
  }

  random(): number {
    const result = this.rng()
    return result
  }

  randomInt(min: number, max: number): number {
    const result = Math.floor(this.random() * (max - min + 1)) + min
    return result
  }

  randomChoice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot choose from empty array")
    }
    const index = this.randomInt(0, array.length - 1)
    const result = array[index]
    return result
  }

  randomFloat(min: number, max: number): number {
    const result = this.random() * (max - min) + min
    return result
  }

  randomBoolean(threshold: number = 0.5): boolean {
    const result = this.random() < threshold
    return result
  }
}
