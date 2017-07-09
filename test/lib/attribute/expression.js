'use strict';

import { expect } from 'chai'
import expression from '../../../lib/attribute/expression'

describe('expression', function() {

  it('should exist', function() {
    expect(expression).to.be.ok;
  });

  it('should extract variables', function() {
    var expr = expression("z * x + c");
    expect(expr.variables).to.deep.equal(['c', 'x', 'z']);
  });

  it('should provide evaluation', function() {
    var expr = expression("z * x + c");
    expect(expr.evaluate({ x: 2, z: 3, c: 1})).to.equal(7);
  });

});
