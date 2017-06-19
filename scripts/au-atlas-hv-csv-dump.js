import R from 'ramda'
import XLSX from 'xlsx'
import osmosis from 'osmosis'
import { readFile } from 'fs-extra'
import rp from 'request-promise-native'
import { writeIndex, writeAttributeData } from '../lib/attribute/import'

const accessType = 'private'
const regionType = 'sa3'
const years = [2015, 2017]

const indexUrl = (year) =>
  'https://www.safetyandquality.gov.au/'+
  `atlas/atlas-${year}/atlas-${year}-downloads/`

const fetchLinks = (url) => new Promise((resolve, reject) => {
  var links = []
  osmosis
    .get(url)
    .find('.documents')
    .find('a')
    .set('link', '@href')
    .data((data) => {
      if (data.link && data.link.match(/.xlsx$/)) {
        links = R.append(data.link, links)
      }
    })
    .done(function() {
      resolve(R.uniq(links))
    })
    .log(console.log)
    .error(console.log)
})

const mapP = R.curry((f, vs) => Promise.all(R.map(f, vs)))
const chainP = R.curry((f, vs) => mapP(f, vs).then(R.unnest))
const tapP = R.curry((f, v) => f(v).then(R.always(v)))

const fetchAllLinks = () =>
  Promise.all(R.chain(R.pipe(indexUrl, fetchLinks), years))
    .then(R.unnest)

const download = link =>
  R.startsWith('file://', link) ?
  readFile(link.replace('file://', '')) :
  rp(link)

const bufferToSpreadsheet = (buffer) => XLSX.read(buffer, { type: "buffer"})

const testLinks = (year) =>
  Promise.all(
    R.map(
      v => 'file://' + v,
      {
        '2015': [
          '/tmp/Chapter-1_Version_17Nov2015.xlsx'
        ],
        '2017': [
          '/tmp/Data-file-1.1-Chronic-obstructive-pulmonary-disease.xlsx',
          '/tmp/Data-file-2.1-Acute-myocardial-infarction.xlsx'
        ]
      }[year+'']
    )
  )

const workbookToSheetRows =
  R.pipe(
    R.prop('Sheets'),
    R.values,
    R.map(R.flip(XLSX.utils.sheet_to_json)({ header: 1, raw: true }))
  )

const rowsToAttribute = (year, sourceUrl) => rows => {
  const title =
    R.pipe(
      R.filter(R.complement(R.isEmpty)),
      R.map(R.head),
      R.filter(R.pipe(R.type, R.equals('String'))),
      R.map(v => v.replace(/^Table.*?\.\s+/, '')),
      R.find(v => /^Number of.*by SA3.*/.test(v))
    )(rows)
  if (!title) {
    return []
  }
  const keyMatcher = /^SA3 code/i
  const valueMatcher = /^Age( and sex)? Standardised Rate per/i
  const matches = (matcher) => v => matcher.test(v)
  const table =
    R.pipe(
      R.dropWhile(R.complement(R.any(v => keyMatcher.test(v)))),
      R.dropWhile(R.complement(R.any(v => valueMatcher.test(v)))),
      R.takeWhile(R.complement(r => R.isEmpty(r) || /notes/i.test(R.head(r))))
    )(rows)
  if (R.isEmpty(table)) {
    return []
  }
  const data =
    R.pipe(
      R.transpose,
      cols => [
        R.find(R.pipe(R.head, matches(keyMatcher)), cols),
        R.find(R.pipe(R.head, matches(valueMatcher)), cols)
      ],
      R.transpose,
      R.tail,
      R.filter(R.apply((k,v) => R.type(v) == 'Number')),
      R.fromPairs
    )(table)
  const valueHeaderCell = R.find(matches(valueMatcher), R.head(table))
  const attributeDescription =
    title
      .replace(/[\u2010-\u2015]/g, '-') // Remove unicode dashes
      .replace(
        /,( age standardised,)? by SA3, /i,
        ` - ${valueHeaderCell.replace(/ per 100,000/, '')} - `)
  const attributeName =
    `aahv${year}_` +
    attributeDescription
      .replace(/100,?000/g, '100k')
      .replace(/ - /g, ' ')
      .replace(/\b20(\d{2})-(\d{2})/g, '20$1-20$2')
      .replace(/-/g, 'to')
      .replace(/[,\s]+/g, '_')
      .toLowerCase()
  const sourceName = `Australian Atlas of Health Variation ${year}`
  return [{
    data: data,
    attribute: {
      name: attributeName,
      description: attributeDescription +
        ` (Australian Atlas of Health Variation ${year})`,
      type: 'number',
      source: {
        name: sourceName,
        url: sourceUrl
      }
    }
  }]
}

// writeAttributeDataToFiles :: [Object] -> Promise [Object]
const writeAttributeDataToFiles =
  mapP(
    tapP(
      R.pipe(
        R.props(['attribute', 'data']),
        R.apply(writeAttributeData(accessType, regionType))
      )
    )
  )



/*
fetchAllLinks()
  .then(R.take(1))
  .then(R.map(downloadSpreadsheet))
  .then(reducePromises)
*/
chainP(
    year =>
      testLinks(year)
        .then(
          chainP(
            link =>
              download(link)
                .then(bufferToSpreadsheet)
                .then(workbookToSheetRows)
                .then(R.chain(rowsToAttribute(year, link)))
          )
        ),
    years
  )
  .then(writeAttributeDataToFiles)
  .then(R.pluck('attribute'))
  .then(tapP(writeIndex(accessType, regionType)))
  .then(console.log)
  .catch(console.log)
