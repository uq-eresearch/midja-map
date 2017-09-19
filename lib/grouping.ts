import R from 'ramda'
import { ckmeans } from 'simple-statistics'

export function groupSingular<T>(
    numGroups: number,
    objs: T[],
    fValue: (obj: T) => number): T[][] {
  const groups = ckmeans(R.map(fValue, objs), numGroups)
  return R.reduce(
    (groupedObjs: T[][], obj: T) => {
      const i = R.findIndex(R.contains(fValue(obj)), groups)
      return R.over(
        R.lensIndex(i),
        R.append(obj),
        groupedObjs
      )
    },
    R.repeat([], numGroups) as T[][],
    objs
  )
}
