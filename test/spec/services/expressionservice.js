'use strict';

describe('Service: expressionService', function() {

  // load the service's module
  beforeEach(module('midjaApp'));

  // instantiate service
  var expressionService;
  beforeEach(inject(function(_expressionService_) {
    expressionService = _expressionService_;
  }));

  describe('parser', function() {
    it('should exist', function() {
      expect(expressionService.parse).toBeTruthy();
    });

    it('should extract dependant variables', function() {
      var expr = expressionService.parse("z * x + c");
      expect(expr.dependantVariables).toEqual(['c', 'x', 'z']);
    });

    it('should provide evaluation', function() {
      var expr = expressionService.parse("z * x + c");
      expect(expr.evaluate({ x: 2, z: 3, c: 1})).toEqual(7);
    });
  });


});
