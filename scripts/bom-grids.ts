import * as R from 'ramda'
import axios from 'axios'
import * as fs from 'fs-extra'
import * as http from 'http'
import { createGzip as createCompressor } from 'zlib'
import { spawn } from 'child_process'
import moment from 'moment'
import * as path from 'path'
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

const url = (statistic: string, date: moment.Moment) => {
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
        url(statistic, date),
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
  .demandCommand(1, 'No command specified.')
  .completion()
  .help()
  .argv
