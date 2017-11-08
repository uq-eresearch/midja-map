import axios from 'axios'
import http from 'http'
import fs from 'fs-extra'
import path from 'path'
import R from 'ramda'
import XLSX from 'xlsx'
import { writeAttributesAndData } from '../lib/attribute/import'

const debug = require('debug')('phidu-shaa-processor')

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 16
})

const spreadsheetUrl = "http://www.phidu.torrens.edu.au" +
  "/current/data/sha-aust/pha/phidu_data_pha_aust.xls"

const tmpDataDir = path.relative('.',
  path.resolve(__dirname, '..', 'tmp', 'data'))

function download(filepath: string): Promise<void> {
  debug(`Downloading spreadsheet to ${filepath}`)
  return fs.mkdirs(path.dirname(filepath))
    .then(() =>
      axios(
        {
          method: 'get',
          url: spreadsheetUrl,
          httpAgent: httpAgent,
          responseType: 'stream'
        }
      )
    )
    .then((response: {data: NodeJS.ReadableStream}) => {
      response.data.pipe(fs.createWriteStream(filepath))
    })
}

function ensureSpreadsheetDownloaded(): Promise<string> {
  const filepath = path.resolve(tmpDataDir, 'phidu_data_pha_aust.xls')
  return fs.access(filepath)
    .then(() => debug(`Already have ${filepath}`))
    .catch(() => download(filepath))
    .then(() => filepath)
}

type PHAtoSA2Lookup = {[pha: string]: string[]}
function computePHAtoSA2Lookup(phaLookupSheet: XLSX.Sheet): PHAtoSA2Lookup {
  const lastRow: number = parseInt(
    R.match(/(\d+)$/, phaLookupSheet['!ref'])[0]
  )
  return R.pipe(
    R.map(
      (row: number) => R.map(
        (col: string) => phaLookupSheet[`${col}${row}`],
        ['C', 'A']
      )
    ),
    R.filter(R.all(R.is(Object))), // Two defined cells
    R.map(R.map(R.prop('w'))), // Get computed value
    R.filter(R.all(R.test(/^[\d\s,]+$/))), // Two defined cells
    R.fromPairs,
    R.mapObjIndexed(R.match(/\d+/g))
  )(R.range(6, lastRow))
}

function extractAttributeAndDataFromSheet(
    sheet: XLSX.Sheet,
    lookup: PHAtoSA2Lookup): [Attribute, AttributeData][] {
  const titleRow = 0
  const subtitleRow = 3
  const valueHeaderRow = 4
  const valueColOffset = 1
  const codeCol = 0
  const nCols = XLSX.utils.decode_range(sheet['!ref']).e.c + 1
  const nRows = XLSX.utils.decode_range(sheet['!ref']).e.r + 1
  function getCell(c: number, r: number) {
    return sheet[XLSX.utils.encode_cell({ c, r })]
  }

  return R.pipe(
    R.map((c: number) => {
      return {
        c,
        cell: getCell(c, titleRow)
      }
    }),
    R.filter(R.pipe(R.prop('cell'), R.is(Object))),
    R.map((obj: { c: number, cell: { w: string } }) => {
      const title = obj.cell.w
        .replace(/^\W+/, '')
        .replace(/,/g, ' -')
      const subtitle = getCell(obj.c, subtitleRow).w
        .replace(/[–\/](\d+)/, ' to 20$1')
      const valueHeader = getCell(
        obj.c + valueColOffset,
        valueHeaderRow
      ).w.replace(/,/g, '')
      const description = `${title} - ${subtitle} - ${valueHeader}`
      const values = R.chain(
        (r: number) => {
          const codeCell = getCell(codeCol, r)
          const valueCell = getCell(obj.c + valueColOffset, r)
          const pair = R.map(
            (obj: any) => obj && obj.w.replace(',', ''),
            [codeCell, valueCell]
          )
          if (R.all(R.test(/^\d[\d\.]*$/), pair)) {
            const value = parseFloat(pair[1])
            const sa2Codes = lookup[pair[0]]
            return R.reduce(
              R.merge,
              {},
              R.map(
                (code: string) => R.objOf(code, value),
                sa2Codes || []
              )
            )
          } else {
            return []
          }
        },
        R.range(valueHeaderRow + 1, nRows)
      )
      const name = description.toLowerCase()
        .replace(/[-()]/g, '')
        .replace(/\s+/g, '_')

      return [
        {
          name,
          description,
          type: 'number',
          category: 'health',
          source: {
            "name": "PHIDU Social Health Atlas of Australia",
            "license": {
              "type": "Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Australia",
              "url": "http://creativecommons.org/licenses/by-nc-sa/3.0/au/"
            },
            "url": spreadsheetUrl
          }
        },
        R.reduce(R.merge, {}, values)
      ] as [Attribute, AttributeData]
    })
  )(R.range(2, nCols))
}

ensureSpreadsheetDownloaded()
  .then((filename: string) => {
    const wb = XLSX.readFile(filename)
    const lookup = computePHAtoSA2Lookup(wb.Sheets['PHAs'])
    return R.chain(
      (sheetName: string) => {
        return extractAttributeAndDataFromSheet(
          wb.Sheets[sheetName],
          lookup
        )
      },
      [
        'Estimates_chronic_disease',
        'Median_age_death',
        'Premature_mortality_by_cause',
        'Admiss_principal_diag_persons'
      ]
    ) as [Attribute, AttributeData][]
  })
  .then((attributesAndData: [Attribute, AttributeData][]) => {
    return writeAttributesAndData(
      'public',
      'sa2_2011',
      attributesAndData
    )
  })
  .catch(debug)
