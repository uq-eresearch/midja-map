import * as R from 'ramda'
import axios from 'axios'
import { csvTextParser } from '../lib/attribute/import'
import { WeightedMean } from '../lib/util'
import extractZip from 'extract-zip'
import * as fs from 'fs-extra'
import * as gdal from 'gdal'
import * as http from 'http'
import { createGzip as createCompressor } from 'zlib'
import { spawn } from 'child_process'
import moment from 'moment'
import * as osmosis from 'osmosis'
import * as path from 'path'
import turf from '@turf/turf'
import * as url from 'url'
import * as yargs from 'yargs'
const tmpDataDir = path.relative('.',
  path.resolve(__dirname, '..', 'tmp', 'data'))

const debug = require('debug')('bom-download')

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 16
})

const urlResolver = (cat: String) => (ds: String) => {
  return `http://www.bom.gov.au/web03/ncc/www/awap/${cat}/daily/grid/0.05/history/nat/${ds}${ds}.grid.Z`
}

const urlResolvers: { [stat: string]: (datestamp: string) => string } = {
  'min_temp': urlResolver('temperature/maxave'),
  'max_temp': urlResolver('temperature/minave'),
  'rainfall': urlResolver('rainfall/totals')
}

const statisticUrl = (statistic: string, date: moment.Moment) => {
  return urlResolvers[statistic](date.format('YYYYMMDD'))
}

function outputFile(statistic: string, date: moment.Moment) {
  const datestamp = date.format('YYYY-MM-DD')
  return path.resolve(tmpDataDir, statistic, `${datestamp}.grid.gz`)
}

function download(
    statistic: string,
    date: moment.Moment,
    filepath: string): Promise<void> {
  debug(`Downloading ${statistic} for `+date.format('YYYY-MM-DD'))
  return fs.mkdirs(path.dirname(filepath))
    .then(() =>
      axios(
        statisticUrl(statistic, date),
        {
          method: 'get',
          httpAgent: httpAgent,
          responseType: 'stream'
        }
      )
    )
    .then((response: {data: NodeJS.ReadableStream}) => {
      return new Promise<void>((resolve, reject) => {
        const zcatProcess = spawn('zcat', [], {
          stdio: 'pipe'
        })
        const writer = zcatProcess.stdout
          .pipe(createCompressor())
          .pipe(fs.createWriteStream(filepath))
        writer.on('finish', () => {
          zcatProcess.unref()
          debug("wrote "+filepath)
          resolve()
        })
        writer.on('error', (error: Error) => {
          debug(error)
          reject()
        })
        response.data
          .pipe(zcatProcess.stdin)
      })
    })
}

type MeshBlockType = "mb2011" | "mb2016"
interface FileLink {
  name: string,
  link: string
}
type SavePathResolver = (filename: string) => string

function ensureLinkDownloaded(
    resolver: SavePathResolver): (linkObj: FileLink) => Promise<string> {
  return (linkObj: FileLink) =>
    axios.head(
      linkObj.link,
      {
        httpAgent: httpAgent,
        responseType: 'stream'
      })
      .then(response => {
        const filename =
          path.basename(
            url.parse((response as any).request.path).pathname)
        return filename
      })
      .then(filename => {
        const filepath = resolver(filename)
        function download() {
          debug(`Downloading ${linkObj.name} to ${filename}`)
          return fs.mkdirs(path.dirname(filepath))
            .then(() => axios.get(
              linkObj.link,
              {
                httpAgent: httpAgent,
                responseType: 'stream'
              })
              .then((response: {data: NodeJS.ReadableStream}) => {
                return new Promise<void>((resolve, reject) => {
                  const writer = fs.createWriteStream(filepath)
                  writer.on('finish', () => {
                    debug("wrote "+filepath)
                    resolve()
                  })
                  writer.on('error', (error: Error) => {
                    debug(error)
                    reject()
                  })
                  response.data.pipe(writer)
                })
              }))
        }
        return fs.access(filepath)
          .then(() => {
            debug(`Already have ${filepath}`)
          })
          .catch(download)
          .then<string>(() => filepath)
          .catch((e: Error) => {
            debug(e)
            throw e
          })
      })
}

function withFeatures<T>(
    meshBlockType: MeshBlockType,
    reduceF: (accumulator: T, feature: gdal.Feature) => Promise<T>,
    accumulatorBase: T): Promise<T> {
  const urls: (meshBlockType: MeshBlockType) => string = R.flip(R.prop)({
    'mb2011': 'http://www.abs.gov.au/AUSSTATS/abs@.nsf/DetailsPage/1270.0.55.001July%202011?OpenDocument',
    'mb2016': 'http://www.abs.gov.au/AUSSTATS/abs@.nsf/DetailsPage/1270.0.55.001July%202016?OpenDocument'
  })

  const fetchLinks = (downloadPageUrl: string) => new Promise((resolve, reject) => {
    let links: FileLink[] = []
    osmosis
      .get(downloadPageUrl)
      .find('.listentry')
      .set({
        'name': 'td:first/text()',
        'link': 'td a @href'
      })
      .data((data: FileLink) => {
        const linkData = R.evolve({
          'link': (l: string) => url.resolve(downloadPageUrl, l)
        }, data)
        if (data.name && data.name.match(/Mesh Blocks.*Shapefile/i)) {
          links = R.append(linkData, links)
        }
      })
      .done(function() {
        resolve(R.uniq(links))
      })
      .log(debug)
      .error((e: Error) => { console.log(e, e.stack); reject(e) })
  })

  function ensureLinksDownloaded(linkObjs: FileLink[]): Promise<string[]> {
    const savePathResolver = (filename: string) =>
      path.resolve(
        tmpDataDir,
        'features',
        'shapefiles',
        meshBlockType,
        filename
      )
    return Promise.all<string>(
      linkObjs.map(ensureLinkDownloaded(savePathResolver))
    )
  }

  function withZip(
      zipfilePath: string,
      f: (dirpath: string) => Promise<T>): Promise<T> {
    const extractionPath = path.resolve(
      path.dirname(zipfilePath),
      path.basename(zipfilePath, '.zip'))
    const removeFiles = () => fs.remove(extractionPath)
    const extractionPromise = new Promise(function(response, reject) {
      extractZip(zipfilePath, { dir: extractionPath }, (err) => {
        if (err) {
          reject(err)
        } else {
          response()
        }
      })
    })
    const opPromise = extractionPromise.then(() => f(extractionPath))
    opPromise
      .then(removeFiles)
      .catch(removeFiles)
    return opPromise
  }

  function withDataset(
      file: string,
      f: (d: gdal.Dataset) => Promise<T>): Promise<T> {
    const dataset = gdal.open(file)
    try {
      return f(dataset)
    } finally {
      dataset.close()
    }
  }

  function processLayers(
      accumP: Promise<T>,
      file: string): Promise<T> {
    return withDataset(
      file,
      dataset => {
        let aP = accumP
        dataset.layers.forEach((layer: gdal.Layer) => {
          aP = processFeatures(aP, layer)
        })
        return aP
      }
    )
  }

  function processFeatures(
      accumP: Promise<T>,
      layer: gdal.Layer): Promise<T> {
    let aP = accumP
    layer.features.forEach((feature: gdal.Feature) => {
      aP = aP.then(acc => reduceF(acc, feature))
    })
    return aP
  }

  function processZippedShapefiles(
      accumP: Promise<T>,
      zipfile: string): Promise<T> {
    return withZip(zipfile, dirpath => {
      return fs.readdir(dirpath)
        .then(R.filter(R.test(/.shp$/)))
        .then(R.map(file => path.resolve(dirpath, file)))
        .then<T>(
          R.reduce(
            processLayers,
            accumP
          )
        )
    })
  }

  return fetchLinks(urls(meshBlockType))
    .then<string[]>(ensureLinksDownloaded)
    .then<T>(
      R.reduce<string, Promise<T>>(
        processZippedShapefiles,
        Promise.resolve(accumulatorBase)
      )
    )
}

function fetchCensusCounts(
    meshBlockType: MeshBlockType): Promise<(mbCode: string) => number> {
  const downloadPageUrls: (meshBlockType: MeshBlockType) => string =
    R.flip(R.prop)({
      'mb2011': 'http://www.abs.gov.au/AUSSTATS/abs@.nsf/DetailsPage/2074.02011?OpenDocument',
      'mb2016': 'http://www.abs.gov.au/AUSSTATS/abs@.nsf/DetailsPage/2074.02016?OpenDocument'
    })

  const fetchLink = (downloadPageUrl: string) => new Promise((resolve, reject) => {
    let link: FileLink = null
    osmosis
      .get(downloadPageUrl)
      .find('.listentry')
      .set({
        'name': 'td:first/text()',
        'link': 'td a @href'
      })
      .data((data: FileLink) => {
        const linkData = R.evolve({
          'link': (l: string) => url.resolve(downloadPageUrl, l)
        }, data)
        const isDesiredLink =
          R.where({
            'name': R.test(/Census.*Counts/i),
            'link': R.test(/\.csv/i)
          }, linkData)
        if (isDesiredLink) {
          link = linkData
        }
      })
      .done(function() {
        if (link) {
          resolve(link)
        } else {
          reject(Error("CSV link not found"))
        }
      })
      .log(debug)
      .error((e: Error) => { console.log(e, e.stack); reject(e) })
  })

  function processCsvFile(filepath: string): Promise<(code: string) => number> {
    return fs.readFile(filepath)
      .then<string>(v => v.toString('utf8'))
      .then<object[]>(csvTextParser({
        auto_parse: true,
        columns: function(headerRow: string[]) {
          const personsColumnIndex = R.findIndex(
            R.test(/person/i),
            headerRow
          )
          return R.range(0, headerRow.length).map(i => {
            switch (i) {
              case 0:                   return 'code'
              case personsColumnIndex:  return 'persons'
              default:                  return '_'+i
            }
          })
        },
        skip_empty_lines: true,
        relax_column_count: true
      }))
      .then(R.map(R.props(['code', 'persons'])))
      .then<{[code: string]: number}>(R.fromPairs)
      .then(R.flip(R.prop))
  }

  return fetchLink(downloadPageUrls(meshBlockType))
    .then<string>(ensureLinkDownloaded(
      (filename: string) =>
        path.resolve(
          tmpDataDir,
          'features',
          'census',
          meshBlockType,
          filename
        )
    ))
    .then(processCsvFile)

}

const fieldToRegionType: (fieldName: string) => string =
  R.flip(R.prop)(
    {
      'SA2_MAIN11': 'sa2_2011',
      'SA3_CODE11': 'sa3_2011',
      'SA2_MAIN16': 'sa2_2016',
      'SA3_CODE16': 'sa3_2016'
    }
  )
// TODO: remove (just so compilation works)
fieldToRegionType

yargs
  .command({
    command: 'download <statistic> <startDate> [days]',
    describe: 'download data for days',
    builder: (yargs: yargs.Argv) =>
      yargs
        .choices('statistic', R.keys(urlResolvers))
        .coerce('startDate', (d) => moment(d))
        .default('days', 1),
    handler: (args) => {
      for (let i = 0; i < args.days; i++) {
        const date = args.startDate.clone().add(i, 'day')
        const filepath = outputFile(args.statistic, date)
        fs.access(filepath)
          .then(() => debug(`Already have ${filepath}`))
          .catch(() => download(args.statistic, date, filepath))
          .then(() => filepath)
          .catch((e: Error) => {
            debug(e)
          })
      }
    }
  })
  .command({
    command: 'get-features <meshBlockType>',
    describe: 'download features for region type',
    builder: (yargs: yargs.Argv) =>
      yargs
        .choices('meshBlockType', ['mb2011', 'mb2016']),
    handler: (args: { meshBlockType: MeshBlockType }) => {
      fetchCensusCounts(args.meshBlockType)
        .then((getCensusCount: (mbCode: string) => number) => {
          const op = (mean: WeightedMean, feature: gdal.Feature) => {
            const name = feature.fields.get(0)
            const g = feature.getGeometry()
            const featureArea: number = g ? turf.area(g.toObject()) : 0
            const revisedMean =
              featureArea > 0 ? // Zero area features are excluded from mean
              mean.add(new WeightedMean(getCensusCount(name)/featureArea, featureArea)) :
              mean
            const parentFeatureCodes = R.fromPairs(
              feature.fields.getNames()
                .filter(R.pipe(fieldToRegionType, R.is(String)))
                .map((k: string) =>
                  [fieldToRegionType(k), feature.fields.get(k)]
                )
            )
            if (Math.random() > 0.999)
              debug(`${name}: ${JSON.stringify(parentFeatureCodes)} ${mean.value*1e6} persons/km²`)
            return Promise.resolve(revisedMean)
          }
          return withFeatures(args.meshBlockType as MeshBlockType, op, new WeightedMean(0, 0))
        })
        .then((v: WeightedMean) => console.log(`Average population density of ${v.value*1e6} persons/km²`))
        .catch(debug)
    }
  })
  .demandCommand(1, 'No command specified.')
  .completion()
  .help()
  .argv
