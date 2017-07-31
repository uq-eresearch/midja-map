import * as R from 'ramda'
import axios from 'axios'
import extractZip from 'extract-zip'
import * as fs from 'fs-extra'
import * as gdal from 'gdal'
import * as http from 'http'
import { createGzip as createCompressor } from 'zlib'
import { spawn } from 'child_process'
import moment from 'moment'
import * as osmosis from 'osmosis'
import * as path from 'path'
import * as yargs from 'yargs'
import * as url from 'url'
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
    command: 'get-features <regionType>',
    describe: 'download features for region type',
    builder: (yargs: yargs.Argv) =>
      yargs
        .choices('regionType', ['mb2011', 'mb2016']),
    handler: (args: { regionType: string }) => {
      const urls: { [regionType: string]: string } = {
        'mb2011': 'http://www.abs.gov.au/AUSSTATS/abs@.nsf/DetailsPage/1270.0.55.001July%202011?OpenDocument',
        'mb2016': 'http://www.abs.gov.au/AUSSTATS/abs@.nsf/DetailsPage/1270.0.55.001July%202016?OpenDocument'
      }

      const fetchLinks = (downloadPageUrl: string) => new Promise((resolve, reject) => {
        var links: { name: string, link: string }[] = []
        osmosis
          .get(downloadPageUrl)
          .find('.listentry')
          .set({
            'name': 'td:first/text()',
            'link': 'td a @href'
          })
          .data((data: {[k: string]: string}) => {
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

      interface FileLink {
        name: string,
        link: string
      }
      function ensureLinksDownloaded(links: FileLink[]): Promise<string[]> {
        return Promise.all<string>(
          links.map<Promise<string>>((linkObj) => {
            return axios.head(
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
                const filepath = path.resolve(
                  tmpDataDir,
                  'features',
                  'shapefiles',
                  args.regionType,
                  filename
                )
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
          })
        )
      }

      function withZip<T>(
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

      fetchLinks(urls[args.regionType])
        .then(ensureLinksDownloaded)
        .then((filepaths: string[]) => {
          return Promise.all(
            filepaths.map(filepath => {
              return withZip(filepath, dirpath => {
                return fs.readdir(dirpath)
                  .then(R.filter(R.test(/.shp$/)))
                  .then(R.map(file => path.resolve(dirpath, file)))
                  .then(shapefiles => {
                    return Promise.all(
                      shapefiles.map(shapefile => {
                        const dataset = gdal.open(shapefile)
                        try {
                          return R.chain(
                            (layer: any) => {
                              return layer.features.map((feature: any) => {
                                return feature.fields.toObject()
                              })
                            },
                            dataset.layers)
                        } finally {
                          dataset.close()
                        }
                      })
                    )
                  })
              })
            })
          )
        })
        .then(R.flatten)
        .then(v => console.log(v))
        .catch(debug)
    }
  })
  .demandCommand(1, 'No command specified.')
  .completion()
  .help()
  .argv
