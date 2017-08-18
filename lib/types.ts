interface Attribute {
  readonly name: string,
  readonly description: string,
  readonly type: string
}

interface AttributeIndex {
  readonly attributes : Attribute[]
}

type AttributeData = StringAttributeData | NumericAttributeData

type StringAttributeData = {
  readonly [code: string]: string
}

type NumericAttributeData = {
  readonly [code: string]: number
}

type Correspondences = {
  readonly [target: string]: {
    contributors: {
      readonly [source: string]: number
    },
    quality: string|undefined
  }
}

interface Region {
  readonly code: string,
  readonly name: string
}

type AttributeIndexFetcher = (
  regionType: string
) => Promise<AttributeIndex>

type AttributeDataFetcher = (
  regionType: string,
  attribute: Attribute
) => Promise<AttributeData>
