import R from 'ramda'
import '../types'
import { tupled2 } from '../util'

const splitSourceToTargets:
    (correspondences: Correspondences) =>
    (source: string, sv: number) => AttributeData =
  correspondences =>
    (source, sv) =>
      R.mapObjIndexed(
        R.multiply(sv),
        (correspondences[source] || {})
      )

const transformerWith:
    (correspondences: Correspondences) =>
    (sourceData: AttributeData) => AttributeData =
  correspondences =>
    R.pipe(
      R.toPairs,
      R.map(tupled2(splitSourceToTargets(correspondences))),
      R.reduce(R.mergeWith(R.add), {})
    )

export { transformerWith }
