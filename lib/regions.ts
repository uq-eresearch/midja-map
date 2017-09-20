import R from 'ramda'

import { tupled2, tupled3 } from './util'

type RegionType = string
type RegionTypeFetcher = (regionType: RegionType) => Promise<Region[]>

type SubregionTestF = (p: Region) => (c: Region) => boolean

interface SubregionTest {
  readonly parentRegionType: RegionType
  readonly childRegionType: RegionType
  readonly test: SubregionTestF
}

function commonNumericPrefix(
    sourceRegion: Region): (childRegion: Region) => boolean {
  function removeNonNumericCharacters(s: string) {
    return s.replace(/[^\d]/g, '');
  }
  return R.pipe(
    R.prop('code'),
    removeNonNumericCharacters,
    R.startsWith(removeNonNumericCharacters(sourceRegion.code))
  )
}

// Tests to determine if child region is in parent
var subregionTests: SubregionTest[] = R.map(
  tupled3(
    (
      parentRegionType: RegionType,
      childRegionType: RegionType,
      test: SubregionTestF
    ) => {
      return { parentRegionType, childRegionType, test }
    }
  ),
  [
    ['country', 'state', R.always(R.always(true))],
    ['state', 'ireg_2011', commonNumericPrefix],
    ['state', 'sa4_2011', commonNumericPrefix],
    ['state', 'lga_2011', commonNumericPrefix],
    ['state', 'sa4_2016', commonNumericPrefix],
    ['state', 'lga_2016', commonNumericPrefix],
    ['ireg_2011', 'iare_2011', commonNumericPrefix],
    ['iare_2011', 'iloc_2011', commonNumericPrefix],
    ['sa4_2011', 'sa3_2011', commonNumericPrefix],
    ['sa3_2011', 'sa2_2011', commonNumericPrefix],
    ['sa4_2016', 'sa3_2016', commonNumericPrefix],
    ['sa3_2016', 'sa2_2016', commonNumericPrefix]
  ]
)

function subregionTestFor(
    targetRegionType: RegionType,
    region: Region): (childRegion: Region) => boolean {
  return R.find<SubregionTest>(
    R.whereEq({
      parentRegionType: region.type,
      childRegionType: targetRegionType
    }),
    subregionTests
  ).test(region)
}

function parentRegionType(childRegionType: RegionType): RegionType {
  const test = R.find(
    R.propEq('childRegionType', childRegionType),
    subregionTests
  )
  return test && test.parentRegionType
}

function regionTypeHierarchy(regionType: RegionType): RegionType[] {
  const p = parentRegionType(regionType)
  return !p ?
    [ regionType ] :
    [ regionType ].concat(regionTypeHierarchy(p))
}

function fetchRegions(
    attributeDataFetcher: AttributeDataFetcher,
    regionType: RegionType): Promise<Region[]> {
  function regionBuilder(code: string, name: string): Region {
    return { name, code, type: regionType }
  }
  switch (regionType) {
    case 'country':
      return Promise.resolve([regionBuilder('', 'Australia')])
    default:
      return attributeDataFetcher(regionType, 'region_name')
        .then(R.toPairs)
        .then(R.map(tupled2(regionBuilder)))
  }
}

function regionsAtOrAboveF(regionsF: RegionTypeFetcher): RegionTypeFetcher {
  return function(regionType: RegionType): Promise<Region[]> {
    return Promise.all(R.map(regionsF, regionTypeHierarchy(regionType)))
      .then((allRegions: Region[][]) => R.unnest<Region>(allRegions))
  }
}

function subregionsF(regionsF: RegionTypeFetcher) {
  return function getSubregions(
      targetRegionType: RegionType,
      region: Region): Promise<Region[]> {
    const transitions: RegionType[] =
      R.dropWhile(
        R.complement(R.equals(region.type)),
        R.reverse(regionTypeHierarchy(targetRegionType))
      )
    return transitions.length <= 1 ?
      Promise.resolve([ region ]) :
      regionsF(transitions[1])
        .then(R.filter(subregionTestFor(transitions[1], region)))
        .then(function(subregions: Region[]): Promise<Region[][]> {
          return Promise.all(
            R.map<Region, Promise<Region[]>>(
              R.partial(getSubregions, [targetRegionType]),
              subregions
            )
          )
        })
        .then((allRegions: Region[][]) => R.unnest<Region>(allRegions))
  }
}

interface RegionFetcher {
  getRegions(regionType: RegionType): Promise<Region[]>
  getRegionsAtOrAbove(regionType: RegionType): Promise<Region[]>
  getSubregions(targetRegionType: RegionType, region: Region): Promise<Region[]>
}

export function buildRegionFetcher(
    attributeDataFetcher: AttributeDataFetcher): RegionFetcher {
  const getRegions = R.memoize((regionType: RegionType) => {
    return fetchRegions(attributeDataFetcher, regionType)
  })
  const getRegionsAtOrAbove = regionsAtOrAboveF(getRegions)
  const getSubregions = subregionsF(getRegions)
  return {
    getRegionsAtOrAbove,
    getRegions,
    getSubregions
  }
}
