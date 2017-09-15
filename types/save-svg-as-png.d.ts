
declare namespace SaveSvgAsPng {

  function svgAsPngUri(
    svgEl: SVGSVGElement,
    options: object,
    callback: (uri: string) => void): void

}

declare module 'save-svg-as-png' {
  export = SaveSvgAsPng
}
