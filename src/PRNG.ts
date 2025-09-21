import alea from "alea"

export class PRNG {
  public static debug: boolean = false
  protected rng: () => number
  protected seed: string = ""

  constructor(seed?: string) {
    this.rng = alea()
    if (seed) {
      this.reset(seed)
    }
  }

  reset(seed: string): void {
    this.seed = seed
    this.rng = alea(seed)
    if (PRNG.debug) {
      console.log(`PRNG.reset() with seed: ${seed}`)
    }
  }

  random(): number {
    const result = this.rng()
    if (PRNG.debug) {
      console.log(`PRNG.random(): ${result}`)
    }
    return result
  }

  randomInt(min: number, max: number): number {
    const result = Math.floor(this.random() * (max - min + 1)) + min
    if (PRNG.debug) {
      console.log(`PRNG.randomInt(${min}, ${max}): ${result}`)
    }
    return result
  }

  randomChoice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot choose from empty array")
    }
    const index = this.randomInt(0, array.length - 1)
    const result = array[index]
    if (PRNG.debug) {
      console.log(
        `PRNG.randomChoice(array[${array.length}]): index=${index}, value=${result}`,
      )
    }
    return result
  }

  randomFloat(min: number, max: number): number {
    const result = this.random() * (max - min) + min
    if (PRNG.debug) {
      console.log(`PRNG.randomFloat(${min}, ${max}): ${result}`)
    }
    return result
  }

  randomBoolean(threshold: number = 0.5): boolean {
    const result = this.random() < threshold
    if (PRNG.debug) {
      console.log(`PRNG.randomBoolean(${threshold}): ${result}`)
    }
    return result
  }
}
