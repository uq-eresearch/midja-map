import fs from 'fs'
import path from 'path'
import { writeJson } from 'fs-extra'
const R = require('ramda')
import { Future, IO, Maybe } from 'ramda-fantasy'
const parseCSV = require('csv-parser');
const extract = R.curry((p, ...ks) => R.pipe(
  R.match(p), R.ifElse(R.has('input'), R.tail, R.identity), R.zipObj(ks)))
const hasKeys = (...ks) => R.allPass(R.map(R.has)(ks))

const matchers = [
  filename => field => {
    const params =
      R.merge(
        extract(
          /(\d{4})Census_I04_AUST_(\w+)_long/,
          'year',
          'regionType')(filename),
        extract(
          /median_total_household_income_weekly_(.+)$/i,
          'suffix')(field))
    if (hasKeys('year', 'regionType', 'suffix')(params)) {
      return R.cond([
        [
          R.pipe(R.prop('suffix'), R.test(/total$/i)),
          params => [{
            regionType: params.regionType.toLowerCase(),
            attribute: {
              "name": `census${params.year}_median_household_income_total`,
              "description": `Median household income - all households (Census ${params.year})`,
              "type": "number",
              "format": {
                "maximumFractionDigits": 1,
                "minimumFractionDigits": 1
              },
              "source": {
                "name": "Australian Bureau of Statistics",
                "license": {
                  "type": "Creative Commons Attribution 2.5 Australia",
                  "url": "https://creativecommons.org/licenses/by/2.5/au/"
                },
                "notes": `from ${filename}`
              }
            }
          }]
        ],
        [
          R.T,
          R.always([])
        ]
      ])(params)
    } else {
      return []
    }
  }
]

// regionAttributesForField :: [(String -> String -> Object)] -> (String -> String -> [Object])
const regionAttributesForField =
  matchers => filename => field => R.chain(f => f(filename)(field))(matchers)

// readCSV :: String -> String -> Promise [Object]
const readCSV = regionColumnName => filepath => {
  return new Promise((resolve, reject) => {
    // TODO: make this more functional
    // (At least all the mutability is contained here.)
    const attributeRetreiver =
      regionAttributesForField(matchers)(path.basename(filepath))
    let attributeData = null
    const reader = fs.createReadStream(filepath)
    const parser = parseCSV({ columns: false })
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
              return {
                field: field,
                regionAttributes: attributes,
                data: {}
              }
            }
          })(fields)
        }
        attributeData.forEach(obj => {
          var region = record[regionColumnName]
          var value = record[obj.field]
          obj.data[region] = value
        })
      }
    })
    // Catch any error
    parser.on('error', function(err) {
      reject(err)
    });
    // When we are done, test that the parsed output matched what expected
    parser.on('finish', function() {
      resolve(R.chain(obj => {
        return R.map(R.merge({ data: obj.data }))(obj.regionAttributes)
      })(attributeData))
    })
    reader.pipe(parser)
  })
}

// attributeDataTargetFile :: Object => String
const attributeDataTargetFile = regionAttribute => path.resolve(
  __dirname, '..', 'data', 'public',
  regionAttribute.regionType,
  regionAttribute.attribute.name + '.json'
)

// writeToFile :: Object -> Promise Object
const writeToFile = regionAttribute => {
  return writeJson(
      attributeDataTargetFile(regionAttribute),
      regionAttribute.data
    ).then(v => { console.log(v); return regionAttribute })
}

// combinedPromise :: (a -> [Promise b]) -> (a -> Promise [b])
const combinedPromise = f => R.pipe(f, vs => Promise.all(vs))

// readCSVs :: [String] -> Promise [Object]
const readCSVs =
  R.pipeP(
    combinedPromise(R.map(readCSV('region_id'))),
    R.unnest)

// writeAttributes :: [Object] -> Promise [Object]
const writeAttributes = combinedPromise(R.map(writeToFile))

// prog :: [String] -> Promise [Object]
const prog =
  R.pipeP(
    readCSVs,
    writeAttributes)

const argsIO = process.argv.slice(2)
prog(argsIO).catch(console.err)
