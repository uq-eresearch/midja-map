'use strict';

require('jasmine-check').install()

import R from 'ramda'
import { transformerWith } from '../../../lib/attribute/correspondences'

describe('correspondences', () => {

  describe('transformerWith', () => {

    const sorted = R.sortBy(R.identity)

    const genSourceIds = gen.intWithin(100, 109).then(R.toString)
    const genTargetIds = gen.intWithin(270, 299).then(R.toString)

    check.it('takes correspondences and produces transfomer',
      {
        times: 20
      },
      gen.object(
        genSourceIds,
        gen.object(
          genTargetIds,
          gen.numberWithin(0.0001, 1.0),
          {
            minSize: 1
          }
        ),
        {
          minSize: 1
        }
      ),
      gen.object(
        genSourceIds,
        gen.posNumber
      ),
      (correspondences, input) => {
        const outputKeys =
          R.pipe(
            R.keys,
            R.chain(
              R.pipe(
                R.flip(R.prop)(
                  R.mapObjIndexed(R.keys, correspondences)
                ),
                R.defaultTo([])
              )
            ),
            sorted,
            R.uniq
          )
        const transformer = transformerWith(correspondences)
        const output = transformer(input)
        const expectedOutputKeys = outputKeys(input)
        const actualOutputKeys = sorted(R.keys(output))
        expect(actualOutputKeys).toEqual(expectedOutputKeys)
      })

  })

});
