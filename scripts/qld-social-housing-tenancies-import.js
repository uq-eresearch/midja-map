import R from 'ramda'
import path from 'path'
import { readJSON } from 'fs-extra'
import rp from 'request-promise-native'
import parseCSV from 'csv-parse'
import { median } from 'simple-statistics'
import { writeIndex, writeAttributeData } from '../lib/attribute/import'

const csvUrl =
  'http://www.hpw.qld.gov.au/SiteCollectionDocuments/TenanciesGovernmentManagedSocialRentalHousing.csv'

// csvParser :: Object → String → Promise [Object]
const csvParser = options => text =>
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
const regionNameResolver = regionType => {
  const nameLookupFile = path.resolve(
    __dirname, '..', 'data', 'public', regionType, 'region_name.json')
  return readJSON(nameLookupFile)
    .then((lgaNameLookup) => {
      const regions = R.map(
        R.zipObj(['code', 'name']),
        R.toPairs(lgaNameLookup)
      )
      const matcher = source =>
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

const attributeDef = (name, desc) => {
  return {
    name: 'qldgov_social_housing_tenancies_'+name,
    description: desc,
    type: 'number',
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

const attributeDefinitions = [
  {
    attribute: attributeDef(
      'all_households',
      'Number of government-managed social rental housing households - all'),
    f: R.length
  },
  {
    attribute: attributeDef(
      'all_overcrowded_households',
      'Number of overcrowded government-managed social rental housing households - all'),
    f: R.pipe(
      R.filter(isOvercrowded),
      R.length
    )
  },
  {
    attribute: attributeDef(
      'all_people',
      'Number of people in government-managed social rental housing - all'),
    f: R.pipe(
      R.pluck('Occs'),
      R.map(intOrZero),
      R.sum
    )
  },
  {
    attribute: attributeDef(
      'indigenous_households',
      'Number of government-managed social rental housing tenancies - indigenous'),
    f: R.pipe(
      R.filter(isIndigenous),
      R.length
    )
  },
  {
    attribute: attributeDef(
      'indigenous_overcrowded_households',
      'Number of overcrowded government-managed social rental housing tenancies - indigenous'),
    f: R.pipe(
      R.filter(R.both(isIndigenous, isOvercrowded)),
      R.length
    )
  },
  {
    attribute: attributeDef(
      'indigenous_people',
      'Number of people in government-managed social rental housing - indigenous'),
    f: R.pipe(
      R.filter(isIndigenous),
      R.pluck('Occs'),
      R.map(intOrZero),
      R.sum
    )
  },
  {
    attribute: attributeDef(
      'nonindigenous_households',
      'Number of government-managed social rental housing tenancies - non-indigenous or unknown'),
    f: R.pipe(
      R.filter(isNotIndigenous),
      R.length
    )
  },
  {
    attribute: attributeDef(
      'nonindigenous_overcrowded_households',
      'Number of overcrowded government-managed social rental housing tenancies' +
      ' - non-indigenous or unknown'),
    f: R.pipe(
      R.filter(R.both(isNotIndigenous, isOvercrowded)),
      R.length
    )
  },
  {
    attribute: attributeDef(
      'nonindigenous_people',
      'Number of people in government-managed social rental housing - non-indigenous or unknown'),
    f: R.pipe(
      R.filter(isNotIndigenous),
      R.pluck('Occs'),
      R.map(intOrZero),
      R.sum
    )
  }
]

// applyAttributeDefinitions :: {String: [Object]} → [Object]
const applyAttributeDefinitions = (defs) =>
  R.pipe(
    R.juxt( // Apply all attribute.f functions
      R.map(
        R.pipe( // Apply attribute.f across {region_code: [row]} object
          R.prop('f'),
          R.mapObjIndexed
        ),
        defs
      )
    ),
    R.map(
      R.pipe(
        R.pickBy(R.complement(R.isNil)), // Remove null values
        R.objOf('data') // Nest {region_code: v} data in object
      )
    ),
    R.zipWith(R.merge, defs)  // Merge data into attribute definition
  )

// writeDataForAttribute :: regionType → (attribute, data) → Promise attribute
const writeDataForAttribute = regionType => (attribute, data) =>
  writeAttributeData('public', regionType, attribute, data)
    .then(R.tap(() =>
      console.log(`Wrote ${regionType} data for ${attribute.name}`)
    ))
    .then(R.always(attribute))

// processGroupedRows :: (String, {k: [Object]}) → Promise
const processGroupedRows = (regionType, groupedRows) =>
  Promise.all(
    R.map(
      R.pipe(
        R.props(['attribute', 'data']),
        R.apply(writeDataForAttribute(regionType))
      ),
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
const pRows =
  rp(csvUrl)
    .then(csvParser({
      auto_parse: true,
      columns: true
    }))

// Get region resolvers for region types
const pResolvers =
  regionNameResolver('lga_2011')
    .then(lgaRegionResolver => {
      return {
        "lga_2011": R.pipe(
          R.prop('LGA'),
          lgaRegionResolver,
          R.defaultTo({}),
          R.prop('code')
        ),
        "postcode_2011": R.pipe(
          R.prop('Postcode'),
          R.ifElse(R.isNil, R.identity, R.toString)
        )
      }
    })

// With rows and resolvers...
pRows
  .then(rows =>
    pResolvers
      .then(
        R.mapObjIndexed(
          resolver =>
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
      R.map(R.apply(processGroupedRows)),
      vs => Promise.all(vs)
    )
  )
  .catch(e => { console.log(e, e.stack) })
