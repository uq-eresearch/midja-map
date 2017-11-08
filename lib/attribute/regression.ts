import * as R from 'ramda'
import { svd } from 'numeric'
import mathjs from 'mathjs'
import { rSquared } from 'simple-statistics'
import '../types'

class MultipleLinearEquation {
  readonly coefficients: number[]
  readonly intercept: number
  constructor(coeff: number[], b: number) {
    this.coefficients = coeff
    this.intercept = b
  }
  f: (vs: number[]) => number = (vs: number[]) => {
    if (vs.length != this.coefficients.length) {
      throw Error(
        `${this.coefficients.length} coefficients present, `+
        `but ${vs.length} values provided!`)
    }
    return R.reduce<number, number>(
      R.add,
      this.intercept,
      R.map(
        R.reduce(R.multiply, 1),
        R.zip(this.coefficients, vs)
      )
    )
  }
}

function multipleLinearRegression(
    dependantVariable: NumericAttributeData,
    independantVariables: NumericAttributeData[]) {
  const keysWhereFinite = (data: NumericAttributeData) =>
    R.keys(R.pickBy(isFinite, data))
  const sharedKeys = R.reduce(
    (ks: string[], independantVariable: NumericAttributeData) =>
      R.intersection(ks, keysWhereFinite(independantVariable)),
    keysWhereFinite(dependantVariable),
    independantVariables
  )
  const propsF: (obj: any) => number[] = R.props(sharedKeys)
  const x: number[][] = R.transpose(
    R.append(
      R.repeat(1, sharedKeys.length),
      R.map(
        propsF,
        independantVariables
      )
    )
  )
  const y: number[][] = R.map((v: number) => [v], propsF(dependantVariable))
  const weights = solveLeastSquare(x, y)
  const equation = new MultipleLinearEquation(
    R.take(independantVariables.length, R.pluck(0, weights)),
    R.last(weights)[0]
  )
  const data: [number[], number][] =
    R.zipWith<number[], number[], [number[], number]>(
      (x: number[], y: number[]) =>
        [R.take(independantVariables.length, x), y[0]],
      x,
      y)
  return {
    keySet: sharedKeys,
    equation: equation,
    adjustedRSquared: adjustedRSquared(
      rSquared(data, equation.f),
      x.length,
      independantVariables.length
    )
  }
}

function solveLeastSquare(X: number[][], Y: number[][]): number[][] {
  // Note S is a scalar, not the sigma you'll find at
  // https://en.wikipedia.org/wiki/Singular_value_decomposition
  const { U, S, V } = svd(X)
  const invS = R.map((x: number) => x == 0 ? 0 : 1/x, S)
  const pseudoInverseX = mathjs.multiply(
    R.map<number[], number[]>(
      R.zipWith<number,number,number>(R.multiply, invS),
      V),
    mathjs.transpose(U)
  )
  return (mathjs.multiply(mathjs.matrix(pseudoInverseX), Y).valueOf() as number[][])
}

/**
 * @param r2  {number}  R-squared
 * @param n   {number}  number of data points
 * @param k   {number}  number of independant variables
 */
function adjustedRSquared(r2: number, n: number, k: number) {
  return 1 - (((1-r2)*(n-1)) / (n - k - 1))
}

export {
  multipleLinearRegression
}
