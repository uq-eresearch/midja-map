'use strict';

/**
 * @ngdoc service
 * @name midjaApp.bubbleLayerDefinitionService
 * @description
 * # bubbleLayerDefinitionService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('bubbleLayerDefinitionService', function(dataService, tableService) {

    return {
      build: build,
      generateSql: generateSql,
      generateCss: generateCss
    };

    function BubbleLayerDefinition(sql, cartocss, table, column) {
      this.type = 'bubble';
      this.sql = sql;
      this.cartocss = cartocss;
      this.interactivity = [column.name, tableService.getTablePrefix(table) +
        '_name'
      ];
    }

    function build(table, column, locations) {
      var sql = generateSql(table, column, locations);
      return dataService.getTopicData(table.name, [column.name], locations)
        .then(function(data) {
          var series = _.map(_.values(data), _.property(column.name));
          return dataService.getQuantileBuckets(series, 4);
        })
        .then(function(buckets) {
          var cartoCss = generateCss(buckets, table, column);
          return new BubbleLayerDefinition(sql, cartoCss, table, column);
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
        'SELECT ' + boundaryTableName + '.' + idColumn + ', ' +
        boundaryTableName + '.' + tablePrefix + '_name' +
        ', ST_Transform(ST_Centroid(' + boundaryTableName +
        '.the_geom), 3857) as the_geom_webmercator' +
        ', ST_Centroid(' + boundaryTableName + '.the_geom) as the_geom, ' +
        table.name + '.' + column.name + ' ' +
        'FROM ' + table.name + ', ' + boundaryTableName + ' ' +
        'WHERE ' + boundaryTableName + '.' + tablePrefix + '_code IN (' +
        unitNames + ') ' +
        'AND ' + boundaryTableName + '.' + idColumn + ' = ' + table.name +
        '.' + idColumn;
      return sql;
    }

    function generateCss(buckets, table, column) {

      var MAX_RADIUS = 31;
      var MIN_RADIUS = 5;

      var cartoCss = '#' + table.name + ' {' +
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
        '} ';

      var radiusIncrements = (MAX_RADIUS - MIN_RADIUS) / (buckets.length - 1);
      cartoCss += _.map(
        buckets.reverse(),
        function(bucket, index) {
          return '#' + table.name + ' [' + column.name + ' <= ' + bucket.max +
            '] {' +
            ' marker-width: ' + Math.round(MAX_RADIUS - (index *
              radiusIncrements)) +
            '; ' +
            '}';
        }).join(' ');

      return cartoCss;
    }
  });
