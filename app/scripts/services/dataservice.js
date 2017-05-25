'use strict';

/**
 * @ngdoc service
 * @name midjaApp.dataService
 * @description
 * # dataService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('dataService', function($http, $q, expressionService) {
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

    var getMetadata = _.memoize(getMetadataFromRemote);

    return {
      getAvailableAttributes: getAvailableAttributes,
      getAttribute: getAttribute,
      getSubregions: getSubregions,
      getRegionsAtOrAbove: getRegionsAtOrAbove,
      getCkmeansBuckets: getCkmeansBuckets,
      getRegionsStartingWith: getRegionsStartingWith,
      filterByRemotenessArea: filterByRemotenessArea,
      getAttributesForRegions: getAttributesForRegions
    };

    function getAvailableAttributes(regionType) {
      return getMetadata(regionType).then(_.property('attributes'));
    }

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

    function getAttributeFromRemote(regionType, attribute) {
      return getAvailableAttributes(regionType)
        .then(function(availableAttributes) {
          var attributeMetadata = _.find(
            availableAttributes,
            _.flow(
              _.property('name'),
              _.partial(_.isEqual, attribute)));
          if (!attributeMetadata) {
            return {};
          } else if (attributeMetadata.expression) {
            // Collect dependant variables and evaluate expression
            var expr = expressionService.parse(attributeMetadata.expression);
            return $q.all(
              _.map(
                expr.dependantVariables,
                _.partial(getAttribute, regionType))
            ).then(function(attributesData) {
              var commonRegions = _.intersection.apply(null,
                _.map(attributesData, _.keys)).sort();
              var series = _.chain(commonRegions)
                .map(function(region) {
                  return _.zipObject(
                    expr.dependantVariables,
                    _.map(attributesData, _.property(region)));
                })
                .map(expr.evaluate)
                .value();
              return _.zipObject(commonRegions, series);
            });
          } else {
            return $http
              .get('/data/' + regionType + '/' + attribute)
              .then(_.property('data'));
          }
        });
    }

    function getMetadataFromRemote(regionType) {
      return $http
        .get('/data/' + regionType + '/')
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


  });
