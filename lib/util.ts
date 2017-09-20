type F2<A, B, Z> = (a:A, b:B) => Z
type F3<A, B, C, Z> = (a:A, b:B, c:C) => Z
type TF2<A, B, Z> = (t: [A, B]) => Z
type TF3<A, B, C, Z> = (t: [A, B, C]) => Z

/**
Convert 2-ary function to take single tuple.
*/
export const tupled2: (<A, B, Z>(f1: F2<A,B,Z>) => TF2<A,B,Z>) =
  f => t => f(t[0], t[1])

/**
Convert 3-ary function to take single tuple.
*/
export const tupled3: (<A, B, C, Z>(f1: F3<A,B,C,Z>) => TF3<A,B,C,Z>) =
  f => t => f(t[0], t[1], t[2])

export function fromPromiseMap<T>(
    m:{[k: string]: Promise<T>}): Promise<{[k: string]: T}> {
  const ks = [] as string[]
  const ps = [] as Promise<T>[]
  for (let k in m) {
    ks.push(k)
    ps.push(m[k])
  }
  return Promise.all(ps).then((vs: T[]) => {
    const out = {} as {[k: string]: T}
    for (let i = 0; i < ks.length; i++) {
      out[ks[i]] = vs[i]
    }
    return out
  })
}

export class WeightedMean {
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
