import fs from 'fs'
import path from 'path'
import { writeIndex, writeAttributeData } from '../lib/attribute/import'
const R = require('ramda')
const parseCSV = require('csv-parse');
const extract = R.curry((p, ...ks) => R.pipe(
  R.match(p), R.ifElse(R.has('input'), R.tail, R.identity), R.zipObj(ks)))
const hasKeys = (...ks) => R.allPass(R.map(R.has)(ks))
const chainApplyToAll =
  (...fs) => (...args) => R.chain(f => R.apply(f)(args))(fs)

const accessType = 'public'

const integerFormat = {
  "maximumFractionDigits": 0
}
const currencyFormat = {
  "style": "currency",
  "currency": "AUD"
}
const sourceDetails = (filename, field) => {
  return {
    "name": "Australian Bureau of Statistics",
    "license": {
      "type": "Creative Commons Attribution 2.5 Australia",
      "url": "https://creativecommons.org/licenses/by/2.5/au/"
    },
    "notes": `from DataPack CSV: ${filename}#${field}`
  }
}

// orEmpty :: (*... → Boolean, *... → [Object]) => (*... → [Object])
const orEmpty = (predicate, action) => R.ifElse(
  predicate,
  action,
  R.always([])
)

const matchers = [
  (filename, field) => {
    const params =
      R.merge(
        extract(
          /(\d{4})Census_I04_AUST?_([^_\.]+)(?:_short)?\.csv$/,
          'year',
          'regionType')(filename),
        extract(
          /Med?_hhd?_inc?_wk_(.+)$/,
          'suffix')(field));
    return orEmpty(
      hasKeys('year', 'regionType', 'suffix'),
      chainApplyToAll(
        orEmpty(
          R.pipe(R.prop('suffix'), R.test(/Tot$/)),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_median_weekly_household_income_all`,
              "description": `Median weekly household income - all households (Census ${params.year})`,
              "type": "number",
              "category": "socioeconomics",
              "format": currencyFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.pipe(R.prop('suffix'), R.test(/In_ps_hh_In_ps$/)),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_median_weekly_household_income_indigenous`,
              "description": `Median weekly household income - indigenous households (Census ${params.year})`,
              "type": "number",
              "category": "socioeconomics",
              "format": currencyFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        )
      )
    )(params)
  },
  (filename, field) => {
    const params =
      R.merge(
        extract(
          /(\d{4})Census_I06_AUST?_([^_\.]+)(?:_short)?\.csv$/,
          'year',
          'regionType')(filename),
        extract(
          /^P_(Y12_equivalent|Tot)_(Indigenous|Tot)$/i,
          'prefix',
          'suffix')(field));
    return orEmpty(
      hasKeys('year', 'regionType', 'prefix', 'suffix'),
      chainApplyToAll(
        orEmpty(
          R.where({
            'prefix': R.equals('Y12_equivalent'),
            'suffix': R.equals('Indigenous')
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_year_12_educated_indigenous_persons`,
              "description": `Year 12 educated - indigenous persons (Census ${params.year})`,
              "type": "number",
              "category": "education",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'prefix': R.equals('Tot'),
            'suffix': R.equals('Indigenous')
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_total_possibly_educated_indigenous_persons`,
              "description": `Total possibly educated persons - indigenous persons (Census ${params.year})`,
              "type": "number",
              "category": "education",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'prefix': R.equals('Y12_equivalent'),
            'suffix': R.equals('Tot')
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_year_12_educated_all_persons`,
              "description": `Year 12 educated - all persons (Census ${params.year})`,
              "type": "number",
              "category": "education",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'prefix': R.equals('Tot'),
            'suffix': R.equals('Tot')
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_total_possibly_educated_all_persons`,
              "description": `Total possibly educated persons - all persons (Census ${params.year})`,
              "type": "number",
              "category": "education",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        )
      )
    )(params)
  },
  (filename, field) => {
    const params =
      R.evolve(
        {
          low: v => /^HI/.test(v) ? v.slice(2) : v,
          suffix: v => v == 'Tot_hhlds' ? 'all' : 'indigenous'
        },
        R.merge(
          extract(
            /(\d{4})Census_I13_AUST?_([^_\.]+)(?:_short)?\.csv$/,
            'year',
            'regionType')(filename),
          extract(
            /^(HI\d+|Neg|part(?:ial)?|all)_(\d+|Nil_inc(?:ome)?|more|inc(?:ome)?(?:_st(?:ated)?|_ns)?)_(hhd?_with_Ind(?:ig)?_psns?|Tot_hhlds)$/i,
            'low',
            'high',
            'suffix')(field)
        )
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'low', 'high'),
      chainApplyToAll(
        orEmpty(
          R.where({
            'low': R.test(/^part(ial)?$/i)
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_partially_unstated_weekly_household_income_${params.suffix}`.toLowerCase(),
              "description": `Partially-unstated weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
              "category": "socioeconomics",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'low': R.test(/^all$/i)
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_completely_unstated_weekly_household_income_${params.suffix}`,
              "description": `Completely-unstated weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
              "category": "socioeconomics",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'high': R.test(/^\d+$/)
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_${params.low}to${params.high}_weekly_household_income_${params.suffix}`,
              "description": `\$${params.low} - \$${params.high} weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
              "category": "socioeconomics",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'high': R.equals('more')
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_${params.low}plus_weekly_household_income_${params.suffix}`,
              "description": `\$${params.low}+ weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
              "category": "socioeconomics",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'high': R.test(/^nil/i)
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_0minus_weekly_household_income_${params.suffix}`,
              "description": `Nil or negative weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
              "category": "socioeconomics",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        )
      )
    )(params)
  },
  (filename, field) => {
    const params =
      R.evolve(
        {
          status: v => /indigenous/i.test(v) ? 'indigenous' : 'all'
        },
        R.merge(
          extract(
            /(\d{4})Census_I15._AUST?_(\w+)_long/i,
            'year',
            'regionType')(filename),
          extract(
            /^persons_(indigenous|total)_(\d+)_(\d+)_years_(.*)$/i,
            'status',
            'low',
            'high',
            'qualification')(field)
        )
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'status', 'low', 'high', 'qualification'),
      params => [{
        regionType: params.regionType.toLowerCase() + '_' + params.year,
        attribute: {
          "name": `census${params.year}_${params.status}_persons_${params.low}to${params.high}_${params.qualification}`.toLowerCase(),
          "description": `Education level of ${params.status} persons ${params.low}-${params.high} years - ${params.qualification.replace(/_/g,' ')} (Census ${params.year})`,
          "type": "number",
          "category": "education",
          "format": integerFormat,
          "source": sourceDetails(filename, field)
        }
      }]
    )(params)
  },
  (filename, field) => {
    const params =
      R.evolve(
        {
          status: v => v == 'Tot' ? 'all' : 'indigenous'
        },
        R.merge(
          extract(
            /(\d{4})Census_I04_AUST?_([^_\.]+)(?:_short)?\.csv$/i,
            'year',
            'regionType')(filename),
          extract(
            /^(Av_hh_si|Avg_household_size)_(In_ps_hh_wi_Ind_psns|Tot)/,
            'statistic',
            'status')(field)
        )
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'statistic', 'status'),
      params => [{
        regionType: params.regionType.toLowerCase() + '_' + params.year,
        attribute: {
          "name": `census${params.year}_average_household_size_${params.status}`.toLowerCase(),
          "description": `Average household size - ${params.status} (Census ${params.year})`,
          "type": "number",
          "category": "housing",
          "format": {
            "maximumFractionDigits": 1
          },
          "source": sourceDetails(filename, field)
        }
      }]
    )(params)
  },
  (filename, field) => {
    const params =
      R.evolve(
        {
          status: v => v == 'Tot' ? 'all' : 'indigenous'
        },
        R.merge(
          extract(
            /(\d{4})Census_I04_AUST?_([^_\.]+)(?:_short)?\.csv$/i,
            'year',
            'regionType')(filename),
          extract(
            /^(Av_N_p_pe_be|Avg_Nu_psns_per_bed)_(In_ps_hh_wi?_In_p|Tot)/i,
            'statistic',
            'status')(field)
        )
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'statistic', 'status'),
      params => [{
        regionType: params.regionType.toLowerCase() + '_' + params.year,
        attribute: {
          "name": `census${params.year}_average_number_of_persons_per_bedroom_${params.status}`.toLowerCase(),
          "description": `Average number of persons per bedroom - ${params.status} (Census ${params.year})`,
          "type": "number",
          "category": "housing",
          "format": {
            "maximumFractionDigits": 1
          },
          "source": sourceDetails(filename, field)
        }
      }]
    )(params)
  },
  (filename, field) => {
    const params =
      R.evolve(
        {
          gender: v => {
            switch (v) {
              case 'M': return 'Males'
              case 'F': return 'Females'
              case 'P': return 'Persons'
              default:  return null
            }
          },
          high: v => {
            return v.replace('_', '')
          },
          status: v => v == 'Tot' ? 'Total' : 'Indigenous'
        },
        R.merge(
          R.mergeWith(
            R.defaultTo,
            extract(
              /^(2011)Census_I03._AUST_(ILOC)_short\.csv$/i,
              'year',
              'regionType')(filename),
            extract(
              /^(2016)Census_I03._AUS_(LGA|SA2|SA3)\.csv$/i,
              'year',
              'regionType')(filename)
          ),
          extract(
            /^Age_(\d+)(_\d+|_?over)_(Indig|Tot)_?(M|F|P)$/i,
            'low',
            'high',
            'status',
            'gender')(field)
        )
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'low', 'high', 'status', 'gender'),
      chainApplyToAll(
        orEmpty(
          R.where({
            'high': R.test(/^\d+$/)
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_${params.low}to${params.high}_${params.gender}_${params.status}`.toLowerCase(),
              "description": `${params.status} ${params.gender} - Age ${params.low}-${params.high} (Census ${params.year})`,
              "type": "number",
              "category": "demographics",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'high': R.equals("over")
          }),
          params => [{
            regionType: params.regionType.toLowerCase() + '_' + params.year,
            attribute: {
              "name": `census${params.year}_${params.low}plus_${params.gender}_${params.status}`.toLowerCase(),
              "description": `${params.status} ${params.gender} - Age ${params.low}+ (Census ${params.year})`,
              "type": "number",
              "category": "demographics",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        )
      )
    )(params)
  },
  (filename, field) => {
    const params =
      R.evolve(
        {
          gender: v => {
            switch (v) {
              case 'M': return 'Males'
              case 'F': return 'Females'
              case 'P': return 'Persons'
              default:  return null
            }
          },
          status: v => v == 'Tot' ? 'Total' : 'Indigenous'
        },
        R.merge(
          R.mergeWith(
            R.defaultTo,
            extract(
              /^(2011)Census_I03._AUST_(ILOC)_short\.csv$/i,
              'year',
              'regionType')(filename),
            extract(
              /^(2016)Census_I03._AUS_(LGA|SA2|SA3)\.csv$/i,
              'year',
              'regionType')(filename)
          ),
          extract(
            /^Tot_(Indig_|Tot)(M|F|P)$/i,
            'status',
            'gender')(field)
        )
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'status', 'gender'),
      params => [{
        regionType: params.regionType.toLowerCase() + '_' + params.year,
        attribute: {
          "name": `census${params.year}_all_${params.gender}_${params.status}`.toLowerCase(),
          "description": `${params.status} ${params.gender} - All Ages (Census ${params.year})`,
          "type": "number",
          "category": "demographics",
          "format": integerFormat,
          "source": sourceDetails(filename, field)
        }
      }]
    )(params)
  },
  (filename, field) => {
    const params =
      R.evolve(
        {
          status: v =>
            v == 'Tot' ?
            'Total' :
            (v.startsWith('In') ?
              'Indigenous' :
              'Non-Indigenous')
        },
        R.merge(
          extract(
            /(\d{4})Census_I04_AUST?_([^_\.]+)(?:_short)?\.csv$/i,
            'year',
            'regionType')(filename),
          extract(
            /^P_d_n_x_b_(In_ps_hh_w_In_p|No_In_p_oth_hh|Tot)$/i,
            'status')(field)
        )
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'status'),
      params => [{
        regionType: params.regionType.toLowerCase() + '_' + params.year,
        attribute: {
          "name": `census${params.year}_proportion_of_dwellings_that_need_1_or_more_extra_bedrooms_${params.status.replace('-', '_')}`.toLowerCase(),
          "description": `Proportion of dwellings that need 1 or more extra bedrooms - ${params.status} (Census ${params.year})`,
          "type": "number",
          "category": "housing",
          "format": {
            "style": "percent"
          },
          "source": sourceDetails(filename, field)
        },
        transform: v => Number.parseFloat(v+"e-2")
      }]
    )(params)
  }
]

// readCSV :: String → String → Promise [Object]
const readCSV = regionColumnIndex => filepath => {
  return new Promise((resolve, reject) => {
    // TODO: make this more functional
    // (At least all the mutability is contained here.)
    const attributeRetreiver = field => {
      return R.apply(chainApplyToAll, matchers)(path.basename(filepath), field)
    }
    let regionColumnName = null
    let attributeData = null
    const reader = fs.createReadStream(filepath)
    const parser = parseCSV({
      auto_parse: true,
      columns: true
    })
    parser.on('readable', function() {
      let record;
      while (record = parser.read()) {
        if (!attributeData) {
          regionColumnName = R.keys(record)[regionColumnIndex]
          const fields = R.reject(R.equals(regionColumnName))(R.keys(record))
          attributeData = R.chain(field => {
            const attributes = attributeRetreiver(field)
            if (R.isEmpty(attributes)) {
              return []
            } else {
              return R.map(v => {
                return {
                  field: field,
                  regionAttribute: v,
                  data: {}
                }
              }, attributes)
            }
          })(fields)
        }
        attributeData.forEach(obj => {
          var region = record[regionColumnName]
          obj.data[region] = (obj.regionAttribute.transform || R.identity)(
            record[obj.field]
          )
        })
      }
    })
    // Catch any error
    parser.on('error', function(err) {
      reject(err)
    });
    // When we are done, test that the parsed output matched what expected
    parser.on('finish', function() {
      resolve(attributeData)
    })
    reader.pipe(parser)
  })
}

// writeAttributeToFile :: Object → Promise Object
const writeAttributeDataToFile = attributeData => {
  return writeAttributeData(
      accessType,
      attributeData.regionAttribute.regionType,
      attributeData.regionAttribute.attribute,
      attributeData.data
    ).then(R.always(attributeData))
}

// combinedPromise :: (a → [Promise b]) → (a → Promise [b])
const combinedPromise = f => R.pipe(f, vs => Promise.all(vs))

// readCSVs :: [String] → Promise [Object]
const readCSVs =
  R.pipeP(
    combinedPromise(R.map(readCSV(0))),
    R.unnest)

// writeAttributes :: [Object] → Promise [Object]
const writeAttributes = combinedPromise(R.map(writeAttributeDataToFile))

// writeIndexes :: [Object] -> Promise [Object]
const writeIndexes =
  R.pipe(
    R.groupBy(R.prop('regionType')),        // [{k: v}]
    R.toPairs,                              // [[k, v]]
    R.map(
      R.over(
        R.lensIndex(1),
        R.map(R.prop('attribute'))
      )
    ),                                      // [[k, v]]
    R.map(R.apply(writeIndex(accessType))), // [Promise Object]
    combinedPromise                         // Promise [Object]
  )

// prog :: [String] → Promise [Object]
const prog =
  R.pipeP(
    readCSVs,
    writeAttributes,
    R.map(R.prop('regionAttribute')),
    writeIndexes)

const argsIO = process.argv.slice(2)
prog(argsIO).catch(e => console.error(e))
