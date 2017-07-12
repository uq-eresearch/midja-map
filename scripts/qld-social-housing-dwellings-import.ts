import '../lib/types'
import R from 'ramda'
import axios from 'axios'
import { importCSVData } from '../lib/attribute/import'

const housingDesc =
  "public housing and state owned and managed indigenous housing"

const csvUrl =
  'http://www.hpw.qld.gov.au/SiteCollectionDocuments/PHSOMIHDwellingData.csv'

const attributeDef = (name: string, desc: string) => {
  return {
    name: 'qldgov_social_housing_dwellings_'+name,
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
      'total',
      `Number of ${housingDesc} total dwellings`),
    R.length
  ],
  [
    attributeDef(
      'occupied',
      `Number of ${housingDesc} occupied dwellings`),
    R.pipe(
      R.filter(R.propEq('OccStat', 1)),
      R.length
    )
  ],
  [
    attributeDef(
      'untenantable',
      `Number of ${housingDesc} untenantable dwellings`),
    R.pipe(
      R.filter(R.propEq('TenStat', 2)),
      R.length
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
    "postcode_2011": R.pipe(
      R.prop('Postcode'),
      R.ifElse(R.isNil, R.identity, postcodeToRegion)
    )
  }

axios.get(csvUrl)
  .then(R.prop('data'))
  .then(importCSVData('public', regionResolvers, attributeDefinitions))
  .catch(e => { console.log(e, e.stack) })
