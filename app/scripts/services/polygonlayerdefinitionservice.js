'use strict';

/**
 * @ngdoc service
 * @name midjaApp.polygonLayerDefinitionService
 * @description
 * # polygonLayerDefinitionService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('polygonLayerDefinitionService', function($q, metadataService,
    dataService, tableService) {

    // see https://google.github.io/palette.js/
    var colorPaletteName = "cb-YlOrBr";

    // Public API here
    return {
      build: build,
      getBuckets: getBuckets
    };

    function PolygonLayerDefinition(sql, cartocss, table, allRegionData) {
      var regionCodeAttribute = tableService.getTablePrefix(table) + '_code';
      var regionNameAttribute = tableService.getTablePrefix(table) + '_name';
      this.sql = sql;
      this.cartocss = cartocss;
      this.interactivity = [
        regionCodeAttribute,
        regionNameAttribute
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
        var colorF = function(region) {
          var v = data.data[region][column.name];
          // Get color using bucket ranges (min: inclusive, max: exclusive)
          // Last bucket max == max series value, so last bucket if no match.
          return _.first(
            _.filter(data.buckets, function(bucket) {
              return v >= bucket.min && v < bucket.max;
            }).concat([_.last(data.buckets)])
          ).color;
        };
        var sql = generateMapnikSQL(geoTable, regionAttribute, regions);
        var style = generateCartoCSS(
          geoTable, regionAttribute, regions, colorF);
        return new PolygonLayerDefinition(sql, style, table, data.data);
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
      var colors = palette(colorPaletteName, buckets.length);
      return _.map(buckets, function(bucket, i) {
        return _.defaults({
          color: colors[i]
        }, bucket);
      });
    }

    function generateMapnikSQL(geoTable, regionAttribute, regionValues) {
      var sqlTemplate = _.template(
        "SELECT * FROM <%=table%> WHERE <%=attr%> IN (<%=valueList%>)"
      );
      return sqlTemplate({
        table: geoTable,
        attr: regionAttribute,
        valueList: regionValues.map(singleQuote).join(",")
      })
    }

    function generateCartoCSS(geoTable, regionAttribute, regionCodes, colorF) {
      var baseStyle =
        '#' + geoTable + ' {' +
        ' polygon-fill: #000000;' +
        ' polygon-opacity: 0.70;' +
        ' line-color: #000000;' +
        ' line-width: 1;' +
        ' line-opacity: 1; ' +
        '}';
      var regionStyleTemplate = _.template(
        '#<%=table%> [<%=attr%>="<%=value%>"] { polygon-fill: #<%=color%>; }'
      );
      var regionStyles = _.map(regionCodes, function(regionCode) {
        return regionStyleTemplate({
          table: geoTable,
          attr: regionAttribute,
          value: regionCode,
          color: colorF(regionCode)
        })
      });
      return [baseStyle].concat(regionStyles).join(" ");
    }

    function singleQuote(str) {
      return "'" + str + "'"
    }

  });
