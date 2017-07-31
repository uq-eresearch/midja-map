declare module 'gdal' {
  var noTypeInfoYet: any;

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
  }

  export function open(...args: any[]): any;
}
