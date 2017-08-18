import * as R from 'ramda'
import '../types'

export function mergeIndexes(
      a: AttributeIndex,
      b: AttributeIndex): AttributeIndex {
  return R.mergeDeepWith(
    (a: any, b: any) => {
      if (R.isNil(a)) {
        return b
      } else if (R.all(R.is(Array), [a, b])) {
        return a.concat(b)
      } else {
        return a
      }
    },
    a, b
  )
}
