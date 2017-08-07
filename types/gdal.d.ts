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
    bands: DatasetBands
    layers: DatasetLayers
    close(): void
  }

  export class DatasetBands {
    get(index: number): RasterBand
    forEach<T>(callback: (band: RasterBand) => T): void
    map<T>(callback: (band: RasterBand) => T): T[]
  }

  export class Band {
    pixels: RasterBandPixels
    size: { x: number, y, number }
  }

  export class RasterBandPixels {
    get(x: number, y: number): number
    read(x: number, y: number, width: number, height: number)
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
