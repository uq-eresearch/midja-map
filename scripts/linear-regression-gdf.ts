import * as R from 'ramda'
import * as readline from 'readline'
import {
  readAttributeData as readAttributeDataDirect,
  readAttributeIndex
} from '../lib/attribute/import'
import { multipleLinearRegression } from '../lib/attribute/regression'
import '../lib/types'

const regionType = process.argv[2]

const readAttributeData = R.memoize(readAttributeDataDirect)

type AttributePair = [Attribute, Attribute]

class AttributePairLR {
  readonly dependent: Attribute
  readonly independent: Attribute
  readonly adjustedRSquared: number
  constructor(x: Attribute, y: Attribute, ar2: number) {
    this.independent = x
    this.dependent = y
    this.adjustedRSquared = ar2
  }
  asGDFNodeRows(): string[] {
    return [
      this.independent,
      this.dependent
    ].map((attr: Attribute) => `${attr.name},${attr.description}`)
  }
  asGDFEdgeRow(): string {
    return [
      this.independent.name,
      this.dependent.name,
      this.adjustedRSquared
    ].join(',')
  }
}

function getNumericAttributes(index: AttributeIndex): Attribute[] {
  return  index.attributes.filter((attr: Attribute) => attr.type == 'number')
}

function processAttributePairs(
      ps: AttributePair[]): Promise<AttributePairLR[]> {
  process.stderr.write("Starting attribute pair processing...")
  return R.addIndex(R.reduce)(
    (m: Promise<AttributePairLR[]>, v: AttributePair, i: number) =>
      m.then((previous: AttributePairLR[]) => {
        readline.clearLine(process.stderr, -1)
        readline.cursorTo(process.stderr, 0)
        process.stderr.write(`Processing attribute pair ${i}/${ps.length}`)
        return processAttributePair(v)
          .then((v: AttributePairLR) => R.append(v, previous))
      }),
    Promise.resolve([] as AttributePairLR[]),
    ps
  )
}

function processAttributePair(p: AttributePair): Promise<AttributePairLR> {
  return Promise.all(R.map<Attribute, Promise<AttributeData>>(
      R.pipe(
        R.prop('name'),
        readAttributeData(regionType)
      ),
      p
    ))
    .then<AttributePairLR>((attributeData: AttributeData[]) => {
      const [xAttr, yAttr] = p
      return new AttributePairLR(
        xAttr, yAttr,
        multipleLinearRegression(
          R.head(attributeData) as NumericAttributeData,
          R.tail(attributeData) as NumericAttributeData[]
        ).adjustedRSquared
      )
    })
    .catch((e) => {
      console.error(p, e)
      return new AttributePairLR(p[0], p[1], 0)
    })
}

readAttributeIndex(regionType)
  .then(getNumericAttributes)
  .then((attributes: Attribute[]) => {
    // Get pairs of attributes
    return R.pipe(
      R.reject((p: AttributePair) => R.equals(p[0], p[1])),
      R.map((p: AttributePair) => R.sortBy(R.prop('name'), p)),
      R.uniqWith(
        (a: AttributePair, b: AttributePair) => a[0] === b[0] && a[1] === b[1]
      )
    )(R.xprod(attributes, attributes))
  })
  .then(processAttributePairs)
  .then(R.filter((ps: AttributePairLR) => ps.adjustedRSquared > 0))
  .then((ps: AttributePairLR[]) =>
    R.concat(
      R.prepend(
        'nodedef>name VARCHAR,label VARCHAR',
        R.uniq(R.chain((p: AttributePairLR) => p.asGDFNodeRows(), ps))
      ),
      R.prepend(
        'edgedef>node1 VARCHAR,node2 VARCHAR,weight DOUBLE',
        R.map((p: AttributePairLR) => p.asGDFEdgeRow(), ps)
      )
    )
  )
  .then(R.forEach(row => console.log(row)))
