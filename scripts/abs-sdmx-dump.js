const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const sdmxrest = require('sdmx-rest')
const DataFormat = require("sdmx-rest").data.DataFormat
const absService = sdmxrest.getService({
  url: "http://stat.data.abs.gov.au/sdmx-json/"
})
const outputDir = path.relative('.',
  path.resolve(__dirname, '..', 'data', 'public'))

const headers = {
  headers: {
    accept: DataFormat.SDMX_JSON,
    "accept-encoding": "gzip"
  }
}

const mapValuesDeep = (obj, f) => _.mapValues(
  obj,
  v => _.isObject(v) ? mapValuesDeep(v, f) : f(v)
)

function buildQueries(config) {
  const dimensionNames = config.dimensions.map(_.property('name'))
  const dimensionPermutations =
    _.reduce(config.dimensions, (m, dimension) => {
      return _.flatMap(
        dimension.values, (dv) => _.map(m, ds => _.concat(ds, [dv]))
      )
    }, [[]])
  return _.flatMap(config.periods, (period) => {
    return dimensionPermutations.map((dSeq) => {
      const key = dSeq.map(_.property('code')).join('.');
      const sdmxJsonQuery = sdmxrest.getDataQuery({
        flow: config.flow,
        key: key,
        start: period,
        end: period
      })
      var templateContext = _.defaults({},
        _.zipObject(
          dimensionNames,
          _.map(dSeq, (v, i) => _.defaults(v, {
            seriesIndex: i
          }))), {
          period: period,
          query: {
            object: sdmxJsonQuery,
            url: sdmxrest.getUrl(sdmxJsonQuery, absService)
          }
        });
      const kdi = _.findIndex(
        config.dimensions,
        d => d.name == config.keyDimension)
      return _.defaults({},
        mapValuesDeep(
          config.templates, (tmpl) => _.template(tmpl)(templateContext)
        ), {
          keyDimensionIndex: kdi,
          query: sdmxJsonQuery
        })
    })
  })
}

const writeJsonDict = filepath => data => {
  return fs.ensureDir(path.dirname(filepath))
    .then(() => fs.writeJson(filepath, data, {spaces: 2}))
    .then(() => console.log("Wrote " + filepath))
    .then(() => filepath)
}

const extractDataFromSdmxJson = keyIndex => dataStr => {
  const data = JSON.parse(dataStr)
  const keys = _.map(
    data.structure.dimensions.series[keyIndex].values,
    _.property('id'))
  const values = _.map(
    _.values(data.dataSets[0].series),
    v => v.observations["0"][0])
  if (keys.length != values.length) {
    throw Error(keys.length + " keys, but " + values.length +
      " values!")
  }
  return _.zipObject(keys, values)
}

function doQuery(attrQuery) {
  var filepath = path.join(outputDir, attrQuery.filepath)
  return fs.exists(filepath)
    .then((exists) => {
      return exists ?
        attrQuery :
        sdmxrest.request(attrQuery.query, absService, headers)
          .then(extractDataFromSdmxJson(attrQuery.keyDimensionIndex))
          .then(writeJsonDict(filepath))
          .then(_.constant(attrQuery))
          .catch((e) => {
            console.log(attrQuery);
            throw e
          });
    })
}

// Run
fs.readJson(path.resolve(__dirname, 'abs-sdmx-dump-config.json'))
  .then(configs => _.flatMap(configs, buildQueries))
  .then(queries => Promise.all(queries.map(doQuery)))
  .then(queries => {
    return Promise.all(_.map(
      _.groupBy(queries, _.property('group')),
      function(queries, group) {
        console.log("Writing index for " + group)
        const attributes = _.map(queries, _.property('attribute'))
        writeJsonDict(path.join(outputDir, group + '.json'))(attributes)
      }))
  })
  .catch(e => console.log(e))
