import R from 'ramda'
import parseCSV from 'csv-parse'
import { readJson, writeJson } from 'fs-extra'
import path from 'path'
import '../types'
import { tupled2 } from '../util'

const jsonOptions = {
  spaces: 2
}

const targetFile =
  (accessType: string, regionType: string, filename: string) =>
    path.resolve(
      __dirname, '..', '..', 'data',
      accessType,
      regionType,
      filename
    )

const indexTargetFile = (accessType: string, regionType: string) =>
  targetFile(accessType, regionType, 'index.json')

const attributeDataTargetFile =
  (accessType: string, regionType: string, attribute: Attribute) =>
    targetFile(accessType, regionType, `${attribute.name}.json`)

export const writeIndex = R.curry(
  (accessType: string, regionType: string, updatedAttributes: Attribute[]) => {
    const modifyAttributes = (currentAttributes: Attribute[]) => R.sortBy(
      R.prop('name'),
      R.unionWith(
        R.eqBy(R.prop('name')),
        updatedAttributes,
        currentAttributes)
    )
    const attrsLens = R.lensProp('attributes')
    const indexFile = indexTargetFile(accessType, regionType)
    return readJson(indexFile)
      .then(R.over(attrsLens, modifyAttributes))
      .then(data => writeJson(indexFile, data, jsonOptions))
  }
)

export const writeAttributeData = R.curry(
  (accessType: string, regionType: string, attribute: Attribute, data: AttributeData) =>
    writeJson(
      attributeDataTargetFile(accessType, regionType, attribute),
      data,
      jsonOptions)
)

export const csvTextParser:
    (options: object) =>
    (text: string) =>
    Promise<object[]> =
  options => text =>
    new Promise((resolve, reject) => {
      try {
        parseCSV(text, options, (err, data) => {
          if (err) reject(err)
          else resolve(data)
        })
      } catch (e) {
        reject(e)
      }
    })

export const regionNameLookup:
    (regionMatcher: (s: string) => (region: Region) => boolean) =>
    (regionNamesLookup: StringAttributeData) =>
    (name: string) => Region|null =
  regionMatcher => regionNamesLookup => {
    const regions: Region[] = R.map(
      tupled2((code: string, name: string) => {
        return {
          'code': code,
          'name': name
        }
      }),
      R.toPairs<string, string>(regionNamesLookup)
    )
    const matcher = (source: string) =>
      R.find(regionMatcher(source), regions)
    return R.memoize(matcher) // Need to cache for fast resolution
  }

type AttributeDataWithNulls =
  NumericAttributeDataWithNulls | StringAttributeDataWithNulls
type NumericAttributeDataWithNulls = {[code: string]: number|null}
type StringAttributeDataWithNulls = {[code: string]: string|null}

type AttributeDefinition = [Attribute, (rows: object[]) => string|number]
type RegionResolver = (row: object) => Region|null

const removeNulls: (attributeData: AttributeDataWithNulls) => AttributeData =
  R.pickBy(R.complement(R.isNil))

const applyAttributeDefinitions:
    (defs: AttributeDefinition[]) =>
    (groupedRows: { [code: string]: object[] }) =>
    R.KeyValuePair<Attribute, AttributeData>[] =
  defs =>
    R.pipe(
      R.juxt<object, AttributeDataWithNulls>( // Apply all f
        R.map(
          R.mapObjIndexed, // Apply f across {region_code: [row]} object
          R.pluck(1, defs)
        )
      ),
      R.map<AttributeDataWithNulls, AttributeData>(
        removeNulls // Remove null values
      ),
      R.zip(R.pluck(0, defs))  // Merge data into attribute definition
    )

export const extractRowData:
    (
      regionResolvers: {[regionType: string]: RegionResolver},
      attributeDefinitions: AttributeDefinition[]
    ) =>
    (rows: object[]) =>
    {[regionType: string]: [Attribute, AttributeData][]} =
  (regionResolvers, attributeDefinitions) =>
    R.pipe(
      rows =>
        R.mapObjIndexed(
          (resolver: RegionResolver) =>
            R.groupBy(
              R.pipe(
                resolver,
                r => r && r.code
              ),
              R.filter(
                R.pipe(resolver, R.is(Object)),
                rows
              )
            ),
          regionResolvers
        ),
      R.mapObjIndexed(applyAttributeDefinitions(attributeDefinitions))
    )
