
declare namespace SimpleStatistics {

  function ckmeans(x: number[], nClusters: number): number[][]

  function linearRegression(
    data: [number, number][]): { m: number, b: number }

  function linearRegressionLine(
    mb: { m: number, b: number }): (x: number) => number

  function rSquared<T>(data: [T, number][], f: (dep: T) => number): number

}

declare module 'simple-statistics' {
  export = SimpleStatistics
}
