import R from 'ramda'
import XLSX, * as xlsx from 'xlsx'
import * as fs from 'fs-extra'
import { writeAttributesAndData } from '../lib/attribute/import'
import { tupled2 } from '../lib/util'

const stateNames = R.values(require('../data/public/state/region_name.json'))
const sa2RegionMap: {[code: string]: string} =
  require('../data/public/sa2_2016/region_name.json')
const sa3RegionMap: {[code: string]: string} =
  require('../data/public/sa3_2016/region_name.json')

const sa2ReportFilename = process.argv[2]

function bufferToSpreadsheet(buffer: Buffer) {
  return XLSX.read(buffer, { type: "buffer"})
}

function atIndexOrEarlier<T>(arr: T[], i: number): T {
  return i > 0 ?
    arr[i] || atIndexOrEarlier(arr, i-1) :
    arr[i]
}

function convertFiveDigitSA2(sa2Codes: string[]): (s: string) => string|null {
  return (s: string) =>
    R.find(
      R.allPass([
        (sa2: string) => R.slice(5, Infinity, sa2) == R.slice(1, 5, s+""),
        R.startsWith(R.slice(0, 1, s+""))
      ]),
      sa2Codes
    )
}

const convertFiveDigitSA2Cached = R.memoize(
  convertFiveDigitSA2(R.keys(sa2RegionMap))
)

function attributeFromDescription(desc: string): Attribute {
  const attributeName =
    R.pipe(
      R.toLower,
      R.replace('2009-2015', ''),
      R.replace(/\W+/g, ' '),
      R.trim,
      R.replace(/ /g, '_')
    )(desc)
  return {
    'name': attributeName,
    'description': R.replace(' 2009-2015', '')(desc),
    'type': 'number',
    'category': 'education',
    'format': {
      'style': "percent"
    },
    'source': {
      'name': 'Australian Early Development Census',
      'url': 'https://www.aedc.gov.au/resources/detail/'+
        'public-table-by-statistical-area-level-2-(sa2)-2009-2015'
    }
  }
}

function filterTableRows(table: any[][]) {
  return R.pipe(
    R.filter(
      R.pipe(
        (row: any[]) => row[0] as string,
        R.test(/^\d+$/)
      )
    ),
    R.reject<any[]>((row: any[]) => {
      return sa3RegionMap[row[0] as string] == row[1]
    }),
    R.map(
      R.over(
        R.lensIndex(0),
        convertFiveDigitSA2Cached
      )
    ),
    R.filter((row: any[]) => !!row[0])
  )(table)
}

function combineHeaders(header1: string[], header2: string[]) {
  return R.zipWith(
    (a: string, b: string) => {
      return a == b ? a : `${a} (${b})`
    },
    R.times(
      (i: number) => atIndexOrEarlier(header1, i),
      header2.length),
    header2
  )
}

function processSheet(sheet: xlsx.WorkSheet): [Attribute, AttributeData][] {
  const sheetJson: any[][] = XLSX.utils.sheet_to_json(
    sheet,
    {
      header: 1,
      raw: true
    }
  )
  const sheetHeader =
    R.dropWhile(
      (row: any[]) => !row[0],
      sheetJson
    )[0][0]
  const headerRows =
    R.dropWhile<any[]>(
      R.pipe<any[], any, boolean>(
        R.head,
        R.complement(
          R.equals(sheetHeader)
        )
      ),
      sheetJson
    ).slice(1,3)

  const tables =
    R.addIndex(R.chain)(
      (row: any[], index: number, rows: any[][]) => {
        if (R.contains(row[0], stateNames)) {
          return [
            R.takeWhile(
              R.complement(
                R.isEmpty
              ),
              R.slice(index, Infinity, rows)
            )
          ]
        } else {
          return []
        }
      },
      sheetJson
    )
  const columnNames =
    combineHeaders(headerRows[0], headerRows[1])
  const rows =
    R.chain<any[], any>(
      filterTableRows,
      tables)
  function attributeForColumnName(
      columnName: string,
      index: number): [Attribute, AttributeData] {
    const attribute: Attribute =
      attributeFromDescription(`${sheetHeader} - ${columnName}`)
    const attributeData: NumericAttributeData =
      R.pickBy(
        isFinite,
        R.zipObj(
          R.pluck(0, rows),
          R.map(
            R.multiply(1/100),
            R.pluck(index, rows)
          )
        )
      )
    return [attribute, attributeData]
  }
  return R.pipe(
    (cols: string[]) => R.zip(cols, R.range(0, cols.length)),
    R.filter(
      (p: [string, number]) =>
        R.allPass([
          R.contains('%'),
          R.contains('2015')
        ])(p[0])
    ),
    R.map(tupled2(attributeForColumnName))
  )(columnNames)
}

fs.readFile(sa2ReportFilename)
  .then(bufferToSpreadsheet)
  .then(
    R.pipe(
      R.prop('Sheets'),
      R.values
    )
  )
  .then(R.chain(processSheet))
  .then(
    writeAttributesAndData('private', 'sa2_2011')
  )
