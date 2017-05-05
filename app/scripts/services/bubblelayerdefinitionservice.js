'use strict';

/**
 * @ngdoc service
 * @name midjaApp.bubbleLayerDefinitionService
 * @description
 * # bubbleLayerDefinitionService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('bubbleLayerDefinitionService', function($q, metadataService,
    dataService, tableService) {

    return {
      build: build
    };

    function BubbleLayerDefinition(sql, cartocss, table, allRegionData) {
      var regionCodeAttribute = tableService.getTablePrefix(table) + '_code';
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

    function build(table, column, locations) {
      return $q.all({
        buckets: getBuckets(table, column, locations),
        metadata: metadataService.getDataset(table.name),
        data: dataService.getTopicData(table.name, [column.name],
          locations)
      }).then(function(data) {
        var geoTable = data.metadata.geolevel + "_2011_aust";
        var regionAttribute = data.metadata.region_column;
        var regions = _.uniq(_.pluck(locations, regionAttribute)).sort();
        var radiusF = function(region) {
          var v = data.data[region][column.name];
          // Get radius using bucket ranges (min: inclusive, max: exclusive)
          // Last bucket max == max series value, so last bucket if no match.
          return _.first(
            _.filter(data.buckets, function(bucket) {
              return v >= bucket.min && v < bucket.max;
            }).concat([_.last(data.buckets)])
          ).radius;
        };
        var sql = generateMapnikSQL(geoTable, regionAttribute, regions);
        var style = generateCartoCSS(
          geoTable, regionAttribute, regions, radiusF);
        return new BubbleLayerDefinition(sql, style, table, data.data);
      });
    }

    function getBuckets(table, column, locations) {
      return getSeries(table, column, locations).then(generateBuckets);
    }

    function getSeries(table, column, locations) {
      return dataService.getTopicData(table.name, [column.name], locations)
        .then(function(topicData) {
          return _.map(_.values(topicData), _.property(column.name));
        });
    }

    function generateBuckets(series) {
      var buckets = _.first(
        _(_.range(5, 0, -1))
        .map(function(n) {
          return dataService.getQuantileBuckets(series, n);
        })
        .filter(function(buckets) {
          return _.every(buckets, function(bucket) {
            return bucket.min != bucket.max;
          });
        })
        .value()
      );
      var radius = (function() {
        var MAX_RADIUS = 31;
        var MIN_RADIUS = 5;
        var increment = (MAX_RADIUS - MIN_RADIUS) / (buckets.length - 1);
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

    function generateMapnikSQL(geoTable, regionAttribute, regionValues) {
      var sqlTemplate = _.template(
        "SELECT <%=attr%>, \
          ST_Centroid(the_geom) as the_geom, \
          ST_Transform(ST_Centroid(the_geom), 3857) as the_geom_webmercator \
        FROM <%=table%> \
        WHERE <%=attr%> IN (<%=valueList%>)"
      );
      return sqlTemplate({
        table: geoTable,
        attr: regionAttribute,
        valueList: regionValues.map(singleQuote).join(",")
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
      var regionStyles = _.map(regionCodes, function(regionCode) {
        return regionStyleTemplate({
          table: geoTable,
          attr: regionAttribute,
          value: regionCode,
          radius: radiusF(regionCode)
        })
      });
      return [baseStyle].concat(regionStyles).join(" ");
    }

    function singleQuote(str) {
      return "'" + str + "'"
    }
  });
