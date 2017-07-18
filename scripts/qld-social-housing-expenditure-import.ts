import '../lib/types'
import R from 'ramda'
import { number, round } from 'mathjs'
import axios from 'axios'
import { importCSVData, regionNameLookup } from '../lib/attribute/import'

const lga2011RegionNames = require('../data/public/lga_2011/region_name.json')
const lga2016RegionNames = require('../data/public/lga_2016/region_name.json')

const csvUrl =
  'http://www.hpw.qld.gov.au/SiteCollectionDocuments/OpenDataPropertyMaintenanceModifications.csv'

const formatFor = R.flip(R.prop)({
  "count": {
    "maximumFractionDigits": 0
  },
  "$": {
    "style": "currency",
    "currency": "AUD"
  }
})

const attributeDef = (name: string, desc: string, formatType: string) => {
  return {
    name: 'qldgov_social_housing_expenditure_'+name,
    description: desc,
    type: 'number',
    format: formatFor(formatType),
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
      'maintenance_events',
      `Social housing maintenance events`,
      'count'),
    R.pipe(
      R.filter(R.propEq('Category', 'Maintenance')),
      R.length
    )
  ],
  [
    attributeDef(
      'maintenance_expenditure',
      `Social housing maintenance expenditure`,
      '$'),
    R.pipe(
      R.filter(R.propEq('Category', 'Maintenance')),
      R.pluck('Cost'),
      R.map(R.pipe(R.replace(/[\$,]/g, ''), number)),
      R.sum,
      R.partialRight(round, [2])
    )
  ],
  [
    attributeDef(
      'modification_events',
      `Social housing modification events`,
      'count'),
    R.pipe(
      R.filter(R.propEq('Category', 'Modifications')),
      R.length
    )
  ],
  [
    attributeDef(
      'modification_expenditure',
      `Social housing modification expenditure`,
      '$'),
    R.pipe(
      R.filter(R.propEq('Category', 'Modifications')),
      R.pluck('Cost'),
      R.map(R.pipe(R.replace(/[\$,]/g, ''), number)),
      R.sum,
      R.partialRight(round, [2])
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
      R.prop<string>('LGA_Name'),
      regionNameLookup(
        source =>
          R.pipe(
            R.prop('name'),
            R.toLower,
            R.startsWith(source.toLowerCase())
          )
      )(lga2011RegionNames)
    ),
    "lga_2016": R.pipe(
      R.prop<string>('LGA_Name'),
      regionNameLookup(
        source =>
          R.pipe(
            R.prop('name'),
            R.toLower,
            R.startsWith(source.toLowerCase())
          )
      )(lga2016RegionNames)
    ),
    "postcode_2011": R.pipe(
      R.prop('Post_Code'),
      R.ifElse(R.isNil, R.identity, postcodeToRegion)
    )
  }

axios.get(csvUrl)
  .then(R.prop('data'))
  .then(importCSVData('public', regionResolvers, attributeDefinitions))
  .catch(e => { console.log(e, e.stack) })
