'use strict';

/**
 * @ngdoc service
 * @name midjaApp.bubbleLayerDefinitionService
 * @description
 * # bubbleLayerDefinitionService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
    .factory('bubbleLayerDefinitionService', function (dataService, tableService) {

        return {
            build: build,
            generateSql: generateSql,
            generateCss: generateCss
        };

        function BubbleLayerDefinition(sql, cartocss, table, column) {
            this.type = 'bubble';
            this.sql = sql;
            this.cartocss = cartocss;
            this.interactivity = [column.name, tableService.getTablePrefix(table) + '_name'];
        }

        function build(table, column, locations) {
            var sql = generateSql(table, column, locations);
            return dataService.getBuckets(column, sql, 3).then(getBucketsComplete);

            function getBucketsComplete(buckets) {
                var cartocss = generateCss(buckets, table, column);

                return new BubbleLayerDefinition(sql, cartocss, table, column);
            }
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

            var unitNames = '\'' + _.pluck(locations, tablePrefix+'_code').join('\' ,\'') + '\'';

            var sql =
                'SELECT ' + boundaryTableName + '.' + idColumn + ', ' + boundaryTableName + '.' + tablePrefix + '_name' +
                ', ST_Transform(ST_Centroid('+boundaryTableName+'.the_geom), 3857) as the_geom_webmercator' +
                ', ST_Centroid('+boundaryTableName+'.the_geom) as the_geom, ' + table.name + '.' + column.name + ' ' +
                'FROM ' + table.name + ', ' + boundaryTableName + ' ' +
                'WHERE ' + boundaryTableName +'.' + tablePrefix + '_code IN (' + unitNames + ') ' +
                'AND ' + boundaryTableName + '.' + idColumn + ' = ' + table.name + '.' + idColumn;
            return sql;
        }

        function generateCss(values, table, column) {

            var MAX_RADIUS = 31;
            var MIN_RADIUS = 5;

            // Sort desc
            values = values.sort(function (a, b) {
                return b - a;
            });

            var cartoCss = '#' + table.name + ' {' +
                ' marker-fill-opacity: 0.9;' +
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


            var radiusIncrements = (MAX_RADIUS - MIN_RADIUS) / (values.length - 1);
            cartoCss += _.map(values, function (value, index) {
                return '#' + table.name + ' [' + column.name + ' <= ' + value + '] {' +
                    ' marker-width: ' + (MAX_RADIUS - (index * radiusIncrements)) + '; ' +
                    '}';
            }).join(' ');

            return cartoCss;
        }
    });
