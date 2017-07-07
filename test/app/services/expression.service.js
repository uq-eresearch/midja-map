'use strict';

import { expect } from 'chai'

describe('Service: expressionService', function() {

  // load the service's module
  beforeEach(angular.mock.module('midjaApp.services'));

  // instantiate service
  var expressionService;
  beforeEach(inject(function(_expressionService_) {
    expressionService = _expressionService_;
  }));

  describe('parser', function() {
    it('should exist', function() {
      expect(expressionService.parse).to.be.ok;
    });

    it('should extract variables', function() {
      var expr = expressionService.parse("z * x + c");
      expect(expr.variables).to.deep.equal(['c', 'x', 'z']);
    });

    it('should provide evaluation', function() {
      var expr = expressionService.parse("z * x + c");
      expect(expr.evaluate({ x: 2, z: 3, c: 1})).to.equal(7);
    });
  });


});
