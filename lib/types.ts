interface Attribute {
  readonly name: string,
  readonly description: string,
  readonly type: string,
  readonly category?: string,
  readonly format?: Intl.NumberFormatOptions,
  readonly source?: AttributeSource
}

interface AttributeSource {
  readonly name: string,
  readonly license?: {
    type: string,
    url: string
  }
  readonly notes?: string
  readonly url?: string
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
  readonly code: string
  readonly name: string
  readonly type?: string
}

type JsonDataFileFetcher = (
  accessType: string,
  regionType: string,
  filename: string
) => Promise<object>

type AttributeIndexFetcher = (
  regionType: string
) => Promise<AttributeIndex>

type AttributeDataFetcher = (
  regionType: string,
  attributeName: string
) => Promise<AttributeData>
