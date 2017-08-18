import * as R from 'ramda'
import { tupled2 } from '../util'
import '../types'

type JsonDataFileFetcher = (
  accessType: string,
  regionType: string,
  filename: string
) => Promise<object>


function mergeIndexes(
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

export function buildIndexFetcher(
    fetcher: JsonDataFileFetcher): AttributeIndexFetcher {
  function tagAttributes(tag: string): (ai: AttributeIndex) => AttributeIndex {
    return R.over(
      R.lensProp('attributes'),
      R.map(R.merge(R.objOf('access', tag)))
    )
  }
  function indexFetcher(regionType: string): Promise<AttributeIndex> {
    return fetcher('public', regionType, 'index.json')
      .then(tagAttributes('public'))
      .then((publicData: AttributeIndex) => {
        return fetcher('private', regionType, 'index.json')
          .then(tagAttributes('private'))
          .then(R.curry(mergeIndexes)(publicData))
          .catch(R.always(publicData))
      })
      .then(metadata => {
        const externalAttributes: {[from: string]: Attribute[]} =
          R.groupBy(
            R.prop('from'),
            R.filter(
              R.has('from'),
              R.defaultTo([], metadata.attributes)
            )
          )
        return Promise.all(
          R.map(
            indexFetcher,
            R.keys(externalAttributes)
          )
        ).then(
          R.zip(R.values<Attribute[]>(externalAttributes))
        ).then(
          R.chain(tupled2(
            (attributes: Attribute[], externalMetadata: AttributeIndex) =>
              R.map<Attribute, Attribute>(
                attribute =>
                  R.mergeDeepLeft(
                    attribute,
                    R.defaultTo(
                      {},
                      R.find(
                        R.propEq('name', attribute.name),
                        R.defaultTo([], externalMetadata.attributes)
                      )
                    )
                  ),
                attributes
              )
          ))
        ).then(mergedAttributes =>
          R.over(
            R.lensProp('attributes'),
            (originalAttributes: Attribute[]) =>
              R.sortBy(
                R.prop('name'),
                R.unionWith(
                  R.eqProps('name'),
                  mergedAttributes,
                  originalAttributes
                )
              ),
            metadata
          )
        )
      })
  }

  return indexFetcher
}
