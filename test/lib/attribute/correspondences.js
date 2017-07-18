'use strict';

import { expect } from 'chai'
require('mocha-testcheck').install()

import R from 'ramda'
import {
  convertByAverage,
  convertBySum } from '../../../lib/attribute/correspondences'
import correspondenceFixture from './fixtures/correspondences.json'

describe('correspondences', () => {

  describe('convertBySum', () => {

    it('converts using sum of contributor proportions', () => {
      const convert = convertBySum(correspondenceFixture)
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

  describe('convertByAverage', () => {

    it('averages contributors to target', () => {
      const convert = convertByAverage(correspondenceFixture)
      const input = {
        'γ': 7,
        'κ': 10,
        "ο": 2,
        "ω": 3
      }
      expect(convert(input)).to.deep.equal({
        'c': 10,
        'g': 7,
        'k': 10,
        'o': 2.5
      })
    })

  })

});
