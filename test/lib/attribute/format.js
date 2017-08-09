import { expect } from 'chai'
import { formatNumber } from '../../../lib/attribute/format'

describe('format', function() {

  describe('formatNumber', function() {
    it('should exist', function() {
      expect(formatNumber).to.be.ok
    })

    it('should format using Intl.NumberFormat', function() {
      const examples = [
        [Math.PI, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0
        }, '3.14'],
        [Math.PI * 10000, {
          maximumFractionDigits: 0
        }, '31,416'],
      ]
      for (var i = 0; i < examples.length; i++) {
        var n = examples[i][0]
        var fmt = examples[i][1]
        var output = formatNumber(n, fmt)
        expect(output).to.equal(examples[i][2])
      }
    })

    it('should have a default', function() {
      const n = Math.PI * 100000
      const output = formatNumber(n)
      expect(output).to.equal('314,159.27')
    })

    it('should handle NaN', function() {
      expect(formatNumber(Number.NaN)).to.equal('NaN')
    })

    it('should handle infinities', function() {
      expect(formatNumber(Number.POSITIVE_INFINITY)).to.equal('\u221E')
      expect(formatNumber(Number.NEGATIVE_INFINITY)).to.equal('-\u221E')
    })
  })

})
