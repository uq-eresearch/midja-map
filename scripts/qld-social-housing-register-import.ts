import R from 'ramda'
import { median } from 'mathjs'
import axios from 'axios'
import { importCSVData, regionNameLookup } from '../lib/attribute/import'

const lga2011RegionNames = require('../data/public/lga_2011/region_name.json')
const lga2016RegionNames = require('../data/public/lga_2016/region_name.json')

const csvUrl =
  'http://www.hpw.qld.gov.au/SiteCollectionDocuments/SocialHousingRegister.csv'

// isIndigenous :: Object => Boolean
const isIndigenous = R.pipe(
  R.prop('Aboriginal and Torres Strait Islander'),
  R.toLower,
  R.equals('yes')
)

const attributeDef = (name: string, desc: string) => {
  return {
    name: 'qldgov_social_housing_'+name,
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

const attributeDefinitions: [Attribute, (rows: object[]) => any][] = [
  [
    attributeDef(
      'all_applications',
      'Number applications waiting for social housing - all'),
    R.length
  ],
  [
    attributeDef(
      'all_median_waiting_application_age',
      'Median age (in months) of waiting social housing applications - all'),
    R.pipe(
      R.pluck('Timeon_housingregister'),
      median
    )
  ],
  [
    attributeDef(
      'all_people',
      'Number people waiting for social housing - all'),
    R.pipe(
      R.pluck('PeopleonApplication'),
      R.sum
    )
  ],
  [
    attributeDef(
      'indigenous_applications',
      'Number applications waiting for social housing - indigenous'),
    R.pipe(
      R.filter(isIndigenous),
      R.length
    )
  ],
  [
    attributeDef(
      'indigenous_median_waiting_application_age',
      'Median age (in months) of waiting social housing applications - indigenous'),
    R.pipe(
      R.filter(isIndigenous),
      R.pluck('Timeon_housingregister'),
      R.ifElse(R.isEmpty, R.always(null), R.apply(median))
    )
  ],
  [
    attributeDef(
      'indigenous_people',
      'Number people waiting for social housing - indigenous'),
    R.pipe(
      R.filter(isIndigenous),
      R.pluck('PeopleonApplication'),
      R.sum
    )
  ]
]

const removeLGASuffix =
  R.pipe(
    R.replace(/City Council/i, '(C)'),
    R.replace(/Regional Council/i, '(R)'),
    R.replace(/(Aboriginal )?Shire Council/i, '(S)')
  )

const regionResolvers: {[regionType: string]: (row: object) => Region|null} =
  {
    "lga_2011": R.pipe(
      R.prop<string>('LGA_Full Name'),
      regionNameLookup(
        R.pipe(
          removeLGASuffix,
          source =>
            R.pipe(
              R.prop('name'),
              R.equals(source)
            )
        )
      )(lga2011RegionNames),
    ),
    "lga_2016": R.pipe(
      R.prop<string>('LGA_Full Name'),
      regionNameLookup(
        R.pipe(
          removeLGASuffix,
          source =>
            R.pipe(
              R.prop('name'),
              R.equals(source)
            )
        )
      )(lga2016RegionNames)
    )
  }

axios.get(csvUrl)
  .then(R.prop('data'))
  .then(importCSVData('public', regionResolvers, attributeDefinitions))
  .catch(e => { console.log(e, e.stack) })
