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
      _generateMapnikSQL: generateMapnikSQL,
      _generateCartoCSS: generateCartoCSS,
      build: build
    };

    function PolygonLayerDefinition(sql, style, table, allRegionData, buckets) {
      var regionCodeAttribute = tableService.getTablePrefix(table) + '_code';
      var regionNameAttribute = tableService.getTablePrefix(table) + '_name';
      this.sql = sql;
      this.cartocss = style;
      this.interactivity = [
        regionCodeAttribute,
        regionNameAttribute
      ];
      this.getRegionData = function(interactiveData) {
        var regionCode = interactiveData[regionCodeAttribute];
        return allRegionData[regionCode];
      };
      this.getLegend = function() {
        var div = L.DomUtil.create('div', 'legend');
        var ul = L.DomUtil.create('ul', '', div);
        buckets.forEach(function(bucket) {
          var li = L.DomUtil.create('li', '', ul);
          var bullet = L.DomUtil.create('div', 'bullet', li);
          bullet.style = "background: #" + bucket.color;
          var text = L.DomUtil.create('span', '', li);
          text.innerHTML = bucket.min + " - " + bucket.max;
        });
        return div;
      };
    }

    function build(table, column, locations) {
      return $q.all({
        metadata: metadataService.getDataset(table.name),
        data: dataService.getTopicData(table.name, [column.name],
          locations)
      }).then(function(data) {
        var series = _.map(_.values(data.data), _.property(column.name));
        var buckets = generateBuckets(series)
        var geoTable = data.metadata.geolevel + "_2011_aust";
        var regionAttribute = data.metadata.region_column;
        var regions = _.uniq(_.pluck(locations, regionAttribute)).sort();
        var colorF = function(region) {
          var v = data.data[region][column.name];
          // Get color using bucket ranges (min: inclusive, max: exclusive)
          // Last bucket max == max series value, so last bucket if no match.
          return _.first(
            _.filter(buckets, function(bucket) {
              return v >= bucket.min && v < bucket.max;
            }).concat([_.last(buckets)])
          ).color;
        };
        var sql = generateMapnikSQL(geoTable, regionAttribute, regions);
        var style = generateCartoCSS(
          geoTable, regionAttribute, regions, colorF);
        return new PolygonLayerDefinition(sql, style, table, data.data,
          buckets);
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
