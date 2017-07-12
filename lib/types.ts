interface Attribute {
  readonly name: string,
  readonly description: string,
  readonly type: string
}

type AttributeData = StringAttributeData | NumericAttributeData

type StringAttributeData = {
  readonly [code: string]: string
}

type NumericAttributeData = {
  readonly [code: string]: number
}


type Correspondences = {
  readonly [source: string]: {
    readonly [target: string]: number
  }
}

interface Region {
  readonly code: string,
  readonly name: string
}
