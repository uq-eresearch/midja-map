'use strict';

describe('Service: expressionService', function() {

  // load the service's module
  beforeEach(angular.mock.module('midjaApp'));

  // instantiate service
  var expressionService;
  beforeEach(inject(function(_expressionService_) {
    console.log(_expressionService_);
    expressionService = _expressionService_;
  }));

  describe('parser', function() {
    it('should exist', function() {
      expect(expressionService.parse).toBeTruthy();
    });

    it('should extract variables', function() {
      var expr = expressionService.parse("z * x + c");
      expect(expr.variables).toEqual(['c', 'x', 'z']);
    });

    it('should provide evaluation', function() {
      var expr = expressionService.parse("z * x + c");
      expect(expr.evaluate({ x: 2, z: 3, c: 1})).toEqual(7);
    });
  });


});
