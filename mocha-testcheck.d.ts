/// <reference path="node_modules/testcheck/index.d.ts" />

declare module "mocha-testcheck" {
  export const install: (object) => void
  export const check: any
  export const gen: testcheck.gen
}
