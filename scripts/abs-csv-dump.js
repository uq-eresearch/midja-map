import fs from 'fs'
import path from 'path'
import { readJson, writeJson } from 'fs-extra'
const R = require('ramda')
const parseCSV = require('csv-parse');
const extract = R.curry((p, ...ks) => R.pipe(
  R.match(p), R.ifElse(R.has('input'), R.tail, R.identity), R.zipObj(ks)))
const hasKeys = (...ks) => R.allPass(R.map(R.has)(ks))
const chainApplyToAll =
  (...fs) => (...args) => R.chain(f => R.apply(f)(args))(fs)

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
          /(\d{4})Census_I04_AUST_(\w+)_long/,
          'year',
          'regionType')(filename),
        extract(
          /median_total_household_income_weekly_(.+)$/i,
          'suffix')(field));
    return orEmpty(
      hasKeys('year', 'regionType', 'suffix'),
      chainApplyToAll(
        orEmpty(
          R.pipe(R.prop('suffix'), R.test(/total$/i)),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_median_weekly_household_income_all`,
              "description": `Median weekly household income - all households (Census ${params.year})`,
              "type": "number",
              "format": currencyFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.pipe(R.prop('suffix'), R.test(/with_indigenous_persons$/i)),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_median_weekly_household_income_indigenous`,
              "description": `Median weekly household income - indigenous households (Census ${params.year})`,
              "type": "number",
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
          /(\d{4})Census_I06_AUST_(\w+)_long/,
          'year',
          'regionType')(filename),
        extract(
          /^persons_(year_12_or_equivalent|total)_(indigenous|total)$/i,
          'prefix',
          'suffix')(field));
    return orEmpty(
      hasKeys('year', 'regionType', 'prefix', 'suffix'),
      chainApplyToAll(
        orEmpty(
          R.where({
            'prefix': R.test(/^year_12/i),
            'suffix': R.test(/^indigenous$/i)
          }),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_year_12_educated_indigenous_persons`,
              "description": `Year 12 educated - indigenous persons (Census ${params.year})`,
              "type": "number",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'prefix': R.test(/^total$/i),
            'suffix': R.test(/^indigenous$/i)
          }),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_total_possibly_educated_indigenous_persons`,
              "description": `Total possibly educated persons - indigenous persons (Census ${params.year})`,
              "type": "number",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'prefix': R.test(/^year_12/i),
            'suffix': R.test(/^total$/i)
          }),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_year_12_educated_all_persons`,
              "description": `Year 12 educated - all persons (Census ${params.year})`,
              "type": "number",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'prefix': R.test(/^total$/i),
            'suffix': R.test(/^total$/i)
          }),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_total_possibly_educated_all_persons`,
              "description": `Total possibly educated persons - all persons (Census ${params.year})`,
              "type": "number",
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
          suffix: v => /indigenous/i.test(v) ? 'indigenous' : 'all'
        },
        R.merge(
          extract(
            /(\d{4})Census_I13_AUST_(\w+)_long/,
            'year',
            'regionType')(filename),
          extract(
            /^(\d+|negative|partial|all)_(\d+|nil_income|or_more|income.*_stated)_(households_with_indigenous_persons|total_households)$/i,
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
            'low': R.test(/^partial$/i)
          }),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_partially_unstated_weekly_household_income_${params.suffix}`,
              "description": `Partially-unstated weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
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
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_completely_unstated_weekly_household_income_${params.suffix}`,
              "description": `Completely-unstated weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
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
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_${params.low}to${params.high}_weekly_household_income_${params.suffix}`,
              "description": `\$${params.low} - \$${params.high} weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'high': R.test(/more$/)
          }),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_${params.low}plus_weekly_household_income_${params.suffix}`,
              "description": `\$${params.low}+ weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
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
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_0minus_weekly_household_income_${params.suffix}`,
              "description": `Nil or negative weekly household income - ${params.suffix} households (Census ${params.year})`,
              "type": "number",
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
            /(\d{4})Census_I15._AUST_(\w+)_long/i,
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
        regionType: params.regionType.toLowerCase(),
        attribute: {
          "name": `census${params.year}_${params.status}_persons_${params.low}to${params.high}_${params.qualification}`.toLowerCase(),
          "description": `Education level of ${params.status} persons ${params.low}-${params.high} years - ${params.qualification.replace(/_/g,' ')} (Census ${params.year})`,
          "type": "number",
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
          status: v => /indigenous/i.test(v) ? 'indigenous' : 'all'
        },
        R.merge(
          extract(
            /(\d{4})Census_I04_AUST_(\w+)_long/i,
            'year',
            'regionType')(filename),
          extract(
            /^(average_number_of_persons_per_bedroom|average_household_size)_(indigenous|total)/i,
            'statistic',
            'status')(field)
        )
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'statistic', 'status'),
      params => [{
        regionType: params.regionType.toLowerCase(),
        attribute: {
          "name": `census${params.year}_${params.statistic}_${params.status}`.toLowerCase(),
          "description": `${params.statistic.replace(/_/g,' ')} - ${params.status} (Census ${params.year})`,
          "type": "number",
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
          high: v => v.replace(/_?years_?/i, '')
        },
        R.merge(
          extract(
            /(\d{4})Census_I03._AUST_(ILOC)_long/i,
            'year',
            'regionType')(filename),
          extract(
            /^age_years_(\d+)_(\d+_years|years_and_over)_(indigenous|total)_(males|females|persons)$/i,
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
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_${params.low}to${params.high}_${params.gender}_${params.status}`.toLowerCase(),
              "description": `${params.status} ${params.gender} - Age ${params.low}-${params.high} (Census ${params.year})`,
              "type": "number",
              "format": integerFormat,
              "source": sourceDetails(filename, field)
            }
          }]
        ),
        orEmpty(
          R.where({
            'high': R.equals("and_over")
          }),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_${params.low}plus_${params.gender}_${params.status}`.toLowerCase(),
              "description": `${params.status} ${params.gender} - Age ${params.low}+ (Census ${params.year})`,
              "type": "number",
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
      R.merge(
        extract(
          /(\d{4})Census_I03._AUST_(ILOC)_long/i,
          'year',
          'regionType')(filename),
        extract(
          /^total_(indigenous|total)_(males|females|persons)$/i,
          'status',
          'gender')(field)
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'status', 'gender'),
      params => [{
        regionType: params.regionType.toLowerCase(),
        attribute: {
          "name": `census${params.year}_all_${params.gender}_${params.status}`.toLowerCase(),
          "description": `${params.status} ${params.gender} - All Ages (Census ${params.year})`,
          "type": "number",
          "format": integerFormat,
          "source": sourceDetails(filename, field)
        }
      }]
    )(params)
  },
  (filename, field) => {
    const params =
      R.merge(
        extract(
          /(\d{4})Census_I04_AUST_(\w+)_long/i,
          'year',
          'regionType')(filename),
        extract(
          /^(proportion_of_dwellings_that_need_1_or_more_extra_bedrooms)_(.*?indigenous|total)/i,
          'name',
          'status')(field)
      )
    return orEmpty(
      hasKeys('year', 'regionType', 'name', 'status'),
      params => [{
        regionType: params.regionType.toLowerCase(),
        attribute: {
          "name": `census${params.year}_${params.name}_${params.status}`.toLowerCase(),
          "description": `${params.name.replace(/_/g, ' ')} - ${params.status.replace(/_/g, '-')} (Census ${params.year})`,
          "type": "number",
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
const readCSV = regionColumnName => filepath => {
  return new Promise((resolve, reject) => {
    // TODO: make this more functional
    // (At least all the mutability is contained here.)
    const attributeRetreiver = field => {
      return R.apply(chainApplyToAll, matchers)(path.basename(filepath), field)
    }
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

const jsonOptions = {
  spaces: 2
}

// targetFile :: (String, String) → String
const targetFile = (regionType, filename) => path.resolve(
  __dirname, '..', 'data', 'public',
  regionType,
  filename
)

// indexTargetFile :: String → String
const indexTargetFile = regionType => targetFile(regionType, 'index.json')

// attributeDataTargetFile :: Object → String
const attributeDataTargetFile = regionAttribute => targetFile(
  regionAttribute.regionType,
  regionAttribute.attribute.name + '.json')

// writeAttributeToFile :: Object → Promise Object
const writeAttributeDataToFile = attributeData => {
  return writeJson(
      attributeDataTargetFile(attributeData.regionAttribute),
      attributeData.data,
      jsonOptions
    ).then(R.always(attributeData))
}

// writeIndex :: (String, [Object]) → Promise [Object]
const writeIndex = (regionType, updatedAttributes) => {
  const modifyAttributes = (currentAttributes) => R.sortBy(
    R.prop('name'),
    R.unionWith(
      R.eqBy(R.prop('name')),
      updatedAttributes,
      currentAttributes)
  )
  const attrsLens = R.lensProp('attributes')
  const indexFile = indexTargetFile(regionType)
  R.pipeP(
    () => readJson(indexFile),
    R.over(attrsLens, modifyAttributes),
    R.curryN(3, writeJson)(indexFile, R.__, jsonOptions)
  )()
}

// combinedPromise :: (a → [Promise b]) → (a → Promise [b])
const combinedPromise = f => R.pipe(f, vs => Promise.all(vs))

// readCSVs :: [String] → Promise [Object]
const readCSVs =
  R.pipeP(
    combinedPromise(R.map(readCSV('region_id'))),
    R.unnest)

// writeAttributes :: [Object] → Promise [Object]
const writeAttributes = combinedPromise(R.map(writeAttributeDataToFile))

// writeIndexes :: [Object] -> Promise [Object]
const writeIndexes =
  R.pipe(
    R.groupBy(R.prop('regionType')), // [{k: v}]
    R.toPairs,                       // [[k, v]]
    R.map(
      R.over(
        R.lensIndex(1),
        R.map(R.prop('attribute'))
      )
    ),                               // [[k, v]]
    R.map(R.apply(writeIndex)),      // [Promise Object]
    combinedPromise                  // Promise [Object]
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
