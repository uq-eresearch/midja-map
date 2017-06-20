'use strict';

require('jasmine-check').install()

import R from 'ramda'

describe('Filter: propsFilter', function() {

  // load the filter's module
  beforeEach(angular.mock.module('midjaApp'));

  // initialize a new instance of the filter before each test
  var propsFilter;
  beforeEach(inject(function($filter) {
    propsFilter = $filter('propsFilter');
  }));

  check.it(
    'should not change non-array input',
    gen.primitive,
    (v) => {
      expect(propsFilter(v, { foo: 'bar' })).toBe(v);
    }
  )

  const genValue =
    gen.object({
      name: gen.asciiString,
      description: gen.asciiString
    })

  check.it(
    'should select objects based on case-insensitive substring property matching',
    gen.array(genValue),
    gen.object({
      name: gen.alphaNumString
    }),
    (values, spec) => {
      const output = propsFilter(values, spec)
      R.filter(
        v => v.name.toLowerCase().indexOf(spec.name.toLowerCase()) > -1,
        values
      ).forEach(v => expect(output).toContain(v))
    }
  )

});
