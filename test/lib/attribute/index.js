import { expect } from 'chai'
import index.mergeIndexes from '../../../lib/attribute/index'

describe.only('index', function() {

  describe('buildIndexFetcher', function() {
    it('should exist', function() {
      expect(index.buildIndexFetcher).to.be.ok
    })
  })

})
