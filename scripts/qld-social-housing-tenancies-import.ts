import '../lib/types'
import R from 'ramda'
import axios from 'axios'
import {
  csvTextParser,
  extractRowData,
  regionNameLookup,
  writeIndex,
  writeAttributeData } from '../lib/attribute/import'
import { tupled2 } from '../lib/util'

const lga2011RegionNames = require('../data/public/lga_2011/region_name.json')

const csvUrl =
  'http://www.hpw.qld.gov.au/SiteCollectionDocuments/TenanciesGovernmentManagedSocialRentalHousing.csv'

// csvParser :: Object → String → Promise [Object]

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

const attributeDef: (name: string, desc: string) => Attribute =
  (name, desc) => {
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

const attributeDefinitions: [Attribute, (rows: object[]) => any][] = [
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
const processGroupedRows = (regionType: string, attributeAndDataPairs: [Attribute, AttributeData][]) =>
  Promise.all(
    R.map(
      tupled2(writeDataForAttribute(regionType)),
      attributeAndDataPairs
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

type RegionResolver = (row: object) => Region|null

function postcodeToRegion(postcode: string): Region {
  return {
    code: postcode,
    name: postcode
  }
}

// Get region resolvers for region types
const regionResolvers: {[regionType: string]: RegionResolver} =
  {
    "lga_2011": R.pipe(
      R.prop<string>('LGA'),
      regionNameLookup(
        source =>
          R.pipe(
            R.prop('name'),
            R.startsWith(source)
          )
      )(lga2011RegionNames)
    ),
    "postcode_2011": R.pipe(
      R.prop('Postcode'),
      R.ifElse(R.isNil, R.identity, postcodeToRegion)
    )
  }

axios.get(csvUrl)
  .then(R.prop('data'))
  .then(csvTextParser({
    auto_parse: true,
    columns: true
  }))
  .then(extractRowData(regionResolvers, attributeDefinitions))
  .then(
    R.pipe(
      R.toPairs,
      R.map(tupled2(processGroupedRows)),
      vs => Promise.all(vs)
    )
  )
  .catch(e => { console.log(e, e.stack) })
