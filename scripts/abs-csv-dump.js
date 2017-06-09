import fs from 'fs'
import path from 'path'
const R = require('ramda')
import { Future, IO, Maybe } from 'ramda-fantasy'
const parseCSV = require('csv-parser');
const typify = require('typify').create()

typify.type('attributeType', v => v === 'number' || v === 'string')
typify.alias('filename', 'string')
typify.alias('field', 'string')
typify.alias('regionType', 'string')
typify.record('attribute', {
  name: 'string',
  description: 'string',
  type: 'attributeType'
})
typify.record('regionAttribute', {
  regionType: 'regionType',
  attribute: 'attribute'
})
//typify.alias('attributeMatcher', 'filename -> field -> array regionAttribute')
//typify.alias('attributeMatcher', 'string -> string -> array regionAttribute')

const extract = R.curry((p, ...ks) => R.pipe(
  R.match(p), R.ifElse(R.has('input'), R.tail, R.identity), R.zipObj(ks)))
const hasKeys = (...ks) => R.allPass(R.map(R.has)(ks))

const matchers = [
  typify("medianHouseholdIncomeMatcher :: filename -> field -> array regionAttribute", function(filename, field) {
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
  })
]

const regionAttributesForField = typify(
  "regionAttributesForField :: array function -> filename -> field -> array regionAttribute",
  (matchers, filename, field) => R.chain(f => f(filename, field))(matchers)
)

const readCSV = regionColumnName => filepath => IO(() => {
  return Future((reject, resolve) => {
    // TODO: make this more functional
    // (At least all the mutability is contained here.)
    const attributeRetreiver = (field) =>
      regionAttributesForField(matchers, path.basename(filepath), field)
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
})

const debugOut = future => IO(() => {
  future.fork(err => console.error(err), data => console.log(data))
})

const argsIO = IO(() => process.argv.slice(2))

var prog =
  argsIO.chain(R.traverse(IO.of, readCSV('region_id')))
        .map(R.sequence(Future.of))
        .map(R.map(R.unnest))
        .chain(debugOut)

prog.runIO()
