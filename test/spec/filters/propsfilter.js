'use strict';

require('../../../app/scripts/app.js');

describe('Filter: propsFilter', function() {

  // load the filter's module
  beforeEach(angular.mock.module('midjaApp'));

  // initialize a new instance of the filter before each test
  var propsFilter;
  beforeEach(inject(function($filter) {
    propsFilter = $filter('propsFilter');
  }));

  it('should return the input prefixed with "propsFilter filter:"',
    function() {
      var text = 'angularjs';
      expect(propsFilter(text)).toBe(text);
    });

});
