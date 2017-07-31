import mathjs from 'mathjs'

/**
Convert 2-ary function to take single tuple.
*/
const tupled2: (<T, U, V>(f1: (k:T, v:U) => V) => ((t: [T, U]) => V)) =
  f => t => f(t[0], t[1])

type MaybeBigNumber = number | mathjs.BigNumber
function toBigNumber(v: MaybeBigNumber): mathjs.BigNumber {
  return mathjs.bignumber(v as any)
}
function toNumber(v: MaybeBigNumber): number {
  return mathjs.number(v as any) as number
}

class WeightedMean {
  private readonly v: mathjs.BigNumber
  private readonly w: mathjs.BigNumber
  constructor(value: MaybeBigNumber, weight: MaybeBigNumber) {
    this.v = toBigNumber(value)
    this.w = toBigNumber(weight)
  }
  add(other: WeightedMean): WeightedMean {
    const nextWeight = mathjs.add(this.w, other.w)
    const nextValue =
      mathjs.divide(
        mathjs.add(
          mathjs.multiply(this.v, this.w),
          mathjs.multiply(other.v, other.w)
        ),
        nextWeight
      )
    return new WeightedMean(nextValue, nextWeight)
  }
  get value(): number {
    return toNumber(this.v)
  }
}

export {
  tupled2,
  toBigNumber,
  toNumber,
  WeightedMean
}
