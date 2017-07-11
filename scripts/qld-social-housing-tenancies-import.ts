import '../lib/types'
import R from 'ramda'
import path from 'path'
import { readJSON } from 'fs-extra'
import axios from 'axios'
import parseCSV from 'csv-parse'
import { writeIndex, writeAttributeData } from '../lib/attribute/import'
import { tupled2 } from '../lib/util'

const csvUrl =
  'http://www.hpw.qld.gov.au/SiteCollectionDocuments/TenanciesGovernmentManagedSocialRentalHousing.csv'

// csvParser :: Object → String → Promise [Object]
const csvParser: (options: object) => (text: string) => Promise<object[]> =
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

// regionNameResolver :: String → Promise (String → Object)
const regionNameResolver = (regionType: string) => {
  const nameLookupFile = path.resolve(
    __dirname, '..', 'data', 'public', regionType, 'region_name.json')
  return readJSON(nameLookupFile)
    .then((lgaNameLookup) => {
      const regions = R.map(
        R.zipObj(['code', 'name']),
        R.toPairs(lgaNameLookup)
      )
      const matcher = (source: string) =>
        R.find(R.pipe(R.prop('name'), R.startsWith(source)), regions)
      return R.memoize(matcher) // Need to cache for fast resolution
    })
}

// isIndigenous :: Object → Boolean
const isIndigenous = R.pipe(
  R.prop('Indig_H'),
  R.equals(1)
)
const isNotIndigenous = R.complement(isIndigenous)

// isOvercrowded :: Object → Boolean
const isOvercrowded = R.pipe(
  R.prop('Occupancy'),
  R.equals('Overcrowded')
)

// intoOrZero :: any → Number
const intOrZero = R.pipe(
  Number.parseInt,
  R.defaultTo(0)
)

const attributeDef = (name: string, desc: string) => {
  return {
    name: 'qldgov_social_housing_tenancies_'+name,
    description: desc,
    type: 'number',
    format: {
      "maximumFractionDigits": 0
    },
    source: {
      name: 'Queensland Government - Department of Housing and Public Works',
      license: {
        type: 'Creative Commons Attribution 3.0 Australia',
        url: 'http://www.hpw.qld.gov.au/aboutus/Pages/copyright.aspx'
      },
      url: csvUrl
    }
  }
}

type AttributeDefinition = [Attribute, (rows: object[]) => any]

const attributeDefinitions: AttributeDefinition[] = [
  [
    attributeDef(
      'all_households',
      'Number of government-managed social rental housing households - all'),
    R.length
  ],
  [
    attributeDef(
      'all_overcrowded_households',
      'Number of overcrowded government-managed social rental housing households - all'),
    R.pipe(
      R.filter(isOvercrowded),
      R.length
    )
  ],
  [
    attributeDef(
      'all_people',
      'Number of people in government-managed social rental housing - all'),
    R.pipe(
      R.pluck('Occs'),
      R.map(intOrZero),
      R.sum
    )
  ],
  [
    attributeDef(
      'indigenous_households',
      'Number of government-managed social rental housing tenancies - indigenous'),
    R.pipe(
      R.filter(isIndigenous),
      R.length
    )
  ],
  [
    attributeDef(
      'indigenous_overcrowded_households',
      'Number of overcrowded government-managed social rental housing tenancies - indigenous'),
    R.pipe(
      R.filter(R.both(isIndigenous, isOvercrowded)),
      R.length
    )
  ],
  [
    attributeDef(
      'indigenous_people',
      'Number of people in government-managed social rental housing - indigenous'),
    R.pipe(
      R.filter(isIndigenous),
      R.pluck('Occs'),
      R.map(intOrZero),
      R.sum
    )
  ],
  [
    attributeDef(
      'nonindigenous_households',
      'Number of government-managed social rental housing tenancies - non-indigenous or unknown'),
    R.pipe(
      R.filter(isNotIndigenous),
      R.length
    )
  ],
  [
    attributeDef(
      'nonindigenous_overcrowded_households',
      'Number of overcrowded government-managed social rental housing tenancies' +
      ' - non-indigenous or unknown'),
    R.pipe(
      R.filter(R.both(isNotIndigenous, isOvercrowded)),
      R.length
    )
  ],
  [
    attributeDef(
      'nonindigenous_people',
      'Number of people in government-managed social rental housing - non-indigenous or unknown'),
    R.pipe(
      R.filter(isNotIndigenous),
      R.pluck('Occs'),
      R.map(intOrZero),
      R.sum
    )
  ]
]

// applyAttributeDefinitions :: {String: [Object]} → [Object]
const applyAttributeDefinitions:
    (defs: AttributeDefinition[]) =>
    (groupedRows: { [code: string]: object[] }) =>
    R.KeyValuePair<Attribute, AttributeData>[] =
  defs =>
    R.pipe(
      R.juxt( // Apply all attribute.f functions
        R.map(
          R.mapObjIndexed, // Apply f across {region_code: [row]} object
          R.pluck(1, defs)
        )
      ),
      R.map(
        R.pickBy(R.complement(R.isNil)) // Remove null values
      ),
      R.zip(R.pluck(0, defs))  // Merge data into attribute definition
    )

// writeDataForAttribute :: regionType → (attribute, data) → Promise attribute
const writeDataForAttribute =
  (regionType: string) =>
    (attribute: Attribute, data: AttributeData) =>
      writeAttributeData('public', regionType, attribute, data)
        .then(R.tap(() =>
          console.log(`Wrote ${regionType} data for ${attribute.name}`)
        ))
        .then(R.always(attribute))

// processGroupedRows :: (String, {k: [Object]}) → Promise
const processGroupedRows = (regionType: string, groupedRows: {string: object[]}) =>
  Promise.all(
    R.map(
      tupled2(writeDataForAttribute(regionType)),
      applyAttributeDefinitions(attributeDefinitions)(groupedRows)
    )
  ).then(attributes =>
    writeIndex('public', regionType, attributes)
      .then(R.tap(() =>
        console.log(
          `Wrote ${attributes.length} attributes to ${regionType} index`
        )
      ))
      .then(R.always(attributes))
  )

// Get CSV rows
const pRows: Promise<object[]> =
  axios.get(csvUrl)
    .then(R.prop('data'))
    .then(csvParser({
      auto_parse: true,
      columns: true
    }))


type RegionResolver = (row: object) => string|null
// Get region resolvers for region types
const pResolvers: Promise<{[s: string]: RegionResolver}> =
  regionNameResolver('lga_2011')
    .then((lgaRegionResolver: (s: string) => Region|null) => {
      const lgaResolver: RegionResolver =
        R.pipe(
          R.prop<string>('LGA'),
          lgaRegionResolver,
          R.defaultTo<Region>({'code': null, 'name': null}),
          (v: Region) => v.code
        )
      const postcodeResolver: RegionResolver =
        R.pipe(
          R.prop('Postcode'),
          R.ifElse(R.isNil, R.identity, R.toString)
        )
      return {
        "lga_2011": lgaResolver,
        "postcode_2011": postcodeResolver
      }
    })

// With rows and resolvers...
pRows
  .then(rows =>
    pResolvers
      .then(
        R.mapObjIndexed(
          (resolver: RegionResolver) =>
            R.groupBy(
              resolver,
              R.filter(
                R.pipe(resolver, R.is(String)),
                rows
              )
            )
        )
      )
  )
  .then(
    R.pipe(
      R.toPairs,
      R.map(tupled2(processGroupedRows)),
      vs => Promise.all(vs)
    )
  )
  .catch(e => { console.log(e, e.stack) })
