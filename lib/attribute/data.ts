import * as R from 'ramda'
import expression from './expression'
import {
  convertByAverage,
  convertByPrimary,
  convertBySum } from './correspondences'
import '../types'

type CorrespondenceFetcher = (
  fromRegionType: string,
  toRegionType: string
) => Promise<Correspondences>


function convert(attributeMetadata: { conversion: string }) {
  switch (attributeMetadata.conversion) {
    case 'average':   return convertByAverage;
    case 'primary':   return convertByPrimary;
    case 'sum':       return convertBySum;
    default:          return convertBySum;
  }
}

export function buildAttributeDataFetcher(
    jsonDataFileFetcher: JsonDataFileFetcher,
    getCorrespondences: CorrespondenceFetcher,
    indexFetcher: AttributeIndexFetcher): AttributeDataFetcher {
  function getAvailableAttributes(regionType: string): Promise<Attribute[]> {
    return indexFetcher(regionType).then(index => index.attributes)
  }
  function getAttributeFromRemote(
      regionType: string,
      attributeName: string): Promise<AttributeData> {
    return getAvailableAttributes(regionType)
      .then(function(availableAttributes) {
        const attributeMetadata = R.find(
          R.propEq('name', attributeName),
          availableAttributes
        )
        if (!attributeMetadata) {
          console.log(`Attempted to get unknown attribute: ${attributeName}`)
          return {};
        } else if (attributeMetadata.from) {
          return getCorrespondences(attributeMetadata.from, regionType)
            .then(correspondences =>
              getAttributeFromRemote(attributeMetadata.from, attributeName)
                .then(convert(attributeMetadata)(correspondences))
            );
        } else if (attributeMetadata.expression) {
          // Collect variables and evaluate expression
          var expr = expression(attributeMetadata.expression);
          return Promise.all(
            R.map(
              R.curry(getAttributeFromRemote)(regionType),
              expr.variables
            )
          ).then(function(attributesData: AttributeData[]) {
            const commonRegions: string[] =
              R.pipe(
                R.map<AttributeData, string[]>(R.keys),
                (keySets: string[][]) =>
                  R.reduce<string[], string[]>(
                    R.intersection,
                    R.defaultTo([], R.head(keySets)),
                    R.defaultTo([], R.tail(keySets))
                  )
              )(attributesData)
            const series = R.map(
              region =>
                expr.evaluate(
                  R.zipObj(
                    expr.variables,
                    R.map(R.prop(region), attributesData)
                  )
                ),
              commonRegions
            )
            return R.zipObj(commonRegions, series)
          })
        } else {
          return jsonDataFileFetcher(
            attributeMetadata.access,
            regionType,
            `${attributeName}.json`
          )
        }
      })
  }
  return getAttributeFromRemote
}
