'use strict';

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
      expect(service.formatNumber).toBeTruthy();
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
        expect(output).toEqual(examples[i][2]);
      }
    });

    it('should have a default', function() {
      var n = Math.PI * 100000;
      var output = service.formatNumber(n);
      expect(output).toEqual('314,159.27');
    });

    it('should handle NaN', function() {
      expect(service.formatNumber(Number.NaN)).toEqual('NaN');
    });

    it('should handle infinities', function() {
      expect(service.formatNumber(Number.POSITIVE_INFINITY)).toEqual(
        '\u221E');
      expect(service.formatNumber(Number.NEGATIVE_INFINITY)).toEqual(
        '-\u221E');
    });
  });


});
