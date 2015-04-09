'use strict';

/**
 * @ngdoc service
 * @name midjaApp.mapService
 * @description
 * # mapService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
    .factory('mapService', function (dataService, tableService) {

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


        return {
            generateLayerDefinition: generateLayerDefinition,
            generateSql: generateSql,
            generateRegionCss: generateRegionCss,
            generateBubbleCss: generateBubbleCss
        };

        ////


        /**
         * Generate a layer definition for a table, and column
         *
         * Uses Quantile for the CSS and 7 buckets
         *
         * @param table
         * @param column
         * @return {Promise}
         */
        function generateLayerDefinition(table, column, type) {
            var sql = generateSql(table, column);

            if (type === 'region') {
                return dataService.getBuckets(column, sql, 7).then(getBucketsComplete);
            } else if (type === 'bubble') {
                return dataService.getBuckets(column, sql, 10).then(getBucketsComplete);
            } else {
                throw new Error('Bad type');
            }

            function getBucketsComplete(buckets) {
                var cartoCss = '';
                if (type === 'region') {
                    cartoCss = generateRegionCss(buckets, table, column);
                } else if (type === 'bubble') {
                    cartoCss = generateBubbleCss(buckets, table, column);
                } else {
                    throw new Error('Bad type');
                }

                return {
                    sql: sql,
                    cartocss: cartoCss
                };
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
        function generateRegionCss(values, table, column) {
            var cartoCss = '#' + table.name + ' {' +
                ' polygon-fill: #FFFFB2;' +
                ' polygon-opacity: 0.8;' +
                ' line-color: #FFF;' +
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

        function generateBubbleCss(values, table, column) {

            var MAX_RADIUS = 31;
            var MIN_RADIUS = 1;

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
