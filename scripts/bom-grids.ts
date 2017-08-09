import * as R from 'ramda'
import axios from 'axios'
import { csvTextParser, writeAttributesAndData } from '../lib/attribute/import'
import { fromPromiseMap, WeightedMean } from '../lib/util'
import { autoserialize, autoserializeAs, Serialize, Deserialize } from 'cerialize'
import * as cp from 'child_process'
import extractZip from 'extract-zip'
import * as fs from 'fs-extra'
import * as gdal from 'gdal'
import * as http from 'http'
import { createGzip, createGunzip, gzip } from 'zlib'
import { spawn } from 'child_process'
import moment from 'moment'
import { cpus } from 'os'
import * as osmosis from 'osmosis'
import * as path from 'path'
import * as png from 'png-async'
import PQueue from 'p-queue'
import * as turfMeta from '@turf/meta'
import turf from '@turf/turf'
import * as url from 'url'
import * as yargs from 'yargs'
const tmpDataDir = path.relative('.',
  path.resolve(__dirname, '..', 'tmp', 'data'))

const isChild = !!process.send

const canvasQueue = new PQueue({
  concurrency: Math.min(cpus().length, 4)
})

const distributionQueue = new PQueue({
  concurrency: Math.min(cpus().length, 4)
})

const debug = require('debug')('bom-grids')

function debugT<T>(msg: string): (v: T) => T {
  return (v: T) => { debug(msg); return v }
}

function gzipP(buf: Buffer, opt: {[k: string]: any} = {}): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    gzip(buf, opt, (err, cbuf) => {
      if (err) reject(err)
      else resolve(cbuf)
    })
  })
}

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 16
})

const urlResolver = (cat: String) => (ds: String) => {
  return `http://www.bom.gov.au/web03/ncc/www/awap/${cat}/daily/grid/0.05/history/nat/${ds}${ds}.grid.Z`
}

const urlResolvers: { [stat: string]: (datestamp: string) => string } = {
  'max_temp': urlResolver('temperature/maxave'),
  'min_temp': urlResolver('temperature/minave'),
  'rainfall': urlResolver('rainfall/totals')
}

const statisticFractionDigits: (stat: string) => number = R.flip(R.prop)({
  'max_temp': 2,
  'min_temp': 2,
  'rainfall': 1
})

const statisticDescription: (stat: string) => string = R.flip(R.prop)({
  'max_temp': 'maximum temperature',
  'min_temp': 'minimum temperature',
  'rainfall': 'rainfall'
})

const statisticUnit: (stat: string) => string = R.flip(R.prop)({
  'max_temp': '°C',
  'min_temp': '°C',
  'rainfall': 'mm'
})

const statisticUrl = (statistic: string, date: moment.Moment) => {
  return urlResolvers[statistic](date.format('YYYYMMDD'))
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
          .pipe(createGzip())
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

function ensureGridDownloaded(
    statistic: string,
    date: moment.Moment): Promise<string> {
  const datestamp = date.format('YYYY-MM-DD')
  const filepath =
    path.resolve(tmpDataDir, statistic, `${datestamp}.grid.gz`)
  return fs.access(filepath)
    .then(() => debug(`Already have ${filepath}`))
    .catch(() => download(statistic, date, filepath))
    .then(() => filepath)
}

type MeshBlockType = "mb2011" | "mb2016"
type RegionType = "sa2_2011" | "sa3_2011" | "sa2_2016" | "sa3_2016"
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
          .then(debugT(`Already have ${filepath}`))
          .catch(download)
          .then<string>(() => filepath)
          .catch((e: Error) => {
            debug(e)
            throw e
          })
      })
}

function withDataset<T>(file: string, f: (d: gdal.Dataset) => T): T {
  const dataset = gdal.open(file)
  try {
    return f(dataset)
  } finally {
    dataset.close()
  }
}

function withFeatures<T>(
    meshBlockType: MeshBlockType,
    reduceF: (accumulator: T, feature: gdal.Feature) => T | Promise<T>,
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
    const suffix = '_'+Math.random().toString().slice(2)
    const extractionPath = path.resolve(
      path.dirname(zipfilePath),
      path.basename(zipfilePath, '.zip') + suffix)
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

const sourceMeshBlockType: (regionType: RegionType) => MeshBlockType =
  R.flip(R.prop)({
    'sa2_2011': 'mb2011',
    'sa3_2011': 'mb2011',
    'sa2_2016': 'mb2016',
    'sa3_2016': 'mb2016'
  })

const fieldToRegionType: (fieldName: string) => RegionType =
  R.flip(R.prop)({
    'SA2_MAIN11': 'sa2_2011',
    'SA3_CODE11': 'sa3_2011',
    'SA2_MAIN16': 'sa2_2016',
    'SA3_CODE16': 'sa3_2016'
  })

type BoundingBox = [number, number, number, number]
type Pixel = [number, number]
type Weighting = number
interface WeightAllocation {
  readonly weight: Weighting
}
class PixelWeight implements WeightAllocation {
  readonly pixel: Pixel
  readonly weight: Weighting
  constructor(pixel: Pixel, weight: Weighting) {
    this.pixel = pixel
    this.weight = weight
  }
  scale(n: number): PixelWeight {
    return new PixelWeight(this.pixel, this.weight * n)
  }
}
class FeatureWeight implements WeightAllocation {
  readonly featureName: string
  readonly weight: Weighting
  constructor(featureName: string, weight: Weighting) {
    this.featureName = featureName
    this.weight = weight
  }
}
class PixelCanvas {
  private readonly topLeftX: number // longitude
  private readonly topLeftY: number // latitude
  private readonly wePixelResolution: number // degrees longitude
  private readonly nsPixelResolution: number // degrees latitude (negative)
  readonly width: number  // in pixels
  readonly height: number // in pixels

  constructor(geoTransform: gdal.GeoTransform, size: { x: number, y: number }) {
    this.topLeftX = geoTransform[0]
    this.topLeftY = geoTransform[3]
    this.wePixelResolution = geoTransform[1]
    this.nsPixelResolution = geoTransform[5]
    this.width = size.x
    this.height = size.y
  }

  pixelToBoundingBox(pixel: Pixel): BoundingBox {
    const wLong = pixel[0] * this.wePixelResolution + this.topLeftX
    const nLat = pixel[1] * this.nsPixelResolution + this.topLeftY
    const eLong = wLong + this.wePixelResolution
    const sLat = nLat + this.nsPixelResolution
    return [wLong, sLat, eLong, nLat]
  }

  gridForPolygon(geometry: turfMeta.Polygon): Pixel[] {
    const bbox = turf.bbox(turf.feature(geometry))
    const minPixelX = Math.floor((bbox[0]-this.topLeftX)/this.wePixelResolution)
    const minPixelY = Math.floor((bbox[3]-this.topLeftY)/this.nsPixelResolution)
    const maxPixelX = Math.floor((bbox[2]-this.topLeftX)/this.wePixelResolution)
    const maxPixelY = Math.floor((bbox[1]-this.topLeftY)/this.nsPixelResolution)
    return R.xprod(
      R.range(Math.max(0, minPixelX), Math.min(this.width, maxPixelX + 1)),
      R.range(Math.max(0, minPixelY), Math.min(this.height, maxPixelY + 1))
    )
  }

}

/**
 * @param {gdal.GeoTransform} geoTransform - GDAL GeoTransform for raster
 * @param {Polygon} geometry - layer polygon to map to raster
 */
function pixelWeights(pixelCanvas: PixelCanvas, geometry: turfMeta.Polygon): PixelWeight[] {
  function computeIntersection(geometry: turfMeta.Polygon, pixel: Pixel) {
    try {
      return turf.bboxClip(geometry, pixelCanvas.pixelToBoundingBox(pixel))
    } catch (e) {
      return null
    }
  }
  const geometryArea = turf.area(turf.feature(geometry))
  const grid = pixelCanvas.gridForPolygon(geometry)

  if (grid.length == 1) {
    // No point calculating intersection - feature exists in single feature
    return [ new PixelWeight(grid[0], 1.0) ]
  } else {
    return grid
      .map<PixelWeight>((pixel: Pixel) => {
        const intersection = computeIntersection(geometry, pixel)
        return new PixelWeight(
          pixel,
          (
            intersection ?
            turf.area(intersection) / geometryArea :
            0
          )
        )
      })
      .filter((pw: PixelWeight) => pw.weight > 0)
  }
}


type FeatureValueMap = {[feature: string]: number}
type FWMM = {[f: string]: WeightedMean}
class PixelValueDistributor {

  @autoserialize private readonly store: FeatureWeight[][][]

  constructor(store: FeatureWeight[][][] = []) {
    this.store = store
  }

  add(featureName: string, pixelWeights: PixelWeight[]): PixelValueDistributor {
    return new PixelValueDistributor(R.reduce(
      (store: FeatureWeight[][][], pixelWeight: PixelWeight) => {
        return R.over(
          R.lensPath(pixelWeight.pixel),
          R.append(new FeatureWeight(featureName, pixelWeight.weight)),
          store
        )
      },
      this.store,
      pixelWeights
    ))
  }

  /**
   * @return compacted PixelValueDistributor with merged feature weights
   */
  compact(): PixelValueDistributor {
    const newStore: FeatureWeight[][][] = []
    for (let x = 0; x < this.store.length; x++) {
      if (!this.store[x]) continue;
      newStore[x] = []
      for (let y = 0; y < this.store[x].length; y++) {
        if (!this.store[x][y]) continue;
        newStore[x][y] = R.pipe(
          R.groupBy((fw: FeatureWeight) => fw.featureName),
          R.values,
          R.map((fws: FeatureWeight[]) => {
            if (fws.length < 2) {
              return fws[0]
            } else {
              return new FeatureWeight(
                fws[0].featureName,
                R.sum(R.pluck('weight', fws))
              )
            }
          })
        )(this.store[x][y])
      }
    }
    return new PixelValueDistributor(newStore)
  }

  distribute(valueGetter: (p: Pixel) => number): FeatureValueMap {
    const output: FWMM = {}
    for (let x = 0; x < this.store.length; x++) {
      if (!this.store[x]) continue;
      for (let y = 0; y < this.store[x].length; y++) {
        if (!this.store[x][y]) continue;
        const pixelValue = valueGetter([x, y])
        for (let fw of this.store[x][y]) {
          const wm = new WeightedMean(pixelValue, fw.weight)
          output[fw.featureName] =
            output[fw.featureName] ?
            output[fw.featureName].add(wm) :
            wm
        }
      }
    }
    return R.mapObjIndexed((wm: WeightedMean) => wm.value, output)
  }

  toJson(): string {
    return Serialize(this)
  }

}
type PVDMap = {[regionType: string]: PixelValueDistributor}

function gunzipToTemp(gzippedFile: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const suffix = '.'+Math.random().toString().slice(2)
    const outputFile = path.resolve(
      path.dirname(gzippedFile),
      path.basename(gzippedFile, '.gz') + suffix
    )
    if (gzippedFile == outputFile) {
      throw Error("File not .gz: "+gzippedFile)
    }
    const reader = fs.createReadStream(gzippedFile)
    const writer = fs.createWriteStream(outputFile)

    writer.on('finish', () => {
      resolve(outputFile)
    })
    writer.on('error', (error: Error) => {
      reject(error)
    })
    // Start write process
    reader.pipe(createGunzip()).pipe(writer)
  })
}

function withGridfile<T>(
    statistic: string,
    date: moment.Moment,
    f: (extractedGridfile: string) => T|Promise<T>): Promise<T> {
  return ensureGridDownloaded(statistic, date)
    .then((gzippedGridfile: string) =>
      withExtractedFile(gzippedGridfile,f)
    )
}

function withExtractedFile<T>(
    gzippedFile: string,
    f: (extractedFile: string) => T|Promise<T>): Promise<T> {
  function removeExtractedGridfile(extractedFile: string) {
    return fs.unlink(extractedFile)
  }
  return gunzipToTemp(gzippedFile)
    .then<T>((extractedFile: string) => {
      const cleanup = () => removeExtractedGridfile(extractedFile)
      return Promise.resolve(extractedFile)
        .then<T>(f)
        .then(R.tap<T>(cleanup))
        .catch((e: Error) => { cleanup(); throw e })
    })
}

function getPixelCanvas(statistic: string, date: moment.Moment) {
  return canvasQueue.add(() =>
    withGridfile(
      statistic,
      date,
      (gridfile: string) =>
        withDataset(
          gridfile,
          (dataset: gdal.Dataset) => new PixelCanvas(
            dataset.geoTransform,
            dataset.bands.get(1).size
          )
        )
    )
  )
}

function regionFields(fieldNames: string[]): string[] {
  return fieldNames.filter(
    R.pipe(fieldToRegionType, R.is(String))
  )
}

function generateDistributors(
    meshBlockType: MeshBlockType,
    pixelCanvas: PixelCanvas): Promise<{[regionType: string]: PixelValueDistributor}> {
  return fetchCensusCounts(meshBlockType)
    .then((getCensusCount) => {
      const op = (pvds: PVDMap, feature: gdal.Feature) => {
        const name = feature.fields.get(0)
        const censusCount = getCensusCount(name)
        if (feature.getGeometry() && censusCount > 0) {
          const geometry = feature.getGeometry().toObject()
          const pws = R.map(
            (pw: PixelWeight) => pw.scale(censusCount),
            pixelWeights(pixelCanvas, geometry)
          )
          return R.reduce(
            (pvds: PVDMap, field: string) => {
              return R.over(
                R.lensProp(fieldToRegionType(field)),
                (pvd: PixelValueDistributor|undefined) =>
                  (pvd || new PixelValueDistributor())
                    .add(feature.fields.get(field), pws),
                pvds
              )
            },
            pvds,
            regionFields(feature.fields.getNames())
          )
        } else {
          return pvds
        }
      }
      return withFeatures(meshBlockType, op, {} as PVDMap)
        .then(R.mapObjIndexed(
          (pvd: PixelValueDistributor) => pvd.compact()
        ))
    })
}

function sharedDistributorGenerator(meshBlockType: MeshBlockType) {
  return R.memoize(R.curry(generateDistributors)(meshBlockType))
}

function distributeGridfile(
    statistic: string,
    date: moment.Moment,
    pvd: PixelValueDistributor): Promise<FeatureValueMap> {
  return distributionQueue.add(() => {
    return withGridfile(
      statistic,
      date,
      (gridfile: string) =>
        runInChild(
          Serialize(
            new ChildRequests.DistributeGridfile(gridfile, pvd)
          )
        )
    )
  })
}

function intermediateOutputFilepath(
  statistic: string,
  date: moment.Moment,
  regionType: RegionType): string {
const datestamp = date.format('YYYY-MM-DD')
return path.resolve(
  tmpDataDir, 'intermediate', regionType,
  statistic, `${datestamp}.json.gz`)
}

type FeatureValueMapRetriever = () => Promise<FeatureValueMap>
function getExistingIntermediateOutput(
    statistic: string,
    date: moment.Moment,
    regionType: RegionType): Promise<FeatureValueMapRetriever> {
  const filepath = intermediateOutputFilepath(statistic, date, regionType)
  function readData(): Promise<FeatureValueMap> {
    return withExtractedFile<Promise<FeatureValueMap>>(
      filepath,
      (f) => fs.readJSON(f)).then(R.identity)
  }
  return fs.access(filepath)
    .then(() => debug(`Already have ${filepath}`))
    .then(() => readData)
}

function buildIntermediateOutputs(
    statistic: string,
    date: moment.Moment,
    pvds: PVDMap): Promise<{[regionType: string]: string}> {

  function jsonSerializer(statistic: string): (x: any) => string {
    const n = statisticFractionDigits(statistic)
    return (x: string) => {
      return JSON.stringify(x, function(_k, v) {
        return v.toFixed ? Number(v.toFixed(n)) : v
      }, 2)
    }
  }

  function intermediateFileWriter(
      statistic: string,
      date: moment.Moment,
      regionType: RegionType): (fvm: FeatureValueMap) => Promise<string> {
    const toJson = jsonSerializer(statistic)
    return (obj: FeatureValueMap) => {
      const outfile = intermediateOutputFilepath(
        statistic,
        date,
        regionType
      )
      return fs.mkdirs(path.dirname(outfile))
        .then(() => {
          return gzipP(Buffer.from(toJson(obj), 'utf8'))
            .then((data) => fs.writeFile(outfile, data))
            .then(() => outfile)
        })
    }
  }
  function msgF(msg: string): string {
    return `${date.format('YYYY-MM-DD')} ${statistic}: ${msg}`
  }
  return fromPromiseMap(
    R.mapObjIndexed(
      (pvd: PixelValueDistributor, regionType: RegionType) => {
        debug(msgF(`Distributing for ${regionType}`))
        return distributeGridfile(statistic, date, pvd)
          .then(
            intermediateFileWriter(
              statistic,
              date,
              regionType
            )
          )
          .then(R.tap((outfile: string) => {
            return debug(msgF(
              `Wrote ${regionType} JSON to ${outfile}`))
          }))
      },
      pvds
    )
  )
}

function getIntermediateOutputs(
    regionType: RegionType,
    statistic: string,
    dates: moment.Moment[]): Promise<FeatureValueMapRetriever[]> {
  const meshBlockType: MeshBlockType =
    sourceMeshBlockType(regionType)
  const fGenerateDistributors =
    sharedDistributorGenerator(meshBlockType)
  return Promise.all(R.map(
    (date: moment.Moment) => {
      const fGetExisting = () =>
        getExistingIntermediateOutput(
          statistic,
          date,
          regionType
        )
      return fGetExisting()
        .catch(() =>
          getPixelCanvas(statistic, date)
            .then(fGenerateDistributors)
            .then((pvds: PVDMap) =>
              buildIntermediateOutputs(statistic, date, pvds)
            )
            .then(fGetExisting)
        )
    },
    dates
  ))
}


namespace ChildRequests {
  export interface Request<T> {
    readonly requestType: string
    do(): T
  }

  export class DistributeGridfile implements Request<FeatureValueMap> {
    @autoserialize readonly requestType = "DistributeGridfile"
    @autoserialize private readonly gridfile: string
    @autoserializeAs(PixelValueDistributor) private readonly pvd: PixelValueDistributor

    constructor(gridfile: string, pvd: PixelValueDistributor) {
      this.gridfile = gridfile
      this.pvd = pvd
    }
    do(): FeatureValueMap {
      const pixelGetter =
        withDataset(this.gridfile, (dataset: gdal.Dataset) => {
          const band = dataset.bands.get(1)
          const size = band.size
          const pixels = band.pixels.read(0, 0, size.x, size.y)
          return (pixel: Pixel) => pixels[(pixel[1]*size.x) + pixel[0]]
        })
      return this.pvd.distribute(pixelGetter)
    }
  }
}

function runInChild<T>(req: ChildRequests.Request<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let responseReceived = false
    const child = cp.fork('tmp/bom-grids.js', [], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    })
    child.on('message', (response: T) => {
      responseReceived = true
      resolve(response)
      child.kill()
    })
    child.on('exit', (code: number) => {
      if (!responseReceived) {
        reject(`Child unexpectedly exited: ${code}`)
      }
    })
    child.send(req)
  })
}

if (isChild) {
  process.on('message', (message: any) => {
    if (message.requestType) {
      if (message.requestType == 'DistributeGridfile') {
        process.send(
          Deserialize(message, ChildRequests.DistributeGridfile).do()
        )
      }
    } else {
      console.log(message)
      process.disconnect()
    }
  })
  function checkIfDisconnected(timeout: number) {
    if (process.connected) {
      setTimeout(checkIfDisconnected, timeout)
    }
  }
  checkIfDisconnected(100)
} else {
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
          ensureGridDownloaded(args.statistic, date)
            .catch((e: Error) => {
              debug(e)
            })
        }
      }
    })
    .command({
      command: 'get-features <meshBlockType>',
      describe: 'download features for mesh block type',
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
            return withFeatures(args.meshBlockType, op, new WeightedMean(0, 0))
          })
          .then((v: WeightedMean) => console.log(`Average population density of ${v.value*1e6} persons/km²`))
          .catch(debug)
      }
    })
    .command({
      command: 'compute-intermediate <regionType> <statistic> <startDate> [days]',
      describe: 'compute intermediate stats for region type',
      builder: (yargs: yargs.Argv) =>
        yargs
          .choices('regionType', ["sa2_2011", "sa3_2011", "sa2_2016", "sa3_2016"])
          .choices('statistic', R.keys(urlResolvers))
          .coerce('startDate', (d) => moment(d))
          .default('days', 1),
      handler: (args: { regionType: RegionType, statistic: string, startDate: moment.Moment, days: number }) => {
        const dates: moment.Moment[] =
          R.map(
            (nDays) => args.startDate.clone().add(nDays, 'day'),
            R.range(0, args.days)
          )
        return getIntermediateOutputs(args.regionType, args.statistic, dates)
          .then((outputs: any[]) => {
            debug(
              `Got ${outputs.length} ${args.regionType} ${args.statistic}`+
              ' intermediate outputs'
            )
          })
          .catch(debug)
      }
    })
    .command({
      command: 'days-over <regionType> <statistic> <value> <startYear> <endYear>',
      describe: 'add/update attribute: days over value for region type',
      builder: (yargs: yargs.Argv) =>
        yargs
          .choices('regionType', ["sa2_2011", "sa3_2011", "sa2_2016", "sa3_2016"])
          .choices('statistic', R.keys(urlResolvers))
          .string('startYear')
          .string('endYear')
          .default('days', 1),
      handler: (args: { regionType: RegionType, statistic: string, startYear: string, endYear: string, value: number }) => {
        const startDate = moment(args.startYear, 'YYYY')
        const days =
          moment(args.endYear, 'YYYY')
            .add(1, 'year')
            .diff(startDate, 'days')
        const dates =
          R.map(
            (nDays) => startDate.clone().add(nDays, 'day'),
            R.range(0, days)
          )

        const attribute = {
          "name": `bom_days_over_${args.value}_${args.statistic}_${args.startYear}_${args.endYear}`,
          "description": `Days with ${statisticDescription(args.statistic)} over ${args.value}${statisticUnit(args.statistic)} from ${args.startYear} to ${args.endYear}`,
          "type": "number",
          "format": {
            "maximumFractionDigits": 0
          },
          "source": {
            "name": "Australian Bureau of Meteorology",
            "license": {
              "type": "Creative Commons Attribution 3.0 Australia",
              "url": "https://creativecommons.org/licenses/by/3.0/au/"
            },
            "notes": `Derived from ${dates.length} ABS grid files:\n` +
              [R.head(dates), R.last(dates)]
                .map(d => statisticUrl(args.statistic, d))
                .join("\n...\n")
          }
        };

        return getIntermediateOutputs(args.regionType, args.statistic, dates)
          .then((outputs: FeatureValueMapRetriever[]) => {
            return R.reduce(
              (pCountFvm: Promise<FeatureValueMap>, retriever: FeatureValueMapRetriever) =>
                pCountFvm.then((countFvm: FeatureValueMap) => {
                  return retriever()
                    .then(R.mapObjIndexed(v => v >= args.value ? 1 : 0))
                    .then(R.mergeWith(R.add, countFvm))
                }),
              Promise.resolve<FeatureValueMap>({}),
              outputs)
          })
          .then(attributeData =>
            writeAttributesAndData(
              'public',
              args.regionType,
              [[attribute, attributeData]])
          )
          .catch(debug)
      }
    })
    .command({
      command: 'region-series <regionType> <region> <statistic> <startDate> [days]',
      describe: 'get data series for particular region',
      builder: (yargs: yargs.Argv) =>
        yargs
          .choices('regionType', ["sa2_2011", "sa3_2011", "sa2_2016", "sa3_2016"])
          .choices('statistic', R.keys(urlResolvers))
          .option('json', {
            describe: 'output as JSON',
            type: 'boolean'
          })
          .coerce('startDate', (d) => moment(d))
          .default('days', 1),
      handler: (args: { regionType: RegionType, region: string, statistic: string, startDate: moment.Moment, days: number, json: boolean }) => {
        const dates: moment.Moment[] =
          R.map(
            (nDays) => args.startDate.clone().add(nDays, 'day'),
            R.range(0, args.days)
          )
        return getIntermediateOutputs(args.regionType, args.statistic, dates)
          .then((outputs: FeatureValueMapRetriever[]) => {
            return Promise.all(
              R.map(
                (retriever: FeatureValueMapRetriever) => {
                  return retriever().then(fvm => fvm[args.region])
                },
                outputs
              )
            )
          })
          .then(v => {
            if (args.json) {
              console.log(JSON.stringify(v, null, 2))
            } else {
              console.log(v.join("\n"))
            }
          })
          .catch(debug)
      }
    })
    .command({
      command: 'density-png <meshBlockType> <statistic> <date> <outfile>',
      describe: 'map mesh block density as an equirectangular projection',
      builder: (yargs: yargs.Argv) =>
        yargs
          .choices('meshBlockType', ['mb2011', 'mb2016'])
          .choices('statistic', R.keys(urlResolvers))
          .coerce('date', (d) => moment(d)),
      handler: (args: { meshBlockType: MeshBlockType, statistic: string, date: moment.Moment, outfile: string }) => {
        getPixelCanvas(args.statistic, args.date)
          .then((pixelCanvas: PixelCanvas) => {
            const image = png.createImage({
              width: pixelCanvas.width,
              height: pixelCanvas.height
            })
            image.data.fill(0x00)
            function pixelToBufferOffset(pixel: Pixel): number {
              return (image.width * pixel[1] + pixel[0]) << 2
            }
            const op = (__: void, feature: gdal.Feature) => {
              if (feature.getGeometry()) {
                const geometry = feature.getGeometry().toObject()
                for (let pw of pixelWeights(pixelCanvas, geometry)) {
                  const offset = pixelToBufferOffset(pw.pixel)
                  image.data.writeUInt8(
                    Math.min(0xFF, image.data.readUInt8(offset) + 10),
                    offset)
                  image.data.writeUInt8(0xFF, offset+3)
                }
              }
            }
            debug(`Building image data based on gridfile geometry`)
            return withFeatures(args.meshBlockType, op, null)
              .then(() => {
                debug(`Writing density PNG to ${args.outfile}`)
                return image.pack().pipe(fs.createWriteStream(args.outfile))
              })
          })
          .then(R.tap(() => debug("Finished writing PNG")))
          .catch(debug)
      }
    })
    .demandCommand(1, 'No command specified.')
    .completion()
    .help()
    .argv
}
