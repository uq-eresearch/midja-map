'use strict';

import { expect } from 'chai'

describe('Service: formattingService', function() {

  // load the service's module
  beforeEach(angular.mock.module('midjaApp.services'));

  // instantiate service
  var service;
  beforeEach(inject(function(_formattingService_) {
    service = _formattingService_;
  }));

  describe('formatNumber', function() {
    it('should exist', function() {
      expect(service.formatNumber).to.be.ok;
    });

    it('should format using Intl.NumberFormat', function() {
      var examples = [
        [Math.PI, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0
        }, '3.14'],
        [Math.PI * 10000, {
          maximumFractionDigits: 0
        }, '31,416'],
      ];
      for (var i = 0; i < examples.length; i++) {
        var n = examples[i][0];
        var fmt = examples[i][1];
        var output = service.formatNumber(n, fmt);
        expect(output).to.equal(examples[i][2]);
      }
    });

    it('should have a default', function() {
      var n = Math.PI * 100000;
      var output = service.formatNumber(n);
      expect(output).to.equal('314,159.27');
    });

    it('should handle NaN', function() {
      expect(service.formatNumber(Number.NaN)).to.equal('NaN');
    });

    it('should handle infinities', function() {
      expect(service.formatNumber(Number.POSITIVE_INFINITY)).to.equal(
        '\u221E');
      expect(service.formatNumber(Number.NEGATIVE_INFINITY)).to.equal(
        '-\u221E');
    });
  });


});
