import R from 'ramda'
import { expect } from 'chai'

import * as grouping from '../../lib/grouping'

describe('grouping', function() {

  describe('groupSingular', function() {
    it('should produce the specified number of groups', function() {
      const objs = [1, 2, 3, 5, 6, 7, 9, 10, 11]
      const fValue = R.identity
      expect(grouping.groupSingular(1, objs, fValue)).to.have.lengthOf(1)
      expect(grouping.groupSingular(2, objs, fValue)).to.have.lengthOf(2)
      expect(grouping.groupSingular(3, objs, fValue)).to.have.lengthOf(3)
    })
    it('should group similar values together', function() {
      const objs = [1.5, 2, 2.5, 5.5, 6, 6.5]
      const fValue = R.identity
      const grouped = grouping.groupSingular(2, objs, fValue)
      expect(grouped).to.have.lengthOf(2)
      expect(grouped[0]).to.deep.equal(objs.slice(0, 3))
      expect(grouped[1]).to.deep.equal(objs.slice(3))
    })
  })

})
