import R from 'ramda'
import '../types'
import { tupled2 } from '../util'

interface Correspondence {
  source: string,
  target: string,
  proportion: number
}

interface WeightedValue {
  value: number,
  weight: number
}

function weightedAverage(values: WeightedValue[]): number {
  const weightTotal = R.reduce<number,number>(
    R.add, 0, R.pluck('weight', values)
  )
  return R.sum(
    R.map(wv => wv.value * wv.weight / weightTotal, values)
  )
}

const splitSourceToTargets:
    <T>(
      correspondences: (source: string) => {[target: string]: number},
      combinator: (sourceValue: number) => (proportion: number) => T
    ) => (source: string, sv: number) => {[target: string]: T} =
  (correspondences, combinator) =>
    (source, sv) =>
      R.mapObjIndexed(
        combinator(sv),
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

const convertByAverage:
    (correspondences: Correspondences) =>
    (sourceData: AttributeData) => AttributeData =
  correspondences =>
    R.pipe(
      R.toPairs,
      R.map(tupled2(
        splitSourceToTargets(
          proportionLookup(correspondences),
          (v: number) => (p: number) => { return [{ value: v, weight: p }] }
        )
      )),
      R.reduce(R.mergeWith(R.concat), {}),
      R.mapObjIndexed(weightedAverage)
    )

const convertByPrimary:
    (correspondences: Correspondences) =>
    (sourceData: AttributeData) => AttributeData =
  correspondences =>
    R.pipe(
      R.toPairs,
      R.map(tupled2(
        splitSourceToTargets(
          proportionLookup(correspondences),
          (v: number) => (p: number) => { return [{ value: v, weight: p }] }
        )
      )),
      R.reduce(R.mergeWith(R.concat), {}),
      R.mapObjIndexed<WeightedValue[], number>(
        R.pipe<WeightedValue[], WeightedValue[], number[], number>(
          values => {
            const maxWeight: number = R.reduce(
              R.maxBy<WeightedValue>(R.prop('weight')),
              {
                value: null,
                weight: Number.NEGATIVE_INFINITY
              },
              values
            ).weight
            return R.filter(R.propEq('weight', maxWeight), values)
          },
          R.pluck('value'),
          R.ifElse(vs => vs.length < 2, R.head, R.mean)
        )
      )
    )

const convertBySum:
    (correspondences: Correspondences) =>
    (sourceData: AttributeData) => AttributeData =
  correspondences =>
    R.pipe(
      R.toPairs,
      R.map(tupled2(
        splitSourceToTargets(
          proportionLookup(correspondences),
          R.multiply
        )
      )),
      R.reduce(R.mergeWith(R.add), {})
    )

export { convertByAverage, convertByPrimary, convertBySum }
