declare module 'gdal' {
  export type GeoTransform = [
    number, /* top left x */
    number, /* w-e pixel resolution */
    number, /* 0 */
    number, /* top left y */
    number, /* 0 */
    number  /* n-s pixel resolution (negative value) */
  ]

  export class Dataset {
    geoTransform: GeoTransform
    layers: DatasetLayers
    close(): void
  }

  export class DatasetLayers {
    forEach<T>(callback: (layer: Layer) => T): void
    map<T>(callback: (layer: Layer) => T): T[]
  }

  export class Layer {
    features: LayerFeatures
  }

  export class LayerFeatures {
    forEach<T>(callback: (feature: Feature) => T): void
    map<T>(callback: (feature: Feature) => T): T[]
  }

  export class Feature {
    fields: any
    getGeometry(): any
  }

  export class FeatureFields {
    get(field: string | int): any
  }

  export function open(...args: any[]): Dataset;
}
