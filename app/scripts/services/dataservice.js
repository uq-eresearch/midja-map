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
            getBuckets: getBuckets
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

        function getBuckets(column, sql, numberOfBuckets) {
            numberOfBuckets = numberOfBuckets || 7;

            var bucketSql = 'select unnest(CDB_QuantileBins(array_agg(distinct((' + column.name + '::numeric))), ' +
                numberOfBuckets + ')) as buckets from (' + sql + ') _table_sql where ' + column.name + ' is not null';
            var query = new cartodb.SQL({
                user: 'midja',
                host: 'portal.midja.org:8080',
                api_key: 'da4921d7f2b99244897b313a75f0bd977c775a5e',
                extra_params: {
                    map_key: 'da4921d7f2b99244897b313a75f0bd977c775a5e'
                }
            });
            var deferred = $q.defer();

            query.execute(bucketSql).done(function(results) {
                var values = _.pluck(results.rows, 'buckets').reverse();
                deferred.resolve(values);
            }).error(function() {
                deferred.reject();
            });
            return deferred.promise;

            //query.execute(sql)
            //    .done(function(data) {
            //        console.log(data.rows);
            //    })
            //    .error(function(errors) {
            //        // errors contains a list of errors
            //        console.log("errors:" + errors);
            //    });

            //var url = 'http://midja.portal.midja.org:8080/api/v1/sql';
            //return $http.post(url, {
            //    q:
            //    api_key: cartoDbApiKey
            //}).then(getBucketsComplete);
            //
            //function getBucketsComplete(response) {
            //    return _.pluck(response.data.rows, 'buckets').reverse();
            //}
        }
    });
