const Mustache = require('mustache')
const R = require('ramda')
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

const mapValuesDeep = (f, obj) => R.mapObjIndexed(
  v => R.type(v) == 'Object' ? mapValuesDeep(f, v) : f(v),
  obj
)

// [Object] -> [[Object]]
const dimensionPermutations =
  R.reduce(
    (m, dimension) => R.chain(
      dv => R.map(ds => R.concat(ds, [dv]), m),
      dimension.values
    ),
    [[]])

const buildQueries = (config) =>
  R.chain(
    (dSeq) => R.map(
      (period) => {
        const sdmxJsonQuery = sdmxrest.getDataQuery({
          flow: config.flow,
          key: R.pluck('code', dSeq).join('.'),
          start: period,
          end: period
        })
        const templateContext = R.merge(
          R.zipObj(
            R.pluck('name', config.dimensions),
            R.addIndex(R.map)(
              (v, i) => R.merge(v, R.objOf('seriesIndex', i)),
              dSeq)
          ),
          {
            period: period,
            query: {
              object: sdmxJsonQuery,
              url: sdmxrest.getUrl(sdmxJsonQuery, absService)
            }
          })
        const kdi = R.findIndex(
          d => d.name == config.keyDimension,
          config.dimensions)
        return R.merge(
          mapValuesDeep(
            (tmpl) =>
              (typeof tmpl == 'string') ?
              Mustache.render(tmpl, templateContext) :
              tmpl,
            config.templates
          ),
          {
            keyDimensionIndex: kdi,
            keyTransform: (v => (config.keyPrefix || "") + v),
            query: sdmxJsonQuery
          })
      },
      config.periods),
    dimensionPermutations(config.dimensions))

const writeJsonDict = filepath => data =>
  fs.ensureDir(path.dirname(filepath))
    .then(() => fs.writeJson(filepath, data, {spaces: 2}))
    .then(() => console.log("Wrote " + filepath))
    .then(() => filepath)

const extractDataFromSdmxJson = (keyIndex, keyTransform) => dataStr => {
  const data = JSON.parse(dataStr)
  const keys = R.map(
    R.pipe(
      R.prop('id'),
      keyTransform),
    data.structure.dimensions.series[keyIndex].values)
  const values = R.map(
    v => v.observations["0"][0],
    R.values(data.dataSets[0].series))
  if (keys.length != values.length) {
    throw Error(keys.length + " keys, but " + values.length +
      " values!")
  }
  return R.zipObj(keys, values)
}

function doQuery(attrQuery) {
  var filepath = path.join(outputDir, attrQuery.filepath)
  return fs.exists(filepath)
    .then((exists) => {
      return exists ?
        attrQuery :
        sdmxrest.request(attrQuery.query, absService, headers)
          .then(extractDataFromSdmxJson(
            attrQuery.keyDimensionIndex, attrQuery.keyTransform))
          .then(writeJsonDict(filepath))
          .then(R.always(attrQuery))
          .catch((e) => {
            console.log(attrQuery)
            throw e
          })
    })
}

// Run
fs.readJson(path.resolve(__dirname, 'abs-sdmx-dump-config.json'))
  .then(R.chain(buildQueries))
  .then(R.map(doQuery))
  .then(queryPromises => Promise.all(queryPromises))
  .then(R.groupBy(R.prop('group')))
  .then(
    R.mapObjIndexed(
      (queries, group) => {
        const attributes = R.map(R.prop('attribute'), queries)
        const indexFile = path.join(outputDir, group, 'index.json')
        return fs.readJson(indexFile)
          .then(
            R.over(
              R.lensProp('attributes'),
              R.pipe(
                R.unionWith(R.eqProps('name'), attributes),
                R.sortBy(R.prop('name'))
              )
            )
          )
          .then((modifiedIndex) => {
            console.log("Updating index for " + group)
            return writeJsonDict(indexFile)(modifiedIndex)
          })
      }
    )
  )
  .then(R.values)
  .then(promises => Promise.all(promises))
  .catch(e => { console.log(e, e.stack) })
