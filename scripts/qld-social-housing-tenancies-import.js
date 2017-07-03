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

// lgaRegionResolver :: [String] → (String → Object)
const lgaRegionResolver = names => {
  const nameLookupFile = path.resolve(
    __dirname, '..', 'data', 'public', 'lga', 'region_name.json')
  return readJSON(nameLookupFile)
    .then((lgaNameLookup) => {
      const regions = R.map(
        R.zipObj(['code', 'name']),
        R.toPairs(lgaNameLookup)
      )
      const matcher = source =>
        R.find(R.pipe(R.prop('name'), R.startsWith(source)), regions)
      const regionResolver =
        R.pickBy(R.is(Object), R.zipObj(names, R.map(matcher, names)))
      return R.flip(R.prop)(regionResolver)
    })
}

// isIndigenous :: Object => Boolean
const isIndigenous = R.pipe(
  R.prop('Indig_H'),
  R.equals(1)
)
const isNotIndigenous = R.complement(isIndigenous)

// isOvercrowded :: Object => Boolean
const isOvercrowded = R.pipe(
  R.prop('Occupancy'),
  R.equals('Overcrowded')
)

// intoOrZero :: any => Number
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
      'Number of government-managed social rental housing households - indigenous'),
    f: R.pipe(
      R.filter(isIndigenous),
      R.length
    )
  },
  {
    attribute: attributeDef(
      'indigenous_overcrowded_households',
      'Number of overcrowded government-managed social rental housing households - indigenous'),
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
      'Number of government-managed social rental housing households - non-indigenous or unknown'),
    f: R.pipe(
      R.filter(isNotIndigenous),
      R.length
    )
  },
  {
    attribute: attributeDef(
      'nonindigenous_overcrowded_households',
      'Number of overcrowded government-managed social rental housing households' +
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

// writeDataForAttribute :: attribute -> data -> Promise attribute
const writeDataForAttribute = (attribute, data) =>
  writeAttributeData('public', 'lga', attribute, data)
    .then(R.tap(() =>
      console.log(`Wrote data for ${attribute.name}`)
    ))
    .then(R.always(attribute))

rp(csvUrl)
  .then(csvParser({
    auto_parse: true,
    columns: true
  }))
  .then(rows =>
    lgaRegionResolver(R.uniq(R.pluck('LGA', rows)))
      .then(regionResolver => {
        const rowRegionResolver = R.pipe(R.prop('LGA'), regionResolver)
        return R.groupBy(
          R.pipe(rowRegionResolver, R.prop('code')),
          R.filter(
            R.pipe(rowRegionResolver, R.is(Object)),
            rows))
      })
  )
  .then(applyAttributeDefinitions(attributeDefinitions))
  .then(
    R.pipe(
      R.map(
        R.pipe(
          R.props(['attribute', 'data']),
          R.apply(writeDataForAttribute)
        )
      ),
      vs => Promise.all(vs)
    )
  )
  .then(attributes =>
    writeIndex('public', 'lga', attributes)
      .then(R.tap(() =>
        console.log(`Wrote to index ${attributes.length} attributes`)
      ))
      .then(R.always(attributes))
  )
  .catch(e => { console.log(e, e.stack) })
