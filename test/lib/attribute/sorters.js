'use strict';

import { expect } from 'chai'
require('mocha-testcheck').install()

import R from 'ramda'
import * as sorters from '../../../lib/attribute/sorters'

describe('sorters', function() {
  this.timeout(5000)

  const genNonNumericString = gen.string.then(v => v.replace(/\d/g, ''))
  const genPositiveNumber = gen.int.then(Math.abs)

  describe('sortByAttributeNameNumbers', () => {

    check.it('sorts strings numerically (for positive numbers)',
      gen.array(
        gen.array([
          genNonNumericString,
          genPositiveNumber,
          genNonNumericString
        ])
      ),
      (tuples) => {
        const sortedNums = R.sort((a, b) => a - b, R.map(R.prop(1), tuples))
        const sortedAttributes = sorters.sortByAttributeNameNumbers(
          R.map(
            R.pipe(
              R.join(''),
              R.objOf('name')
            ),
            tuples)
        )
        R.zip(sortedNums, sortedAttributes).forEach(R.apply((num, attr) => {
          expect(attr.name).to.include(num+"")
        }))
      })

  })

});
