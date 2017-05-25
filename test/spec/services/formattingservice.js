'use strict';

describe('Service: formattingService', function() {

  // load the service's module
  beforeEach(module('midjaApp'));

  // instantiate service
  var service;
  beforeEach(inject(function(_formattingService_) {
    service = _formattingService_;
  }));

  describe('formatNumber', function() {
    it('should exist', function() {
      expect(service.formatNumber).toBeTruthy();
    });

    it('should format using numeric.js', function() {
      var examples = [
        [Math.PI, '0[.]00'],
        [Math.PI*10000, '0,0'],
      ];
      for (var i = 0; i < examples.length; i++) {
        var n = examples[i][0];
        var fmt = examples[i][1];
        var output = service.formatNumber(n, fmt);
        expect(output).toEqual(numeral(n).format(fmt));
      }
    });

    it('should have a default', function() {
      var n = Math.PI * 100000;
      var defaultFormat = '0,0[.]00000'
      var output = service.formatNumber(n);
      expect(output).toEqual(numeral(n).format(defaultFormat));
    });

    it('should handle NaN', function() {
      expect(service.formatNumber(Number.NaN)).toEqual('NaN');
    });

    it('should handle infinities', function() {
      expect(service.formatNumber(Number.POSITIVE_INFINITY)).toEqual('\u221E');
      expect(service.formatNumber(Number.NEGATIVE_INFINITY)).toEqual('-\u221E');
    });
  });


});
