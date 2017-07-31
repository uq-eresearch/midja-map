import * as R from 'ramda'
import { expect } from 'chai'
import * as mathjs from 'mathjs'
import {
  check,
  gen,
  install as mochaTestcheckInstall } from 'mocha-testcheck'
mochaTestcheckInstall(global)

import * as util from '../../lib/util'

describe('util', function() {

  describe('tupled2', function() {
    it('should exist', function() {
      expect(util.tupled2).to.be.ok
    })
  })

  describe('WeightedMean', function() {
    it('should exist', function() {
      expect(util.WeightedMean).to.be.ok
    })

    check.it(
      'operates like mean for equal weights',
      gen.array(gen.number).notEmpty(),
      function(vs: number[]) {
        const avg: number = util.toNumber(
          mathjs.mean(vs.map(util.toBigNumber))
        )
        const output: util.WeightedMean =
          vs
            .map(v => new util.WeightedMean(v, 1))
            .reduce((a, b) => a.add(b))
        if (isNaN(output.value)) {
          expect(isNaN(avg)).to.be.true
        } else {
          expect(output.value).to.equal(avg)
        }
      })

      check.it(
        'handles different weights',
        gen.array(
          gen.array([
            gen.number,
            gen.posNumber.suchThat(R.complement(mathjs.isZero))
          ], { minSize: 1 }),
          { minSize: 1 }
        ),
        function(pairs: [number, number][]) {
          const avg: number =
            util.toNumber(
              mathjs.divide(
                pairs
                  .map(R.map(util.toBigNumber))
                  .map(p => mathjs.multiply(p[0], p[1]))
                  .reduce((a, b) => mathjs.add(a, b)),
                pairs
                  .map(p => p[1])
                  .map(util.toBigNumber)
                  .reduce((a, b) => mathjs.add(a, b))
              )
            )
          const output: util.WeightedMean =
            pairs
              .map(util.tupled2(
                (v: number, w: number) =>
                  new util.WeightedMean(v, w)))
              .reduce((a, b) => a.add(b))
          if (isNaN(output.value)) {
            expect(isNaN(avg)).to.be.true
          } else {
            expect(output.value).to.equal(avg)
          }
        })
  })

})
