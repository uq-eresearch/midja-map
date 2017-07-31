/// <reference path="node_modules/@types/osmosis/index.d.ts" />

declare module 'osmosis' {
  interface Osmosis {
    data(callback: (data: {[k: string]: string}) => void): Osmosis
    done(callback: () => void): Osmosis
  }
  const osmosis = Osmosis
  export = osmosis
}
