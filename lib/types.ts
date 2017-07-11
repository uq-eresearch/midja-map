interface Attribute {
  readonly name: string,
  readonly description: string,
  readonly type: string
}

type AttributeData = {
  readonly [code: string]: any
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
