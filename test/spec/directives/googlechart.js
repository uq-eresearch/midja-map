'use strict';

describe('Directive: googlechart', function() {

  // load the directive's module
  beforeEach(angular.mock.module('midjaApp'));

  var element,
    scope;

  beforeEach(inject(function($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function($compile) {
    element = angular.element('<googlechart></googlechart>');
    element = $compile(element)(scope);
    expect(element.prop("tagName")).toBe('DIV');
  }));
});
