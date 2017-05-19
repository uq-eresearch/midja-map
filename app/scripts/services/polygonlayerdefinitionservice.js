'use strict';

/**
 * @ngdoc service
 * @name midjaApp.polygonLayerDefinitionService
 * @description
 * # polygonLayerDefinitionService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('polygonLayerDefinitionService', function($q, dataService) {

    // see https://google.github.io/palette.js/
    var colorPaletteName = "cb-YlOrRd";

    // Public API here
    return {
      _generateMapnikSQL: generateMapnikSQL,
      _generateCartoCSS: generateCartoCSS,
      build: build,
      buildEmpty: buildEmpty
    };

    function PolygonLayerDefinition(regionType, sql, style, allRegionData,
      buckets) {
      var regionCodeAttribute = 'region_code';
      var regionNameAttribute = regionType + '_name';
      this.regionType = regionType;
      this.sql = sql;
      this.cartocss = style;
      this.interactivity = [
        regionCodeAttribute,
        regionNameAttribute
      ];
      this.getRegionData = function(interactiveData) {
        var regionCode = interactiveData['region_code'];
        return allRegionData[regionCode] || interactiveData;
      };
      if (!_.isEmpty(buckets)) {
        this.getLegend = function() {
          var div = L.DomUtil.create('div', 'legend');
          var ul = L.DomUtil.create('ul', '', div);
          buckets.forEach(function(bucket) {
            var li = L.DomUtil.create('li', '', ul);
            var bullet = L.DomUtil.create('div', 'bullet', li);
            bullet.style = "background: #" + bucket.color;
            var text = L.DomUtil.create('span', '', li);
            text.innerHTML = _.map(
              [bucket.min, bucket.max],
              dataService.formatNumber
            ).join(" - ");
          });
          return div;
        };
      }
    }

    function buildEmpty(regionType, locations) {
      return $q(function(resolve) {
        var geoTable = regionType + "_2011_aust";
        var regionAttribute = regionType + '_code';
        var regions = _.uniq(_.map(locations, _.property('code'))).sort();
        var sql = generateMapnikSQL(geoTable, regionAttribute, regions);
        var style = generateCartoCSS(geoTable, "", [], _.identity);
        resolve(new PolygonLayerDefinition(regionType, sql, style, {}, []));
      });
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
        var regions = _.uniq(_.pluck(locations, 'code')).sort();
        var colorF = function(region) {
          var v = data[region][attribute.name];
          // Get color using bucket ranges (min: inclusive, max: inclusive)
          // This should cover all valid values, so null if no match.
          return _.chain(buckets)
            .filter(function(bucket) {
              return v >= bucket.min && v <= bucket.max;
            })
            .map(_.property('color'))
            .first()
            .value();
        };
        var sql = generateMapnikSQL(geoTable, regionAttribute, regions);
        var style = generateCartoCSS(
          geoTable, regionAttribute, regions, colorF);
        return new PolygonLayerDefinition(regionType, sql, style, data,
          buckets);
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
          return _.uniq(buckets, _.property('min')).length == buckets.length;
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
        ' polygon-fill: #ffffff;' +
        ' polygon-opacity: 0.70;' +
        ' line-color: #000000;' +
        ' line-width: 1;' +
        ' line-opacity: 1; ' +
        '}';
      var regionStyleTemplate = _.template(
        '#<%=table%> [<%=attr%>="<%=value%>"] { polygon-fill: #<%=color%>; }'
      );
      var regionStyles = _.chain(regionCodes)
        .map(function(regionCode) {
          return {
            table: geoTable,
            attr: regionAttribute,
            value: regionCode,
            color: colorF(regionCode)
          };
        })
        // Filter out missing values
        .filter(_.flow(_.values, _.partial(_.every, _, _.isString)))
        // Apply template
        .map(regionStyleTemplate)
        .value();
      return [baseStyle].concat(regionStyles).join(" ");
    }

    function singleQuote(str) {
      return "'" + str + "'"
    }

  });
