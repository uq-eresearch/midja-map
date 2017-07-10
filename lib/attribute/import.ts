import R from 'ramda'
import { readJson, writeJson } from 'fs-extra'
import path from 'path'
import '../types'

const jsonOptions = {
  spaces: 2
}

const targetFile = 
  (accessType: string, regionType: string, filename: string) =>
    path.resolve(
      __dirname, '..', '..', 'data',
      accessType,
      regionType,
      filename
    )

const indexTargetFile = (accessType: string, regionType: string) =>
  targetFile(accessType, regionType, 'index.json')

const attributeDataTargetFile =
  (accessType: string, regionType: string, attribute: Attribute) =>
    targetFile(accessType, regionType, `${attribute.name}.json`)

export const writeIndex = R.curry(
  (accessType: string, regionType: string, updatedAttributes: Attribute[]) => {
    const modifyAttributes = (currentAttributes: Attribute[]) => R.sortBy(
      R.prop('name'),
      R.unionWith(
        R.eqBy(R.prop('name')),
        updatedAttributes,
        currentAttributes)
    )
    const attrsLens = R.lensProp('attributes')
    const indexFile = indexTargetFile(accessType, regionType)
    return readJson(indexFile)
      .then(R.over(attrsLens, modifyAttributes))
      .then(data => writeJson(indexFile, data, jsonOptions))
  }
)

export const writeAttributeData = R.curry(
  (accessType: string, regionType: string, attribute: Attribute, data: AttributeData) =>
    writeJson(
      attributeDataTargetFile(accessType, regionType, attribute),
      data,
      jsonOptions)
)
