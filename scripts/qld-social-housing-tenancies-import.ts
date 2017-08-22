import '../lib/types'
import R from 'ramda'
import axios from 'axios'
import { importCSVData, regionNameLookup } from '../lib/attribute/import'

const lga2011RegionNames = require('../data/public/lga_2011/region_name.json')
const lga2016RegionNames = require('../data/public/lga_2016/region_name.json')

const csvUrl =
  'http://www.hpw.qld.gov.au/SiteCollectionDocuments/TenanciesGovernmentManagedSocialRentalHousing.csv'

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
      category: 'housing',
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

function postcodeToRegion(postcode: string): Region {
  return {
    code: postcode,
    name: postcode
  }
}

const regionResolvers: {[regionType: string]: (row: object) => Region|null} =
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
    "lga_2016": R.pipe(
      R.prop<string>('LGA'),
      regionNameLookup(
        source =>
          R.pipe(
            R.prop('name'),
            R.startsWith(source)
          )
      )(lga2016RegionNames)
    ),
    "postcode_2011": R.pipe(
      R.prop('Postcode'),
      R.ifElse(R.isNil, R.identity, postcodeToRegion)
    )
  }

axios.get(csvUrl)
  .then(R.prop('data'))
  .then(importCSVData('public', regionResolvers, attributeDefinitions))
  .catch(e => { console.log(e, e.stack) })
