import R from 'ramda'
import { readJson, writeJson } from 'fs-extra'
import path from 'path'

const jsonOptions = {
  spaces: 2
}

// targetFile :: (String, String, String) → String
const targetFile = (accessType, regionType, filename) =>
  path.resolve(
    __dirname, '..', '..', 'data',
    accessType,
    regionType,
    filename
  )

// indexTargetFile :: (String, String) → String
const indexTargetFile = (accessType, regionType) =>
  targetFile(accessType, regionType, 'index.json')

// attributeDataTargetFile :: (String, String, Object) → String
const attributeDataTargetFile = (accessType, regionType, attribute) =>
  targetFile(accessType, regionType, `${attribute.name}.json`)

// writeIndex :: String → String → [Object] → Promise [Object]
export const writeIndex = R.curry(
  (accessType, regionType, updatedAttributes) => {
    const modifyAttributes = (currentAttributes) => R.sortBy(
      R.prop('name'),
      R.unionWith(
        R.eqBy(R.prop('name')),
        updatedAttributes,
        currentAttributes)
    )
    const attrsLens = R.lensProp('attributes')
    const indexFile = indexTargetFile(accessType, regionType)
    return R.pipeP(
      () => readJson(indexFile),
      R.over(attrsLens, modifyAttributes),
      R.curryN(3, writeJson)(indexFile, R.__, jsonOptions)
    )()
  }
)

// writeAttribute :: String → String → Object → Object → Promise Object
export const writeAttributeData = R.curry(
  (accessType, regionType, attribute, data) =>
    writeJson(
      attributeDataTargetFile(accessType, regionType, attribute),
      data,
      jsonOptions)
)
