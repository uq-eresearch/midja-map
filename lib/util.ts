/**
Convert 2-ary function to take single tuple.
*/
const tupled2: (<T, U, V>(f1: (k:T, v:U) => V) => ((t: [T, U]) => V)) =
  f => t => f(t[0], t[1])


export {
  tupled2
}
