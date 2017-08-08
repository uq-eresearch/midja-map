/**
Convert 2-ary function to take single tuple.
*/
const tupled2: (<T, U, V>(f1: (k:T, v:U) => V) => ((t: [T, U]) => V)) =
  f => t => f(t[0], t[1])

class WeightedMean {
  private readonly v: number
  private readonly w: number
  constructor(value: number, weight: number) {
    this.v = value
    this.w = weight
  }
  add(other: WeightedMean): WeightedMean {
    const nextWeight = this.w + other.w
    const nextValue =
      (
        (
          (this.v * this.w) +
          (other.v * other.w)
        ) /
        nextWeight
      )
    return new WeightedMean(nextValue, nextWeight)
  }
  get value(): number {
    return this.v
  }
}

export {
  tupled2,
  WeightedMean
}
