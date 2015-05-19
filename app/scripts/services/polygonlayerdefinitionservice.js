'use strict';

/**
 * @ngdoc service
 * @name midjaApp.polygonLayerDefinitionService
 * @description
 * # polygonLayerDefinitionService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
    .factory('polygonLayerDefinitionService', function (dataService, tableService) {

        var colors = [
            //'FFFFB2',
            'B10026',
            'E31A1C',
            'FC4E2A',
            'FD8D3C',
            'FEB24C',
            'FED976',
            'FFFFB2'
        ];

        // Public API here
        return {
            build: build,
            generateSql: generateSql,
            generateCss: generateCss
        };

        function PolygonLayerDefinition(sql, cartocss, table, column) {
            this.type = 'bubble';
            this.sql = sql;
            this.cartocss = cartocss;
            this.interactivity = [column.name, tableService.getTablePrefix(table) + '_name'];
        }

        function build(table, column) {
            var sql = generateSql(table, column);
            return dataService.getBuckets(column, sql, 7).then(getBucketsComplete);

            function getBucketsComplete(buckets) {
                var cartoCss = generateCss(buckets, table, column);

                return new PolygonLayerDefinition(sql, cartoCss, table, column);
            }
        }

        /**
         * Generate table SQL for table and column
         * @param table
         * @param column
         * @returns {string}
         */
        function generateSql(table, column) {
            var tablePrefix = tableService.getTablePrefix(table);
            var idColumn = tableService.getIdColumnForTable(table);

            var sql =
                'SELECT ' + tablePrefix + '_2011_aust.*, ' + table.name + '.' + column.name + ' ' +
                'FROM ' + table.name + ', ' + tablePrefix + '_2011_aust ' +
                'WHERE ' + tablePrefix + '_2011_aust.' + idColumn + ' = ' + table.name + '.' + idColumn;
            return sql;
        }

        /**
         * Generates Cartocss for bucket values
         *
         * @param buckets 7 bucket values
         * @param table
         * @param column
         * @returns {string}
         */
        function generateCss(values, table, column) {
            var cartoCss = '#' + table.name + ' {' +
                ' polygon-fill: #FFFFB2;' +
                ' polygon-opacity: 0.8;' +
                ' line-color: #67717E;' +
                ' line-width: 1;' +
                ' line-opacity: 1; ' +
                '} ';

            // Sort desc
            values = values.sort(function (a, b) {
                return b - a;
            });

            cartoCss += _.map(values, function (value, index) {
                return '#' + table.name + ' [' + column.name + ' <= ' + value + '] {' +
                    ' polygon-fill: #' + colors[index] + ';' +
                    '} ';
            }).join(' ');
            return cartoCss;
        }
    });
