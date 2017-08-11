declare module 'numeric' {
  interface SVD {
    U: number[][]
    S: number[]
    V: number[][]
  }
  export function svd(x: number[][]): SVD
}
