'use strict';

/**
 * @ngdoc service
 * @name midjaApp.datasetService
 * @description
 * # datasetService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
    .factory('datasetService', function (dataService, labelService) {

        return {
            getDatasets: getDatasets,
            getColumns: getColumns
        };

        function getDatasets() {

            return dataService.getTables().then(function (tables) {

                var datasets = _.filter(tables, function (table) {
                    return (table.name.indexOf('iloc') === 0 ||
                    table.name.indexOf('ireg') === 0 ||
                    table.name.indexOf('iare') === 0 ||
                    table.name.indexOf('ste') === 0 ||
                    table.name.indexOf('lga') === 0);
                });
                _.each(datasets, function (dataset) {
                    dataset.label = labelService.getLabelFromCartoDbName(dataset.name);
                });
                return datasets;
            });
        }

        function getColumns(dataset) {
            var table = {
                name: dataset.name
            };
            return dataService.getTableSchema(table).then(function (schema) {
                var columns = _.map(schema, function(properties) {
                   return {
                       name: properties[0],
                       type: properties[1]
                   };
                });
                columns = _.reject(columns, function(column) {
                    return column.type !== 'number' || column.name === 'cartodb_id';
                });
                _.each(columns, function (column) {
                    column.label = labelService.getLabelFromCartoDbName(column.name);
                });
                return columns;
            });
        }
    });
