'use strict';

require('jasmine-check').install()

import R from 'ramda'

describe('Filter: props', function() {

  // load the filter's module
  beforeEach(angular.mock.module('midjaApp'));

  // initialize a new instance of the filter before each test
  var props;
  beforeEach(inject(function($filter) {
    props = $filter('props');
  }));

  check.it(
    'should not change non-array input',
    gen.primitive,
    (v) => {
      expect(props(v, { foo: 'bar' })).toEqual(v);
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
      const output = props(values, spec)
      R.filter(
        v => v.name.toLowerCase().indexOf(spec.name.toLowerCase()) > -1,
        values
      ).forEach(v => expect(output).toContain(v))
    }
  )

});
