'use strict';

import { expect } from 'chai'
require('mocha-testcheck').install()

import R from 'ramda'
import { convertByProportion } from '../../../lib/attribute/correspondences'
import correspondenceFixture from './fixtures/correspondences.json'

describe('correspondences', () => {

  describe('convertByProportion', () => {

    it('converts using contributor proportions', () => {
      const convert = convertByProportion(correspondenceFixture)
      const input = {
        "ο": 2,
        "ω": 3,
        'γ': 7,
        'κ': 10
      }
      expect(convert(input)).to.deep.equal({
        'c': 1,
        'o': 5,
        'g': 7,
        'k': 9
      })
    })

  })

});
