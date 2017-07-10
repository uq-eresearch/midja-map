interface Attribute {
  name: string,
  description: string,
  type: string
}

type AttributeData = {[code: string]: number}

type Correspondences = { [source: string]: { [target: string]: number }}
