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

    const genSensibleFiniteNumber =
      gen.numberWithin(-1e100, 1e100)
    const genSensiblePositiveFiniteNumber =
      gen.numberWithin(Number.MIN_VALUE, 1e100)

    /**
     * @param a {number}
     * @param b {number}
     * @return absolute difference between `a` & `b` as a proportion of `a`
     */
    function proportionalDifference(a: number, b: number): number {
      if (mathjs.equal(a, b)) {
        return 0
      } else {
        return mathjs.number(
          mathjs.chain(mathjs.bignumber(a))
            .subtract(mathjs.bignumber(b))
            .abs()
            .divide(mathjs.abs(mathjs.bignumber(a)))
            .done()
        ) as number
      }
    }

    check.it(
      'operates like mean for equal weights',
      gen.array(genSensibleFiniteNumber).notEmpty(),
      function(vs: number[]) {
        const avg: number =
          mathjs.number(
            mathjs.mean(vs.map(v => mathjs.bignumber(v)))
          ) as number
        const output: util.WeightedMean =
          vs
            .map(v => new util.WeightedMean(v, 1))
            .reduce((a, b) => a.add(b))
        // May not be equal, but should be proportionally extremely close
        expect(proportionalDifference(output.value, avg))
          .to.be.lessThan(Number.MIN_VALUE)
      })

      check.it(
        'handles different weights',
        gen.array(
          gen.array([
            genSensibleFiniteNumber,
            genSensiblePositiveFiniteNumber
          ], { minSize: 1 }),
          { minSize: 1 }
        ),
        function(pairs: [number, number][]) {
          const avg: number =
            mathjs.number(
              mathjs.divide(
                pairs
                  .map(R.map(v => mathjs.bignumber(v)))
                  .map(p => mathjs.multiply(p[0], p[1]))
                  .reduce((a, b) => mathjs.add(a, b)),
                pairs
                  .map(p => p[1])
                  .map(v => mathjs.bignumber(v))
                  .reduce((a, b) => mathjs.add(a, b))
              ) as number
            ) as number
          const output: util.WeightedMean =
            pairs
              .map(util.tupled2(
                (v: number, w: number) =>
                  new util.WeightedMean(v, w)))
              .reduce((a, b) => a.add(b))
          // May not be equal, but should be proportionally extremely close
          expect(proportionalDifference(output.value, avg))
            .to.be.lessThan(Number.MIN_VALUE)
        })
  })

})
