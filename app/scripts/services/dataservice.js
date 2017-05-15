'use strict';

/**
 * @ngdoc service
 * @name midjaApp.dataService
 * @description
 * # dataService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('dataService', function($http, $q, metadataService, labelService) {
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
          'ireg': commonNumericPrefix,
          'sa4': commonNumericPrefix,
          'lga': commonNumericPrefix
        },
        'sa4': {
          'sa3': commonNumericPrefix
        },
        'sa3': {
          'sa2': commonNumericPrefix
        },
        'ireg': {
          'iare': commonNumericPrefix
        },
        'iare': {
          'iloc': commonNumericPrefix
        }
      };
    }());

    // Map child back to parent
    var parentRegionTypes = _(subregionTests)
      .map(function(fMap, parentType) {
        return _.map(
          fMap,
          function(f, childType) {
            return [childType, parentType];
          });
      })
      .flatten()
      .zipObject()
      .value();

    var getAttribute = _.memoize(
      _.ary(getAttributeFromRemote, 2),
      function() {
        return _.map(arguments, _.identity).join(":");
      });

    return {
      getSubregions: getSubregions,
      getRegionsAtOrAbove: getRegionsAtOrAbove,
      getBuckets: getBuckets,
      getQuantileBuckets: getQuantileBuckets,
      getRegionsStartingWith: getRegionsStartingWith,
      filterByRemotenessArea: filterByRemotenessArea,
      getAttributesForRegions: getAttributesForRegions,
      doQuery: doQuery
    };

    function getSubregions(targetRegionType, region) {
      var transitions =
        _.chain(getRegionTypeHeirarchy(targetRegionType))
        .reverse()
        .dropWhile(_.negate(_.partial(_.isEqual, region.type)))
        .value();
      if (_.isEmpty(transitions)) {
        throw "Cannot convert " + region.type + " to " + targetRegionType;
      } else if (_.size(transitions) == 1) {
        return [region];
      } else {
        var immediateTargetRegionType = transitions[1];
        var testF =
          subregionTests[region.type][immediateTargetRegionType](region);
        return getRegions(immediateTargetRegionType)
          .then(_.partial(_.filter, _, testF))
          .then(function(subregions) {
            return $q.all(
              _.map(subregions,
                _.partial(getSubregions, targetRegionType))
            ).then(_.flatten);
          })
      }
    }

    function filterByRemotenessArea(regions, regionType, remotenessAreaName) {
      return getAttribute(regionType, 'ra_name')
        .then(_.propertyOf)
        .then(function(raNameLookup) {
          return _.filter(
            regions,
            _.flow(
              _.property('code'),
              raNameLookup,
              _.partial(_.isEqual, remotenessAreaName)));
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
      return getRegionsAtOrAbove(regionType)
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

    function getRegionTypeHeirarchy(regionType) {
      var r = regionType;
      var rs = [r];
      while (r = parentRegionTypes[r]) {
        rs.push(r);
      }
      return rs;
    }

    function getRegions(regionType) {
      function locBuilder(name, code) {
        return {
          code: code,
          name: name,
          type: regionType
        };
      }
      switch (regionType) {
        case 'country':
          return $q(function(resolve) {
            resolve(locBuilder('Australia', ''));
          });
        default:
          return getAttribute(regionType, 'region_name')
            .then(_.partial(_.map, _, locBuilder));
      }
    }

    function getRegionsAtOrAbove(regionType) {
      var regionTypes = getRegionTypeHeirarchy(regionType);
      return $q.all(
        _.map(
          regionTypes,
          getRegions)
      ).then(_.flatten);
    }

    function getBuckets(column, sql, numberOfBuckets) {
      numberOfBuckets = numberOfBuckets || 7;

      var sql = 'select unnest(cartodb.CDB_QuantileBins(array_agg(distinct((' +
        column.name + '::numeric))), ' +
        numberOfBuckets + ')) as buckets from (' + sql +
        ') _table_sql where ' + column.name + ' is not null';

      return doQuery(sql).then(function(results) {
        var values = _.pluck(results.rows, 'buckets').reverse();
        return values;
      });
    }

    function getAttributeFromRemote(regionType, attribute) {
      return $http
        .get('/data/' + regionType + '/' + attribute)
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

    function sqlCondition(regionColumn, regions) {
      if (!regions) {
        return regionColumn + "IS NOT NULL";
      }
      var regions = _.uniq(_.map(
        regions,
        _.isObject(_.first(regions)) ?
        _.property(regionColumn) :
        _.identity));
      return regionColumn +
        ' IN (' +
        regions.map(function(region) {
          return "'" + region + "'";
        }).join(",") +
        ')';
    }

    function getQuantileBuckets(values, numberOfBuckets) {
      var breakPoints = _.map(_.range(0, numberOfBuckets + 1), function(i) {
        var quantile = 1.0 / numberOfBuckets * i;
        return ss.quantile(values, quantile);
      });
      return _.map(_.range(0, numberOfBuckets), function(i) {
        return {
          min: breakPoints[i],
          max: breakPoints[i + 1]
        };
      })
    }

    function doQuery(sql) {
      return $http
        .get("/sql/?q=" + encodeURI(sql))
        .then(_.property('data'));
    }
  });
