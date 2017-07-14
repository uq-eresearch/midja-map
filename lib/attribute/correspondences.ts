import R from 'ramda'
import '../types'
import { tupled2 } from '../util'

interface Correspondence {
  source: string,
  target: string,
  proportion: number
}

const splitSourceToTargets:
    (correspondences: (source: string) => {[target: string]: number}) =>
    (source: string, sv: number) => AttributeData =
  correspondences =>
    (source, sv) =>
      R.mapObjIndexed(
        R.multiply(sv),
        correspondences(source)
      )

const flattenCorrespondences:
    (correspondences: Correspondences) =>
    Correspondence[] =
  R.pipe(
    R.mapObjIndexed(R.pipe(R.prop('contributors'), R.toPairs)),
    R.toPairs,
    R.chain(
      tupled2(
        (target: string, sources: [string, number][]) =>
          R.map(
            tupled2(
              function (source: string, v: number): Correspondence {
                return {
                  'source': source,
                  'target': target,
                  'proportion': v
                }
              }
            ),
            sources)
      )
    )
  )

const proportionLookup:
    (correspondences: Correspondences) =>
    (source: string) => {[target: string]: number} =
  R.pipe(
    flattenCorrespondences,
    R.groupBy(R.prop('source')),
    R.mapObjIndexed(
      R.pipe(
        R.map(R.props(['target', 'proportion'])),
        R.fromPairs
      )
    ),
    R.flip(R.prop),
    R.partialRight(R.pipe, [R.defaultTo({})])
  )


const convertByProportion:
    (correspondences: Correspondences) =>
    (sourceData: AttributeData) => AttributeData =
  correspondences =>
    R.pipe(
      R.toPairs,
      R.map(tupled2(
        splitSourceToTargets(
          proportionLookup(correspondences)
        )
      )),
      R.reduce(R.mergeWith(R.add), {})
    )

export { convertByProportion }
