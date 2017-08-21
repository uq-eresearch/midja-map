import { expect } from 'chai'
import * as R from 'ramda'
import {
  multipleLinearRegression
} from '../../../lib/attribute/regression'

import indep1 from '../../../data/public/sa2_2016/census2016_all_males_total.json'
import indep2 from '../../../data/public/sa2_2016/census2016_all_females_total.json'
import dep from '../../../data/public/sa2_2016/census2016_all_persons_total.json'

describe('regression', function() {

  describe('multipleLinearRegression', function() {
    it('should exist', function() {
      expect(multipleLinearRegression).to.be.ok
    });

    it('should work with contrived data', function() {
      const kvs = [
        {
          'a': 10,
          'b': 7,
          'c': 10,
          'd': 10,
          'e': 20,
        },
        {
          'a': 1,
          'b': 2,
          'c': 3,
          'd': 4,
          'e': 10
        },
        {
          'a': 8,
          'b': 3,
          'c': 4,
          'd': 2,
          'e': NaN
        }
      ]
      const output = multipleLinearRegression(
        R.head(kvs),
        R.tail(kvs)
      )
      R.forEach(data => {
        R.forEach(k => {
          expect(data).to.have.property(k)
        }, output.keySet)
      }, kvs)
      expect(output.equation).to.have.property('coefficients')
      expect(output.equation.coefficients).to.have.lengthOf(2)
      expect(output.equation.coefficients[0]).to.be.closeTo(2, 1e-9)
      expect(output.equation.coefficients[1]).to.be.closeTo(1, 1e-9)
      expect(output.equation.intercept).to.be.closeTo(0, 1e-9)
      expect(output.adjustedRSquared).to.be.closeTo(1, 1e-9)
    })

    it('should work with real data', function() {
      const output = multipleLinearRegression(
        dep,
        [indep1, indep2]
      )
      R.forEach(data => {
        R.forEach(k => {
          expect(data).to.have.property(k)
        }, output.keySet)
      }, [dep, indep1, indep2])
      expect(output.equation).to.have.property('coefficients')
      expect(output.equation.coefficients).to.have.lengthOf(2)
      expect(output.equation.coefficients[0]).to.be.closeTo(1, 0.01)
      expect(output.equation.coefficients[1]).to.be.closeTo(1, 0.01)
      expect(output.equation.intercept).to.be.closeTo(0, 1)
      expect(output.adjustedRSquared).to.be.closeTo(1, 0.01)
    })

  })

})
