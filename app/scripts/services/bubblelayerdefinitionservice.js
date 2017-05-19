'use strict';

/**
 * @ngdoc service
 * @name midjaApp.bubbleLayerDefinitionService
 * @description
 * # bubbleLayerDefinitionService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('bubbleLayerDefinitionService', function($q, dataService) {

    return {
      _generateMapnikSQL: generateMapnikSQL,
      _generateCartoCSS: generateCartoCSS,
      build: build
    };

    function BubbleLayerDefinition(regionType, sql, cartocss, allRegionData) {
      var regionCodeAttribute = regionType + '_code';
      this.regionType = regionType;
      this.sql = sql;
      this.cartocss = cartocss;
      this.interactivity = [
        regionCodeAttribute
      ];
      this.getRegionData = function(interactiveData) {
        var regionCode = interactiveData[regionCodeAttribute];
        return allRegionData[regionCode];
      };
    }

    function build(regionType, attribute, locations) {
      return dataService.getAttributesForRegions(
        regionType, [attribute.name], locations
      ).then(function(data) {
        var isValidNumber = function(v) {
          return _.isNumber(v) && !_.isNaN(v);
        };
        var series = _.filter(
          _.map(_.values(data), _.property(attribute.name)),
          isValidNumber);
        var buckets = generateBuckets(series)
        var geoTable = regionType + "_2011_aust";
        var regionAttribute = regionType + "_code";
        var regionCodes = _.filter(
          _.uniq(_.pluck(locations, 'code')).sort(),
          _.flow(
            _.propertyOf(data),
            _.property(attribute.name),
            _.isNumber));
        var radiusF = function(region) {
          var v = data[region][attribute.name];
          // Get radius using bucket ranges (min: inclusive, max: inclusive)
          // This should cover all valid values, so null if no match.
          return _.chain(buckets)
            .filter(function(bucket) {
              return v >= bucket.min && v <= bucket.max;
            })
            .map(_.property('radius'))
            .first()
            .value();
        };
        var sql = generateMapnikSQL(geoTable, regionAttribute, regionCodes);
        var style = generateCartoCSS(
          geoTable, regionAttribute, regionCodes, radiusF);
        return new BubbleLayerDefinition(regionType, sql, style, data);
      });
    }

    function generateBuckets(series) {
      var maxBuckets = Math.min(5, _.uniq(series).length)
      var buckets = _.first(
        _.chain(_.range(maxBuckets, 0, -1))
          .map(function(n) {
            return dataService.getCkmeansBuckets(series, n);
          })
          .filter(function(buckets) {
            return buckets.length == 1 ||
              _.every(buckets, function(bucket) {
                return bucket.min != bucket.max;
              });
          })
          .value()
      );
      var radius = (function() {
        var MAX_RADIUS = 31;
        var MIN_RADIUS = 5;
        var increment =
          (MAX_RADIUS - MIN_RADIUS) / Math.max(1, buckets.length - 1);
        return function(bucketIndex) {
          return MIN_RADIUS + (increment * bucketIndex);
        };
      })();
      return _.map(buckets, function(bucket, i) {
        return _.defaults({
          radius: radius(i)
        }, bucket);
      });
    }

    function generateMapnikSQL(geoTable, regionAttribute, regionCodes) {
      var sqlTemplate = _.template(
        "SELECT <%=attr%>, \
          ST_Centroid(the_geom) as the_geom, \
          ST_Transform(ST_Centroid(the_geom), 3857) as the_geom_webmercator \
        FROM <%=table%> \
        WHERE <%=attr%> IN (<%=valueList%>)"
        .replace(/ +/g, " ")
      );
      return sqlTemplate({
        table: geoTable,
        attr: regionAttribute,
        valueList: regionCodes.map(singleQuote).join(",")
      })
    }

    function generateCartoCSS(geoTable, regionAttribute, regionCodes, radiusF) {
      var baseStyle =
        '#' + geoTable + ' {' +
        ' marker-fill-opacity: 0.70;' +
        ' marker-line-color: #FFF;' +
        ' marker-line-width: 1.5;' +
        ' marker-line-opacity: 1;' +
        ' marker-placement: point;' +
        ' marker-multi-policy: largest;' +
        ' marker-type: ellipse;' +
        ' marker-fill: #3E7BB6;' +
        ' marker-allow-overlap: true;' +
        ' marker-clip: false; ' +
        '}';
      var regionStyleTemplate = _.template(
        '#<%=table%> [<%=attr%>="<%=value%>"] { marker-width: <%=radius%>; }'
      );
      var regionStyles = _.chain(regionCodes)
        .map(function(regionCode) {
          return {
            table: geoTable,
            attr: regionAttribute,
            value: regionCode,
            radius: radiusF(regionCode)
          };
        })
        // Filter out missing values
        .filter(_.flow(_.values, _.partial(_.every, _, function(v) {
          return _.isString(v) || _.isNumber(v);
        })))
        // Apply template
        .map(regionStyleTemplate)
        .value();
      return [baseStyle].concat(regionStyles).join(" ");
    }

    function singleQuote(str) {
      return "'" + str + "'"
    }
  });
