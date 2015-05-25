'use strict';

/**
 * @ngdoc service
 * @name midjaApp.dataService
 * @description
 * # dataService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
    .factory('dataService', function ($http, cartoDbApiKey, cartodb, $q, labelService) {

        return {
            getTables: getTables,
            getTableSchema: getTableSchema,
            getBuckets: getBuckets,
            getLocationsStartingWith: getLocationsStartingWith,
            doQuery: doQuery
        };

        /**
         * Get all the tables
         * @returns {*}
         */
        function getTables() {
            var tableUrl = 'http://midja.portal.midja.org/api/v1/viz/?tag_name=&q=&page=1&type=table&per_page=10000&tags=&order=updated_at&o%5Bupdated_at%5D=desc&api_key=' + cartoDbApiKey; // jshint ignore:line
            return $http.get(tableUrl).then(getTablesComplete);

            function getTablesComplete(response) {
                var tables = response.data.visualizations;
                return tables;
            }
        }

        function getTableSchema(table) {
            var tableName = table.name;
            return $http.get('http://midja.portal.midja.org/api/v1/tables/' + tableName + '?api_key=' + cartoDbApiKey)
                .then(getTableSchemaComplete);

            function getTableSchemaComplete(response) {
                var schema = response.data.schema;
                return schema;
            }
        }

        function getLocationsStartingWith(name) {
            // get all iloc names from server somehow
            var sql = 'SELECT iloc_code, iloc_name  FROM iloc_2011_aust WHERE iloc_name ILIKE \'' + name + '%\';';
            return doQuery(sql).then(function(results) {
                var values = results.rows;
                return values;
            });
        }

        function getBuckets(column, sql, numberOfBuckets) {
            numberOfBuckets = numberOfBuckets || 7;

            var sql = 'select unnest(CDB_QuantileBins(array_agg(distinct((' + column.name + '::numeric))), ' +
                numberOfBuckets + ')) as buckets from (' + sql + ') _table_sql where ' + column.name + ' is not null';

            return doQuery(sql).then(function(results) {
                var values = _.pluck(results.rows, 'buckets').reverse();
                return values;
            });
        }

        function doQuery(sql) {
            var query = new cartodb.SQL({
                user: 'midja',
                host: 'portal.midja.org:8080',
                api_key: 'da4921d7f2b99244897b313a75f0bd977c775a5e',
                extra_params: {
                    map_key: 'da4921d7f2b99244897b313a75f0bd977c775a5e'
                }
            });
            var deferred = $q.defer();

            query.execute(sql).done(function(results) {
                deferred.resolve(results);
            }).error(function() {
                deferred.reject();
            });
            return deferred.promise;
        }
    });
