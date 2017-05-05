'use strict';

/**
 * @ngdoc service
 * @name midjaApp.polygonLayerDefinitionService
 * @description
 * # polygonLayerDefinitionService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('polygonLayerDefinitionService', function(dataService, tableService) {

    // see https://google.github.io/palette.js/
    var colorPaletteName = "cb-YlOrBr";

    // Public API here
    return {
      build: build,
      getBuckets: getBuckets,
      generateSql: generateSql,
      generateCss: generateCss
    };

    function PolygonLayerDefinition(sql, cartocss, table, column) {
      this.type = 'bubble';
      this.sql = sql;
      this.cartocss = cartocss;
      this.interactivity = [column.name, tableService.getTablePrefix(table) +
        '_name'
      ];
    }

    function build(table, column, locations) {
      var sql = generateSql(table, column, locations);
      return getBuckets(table, column, locations)
        .then(function(buckets) {
          var cartoCss = generateCss(buckets, table, column);
          return new PolygonLayerDefinition(sql, cartoCss, table, column);
        });
    }

    function getBuckets(table, column, locations) {
      return dataService.getTopicData(table.name, [column.name], locations)
        .then(function(data) {
          var series = _.map(_.values(data), _.property(column.name));
          return _.first(
            _(_.range(5, 0, -1))
            .map(function(n) {
              return dataService.getQuantileBuckets(series, n);
            })
            .filter(function(buckets) {
              return _.every(buckets, function(bucket) {
                return bucket.min != bucket.max;
              });
            })
            .value());
        })
        .then(function(buckets) {
          var colors = palette(colorPaletteName, buckets.length);
          return _.map(buckets, function(bucket, i) {
            return _.defaults({
              color: colors[i]
            }, bucket);
          });
        });
    }

    /**
     * Generate table SQL for table and column
     * @param table
     * @param column
     * @returns {string}
     */
    function generateSql(table, column, locations) {
      var tablePrefix = tableService.getTablePrefix(table);
      var idColumn = tableService.getIdColumnForTable(table);

      var boundaryTableName = tablePrefix + '_2011_aust';

      var unitNames = '\'' + _.pluck(locations, tablePrefix + '_code').join(
        '\' ,\'') + '\'';

      var sql =
        'SELECT ' + boundaryTableName + '.*, ' + table.name + '.' + column.name +
        ' ' +
        'FROM ' + table.name + ', ' + tablePrefix + '_2011_aust ' +
        'WHERE ' + boundaryTableName + '.' + tablePrefix + '_code IN (' +
        unitNames + ') ' +
        'AND ' + tablePrefix + '_2011_aust.' + idColumn + ' = ' + table.name +
        '.' + idColumn;
      return sql;
    }

    /**
     * Generates Cartocss for bucket values
     *
     * @param buckets 4 bucket values
     * @param table
     * @param column
     * @returns {string}
     */
    function generateCss(buckets, table, column) {
      var cartoCss = '#' + table.name + ' {' +
        ' polygon-fill: #000000;' +
        ' polygon-opacity: 0.70;' +
        ' line-color: #000000;' +
        ' line-width: 1;' +
        ' line-opacity: 1; ' +
        '} ';

      cartoCss += _.map(buckets.reverse(), function(bucket, index) {
        return '#' + table.name + ' [' + column.name + ' <= ' + bucket.max +
          '] {' +
          ' polygon-fill: #' + bucket.color + ';' +
          '}';
      }).join(' ');
      return cartoCss;
    }
  });
