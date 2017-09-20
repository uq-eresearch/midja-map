import R from 'ramda'
import _ from 'lodash-es'
import ss from 'simple-statistics'
import { buildAttributeDataFetcher } from '../../../lib/attribute/data'
import expression from '../../../lib/attribute/expression'
import { buildIndexFetcher } from '../../../lib/attribute/index'
import { buildRegionFetcher } from '../../../lib/regions'

export default function dataService($http, $q) {
  // Tests to determine if child region is in parent
  var subregionTests = (function() {
    function commonNumericPrefix(sourceRegion) {
      function removeNonNumericCharacters(s) {
        return s.replace(/[^\d]/g, '');
      }
      return _.flow(
        _.property('code'),
        removeNonNumericCharacters,
        _.partial(_.startsWith, _,
          removeNonNumericCharacters(sourceRegion.code)));
    }
    return {
      'country': {
        'state': _.constant(_.constant(true))
      },
      'state': {
        'ireg_2011': commonNumericPrefix,
        'sa4_2011': commonNumericPrefix,
        'lga_2011': commonNumericPrefix,
        'sa4_2016': commonNumericPrefix,
        'lga_2016': commonNumericPrefix
      },
      'ireg_2011': {
        'iare_2011': commonNumericPrefix
      },
      'iare_2011': {
        'iloc_2011': commonNumericPrefix
      },
      'sa4_2011': {
        'sa3_2011': commonNumericPrefix
      },
      'sa3_2011': {
        'sa2_2011': commonNumericPrefix
      },
      'sa4_2016': {
        'sa3_2016': commonNumericPrefix
      },
      'sa3_2016': {
        'sa2_2016': commonNumericPrefix
      }
    };
  }());

  function jsonDataFileFetcher(accessType, regionType, filename) {
    return $http
      .get(`./data/${accessType}/${regionType}/${filename}`)
      .then(R.prop('data'))
  }

  const getMetadataFromRemote = buildIndexFetcher(jsonDataFileFetcher)
  const getMetadata = R.memoize(getMetadataFromRemote);
  const getAttribute = R.memoize(
    buildAttributeDataFetcher(
      jsonDataFileFetcher,
      getCorrespondences,
      getMetadata
    )
  )
  const regionFetcher = buildRegionFetcher(getAttribute)

  return {
    getAvailableAttributes: getAvailableAttributes,
    getAttribute: getAttribute,
    getSubregions: regionFetcher.getSubregions,
    getRegionsAtOrAbove: regionFetcher.getRegionsAtOrAbove,
    getCkmeansBuckets: getCkmeansBuckets,
    getRegionsStartingWith: getRegionsStartingWith,
    filterByRemotenessArea: filterByRemotenessArea,
    getAttributesForRegions: getAttributesForRegions
  };

  function getAvailableAttributes(regionType) {
    return getMetadata(regionType).then(R.prop('attributes'))
  }

  function filterByRemotenessArea(regions, regionType, remotenessAreaNames) {
    return getAttribute(regionType, 'ra_name')
      .then(_.propertyOf)
      .then(function(raNameLookup) {
        return _.filter(
          regions,
          _.flow(
            _.property('code'),
            raNameLookup,
            _.partial(_.includes, remotenessAreaNames)));
      })
  }

  function caseInsensitiveStartsWith(prefix) {
    function toLowerCase(s) {
      return s.toLowerCase();
    }
    return _.flow(
      toLowerCase,
      _.partial(_.startsWith, _, toLowerCase(prefix)));
  }

  function getRegionsStartingWith(regionType, prefix) {
    return regionFetcher.getRegionsAtOrAbove(regionType)
      .then(function(regions) {
        return _.filter(regions,
          _.flow(
            _.property('name'),
            caseInsensitiveStartsWith(prefix)));
      })
      .then(function(regions) {
        return _.sortBy(
          regions,
          _.flow(_.property('name'), _.size));
      })
  }

  function getCorrespondences(sourceRegionType, targetRegionType) {
    return $http
      .get(`./correspondences/${sourceRegionType}/${targetRegionType}.json`)
      .then(_.property('data'));
  }

  function getAttributesForRegions(regionType, attributeNames, regions) {
    return $q.all(_.zipObject(
      attributeNames,
      _.map(attributeNames, _.partial(getAttribute, regionType))
    )).then(function(data) {
      var regionCodes = _.map(regions, _.property('code'));
      return _.zipObject(
        regionCodes,
        _.map(regionCodes, function(regionCode) {
          return _.zipObject(
            attributeNames,
            _.map(attributeNames, function(attrName) {
              return data[attrName][regionCode];
            })
          );
        })
      );
    });
  }

  function Bucket(min, max) {
    this.min = min;
    this.max = max;
    this.name = min + " - " + max;
    this.contains = function(v) {
      return v >= min && v <= max;
    };
  }

  function getCkmeansBuckets(values, numberOfBuckets) {
    var groups = ss.ckmeans(values, numberOfBuckets);
    return _.map(groups, function(group) {
      return new Bucket(_.min(group), _.max(group));
    });
  }


}
