import R from 'ramda'

const splitToTargets = correspondences =>
  (k, v) =>
    R.mapObjIndexed(
      R.multiply(v),
      (correspondences[k] || {})
    )


const transformerWith = correspondences =>
  R.pipe(
    R.toPairs,
    R.map(R.apply(splitToTargets(correspondences))),
    R.reduce(R.mergeWith(R.add), {})
  )

export { transformerWith }
