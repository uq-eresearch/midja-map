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
            getLocationsStartingWith: getPlacesStartingWith,
            getIlocsInPlaces: getIlocsInPlaces,
            doQuery: doQuery,
            mysqlRealEscapeString: mysqlRealEscapeString
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

        /**
         * Get All Ilocs for  Place
         * @param places            Array of places (if empty, all of australia is used)
         * @param remotenessLevel   Very Remote etc
         * @returns {*}
         */
        function getIlocsInPlaces(places, remotenessLevel) {

            var sql = 'SELECT DISTINCT iloc_name, iloc_code FROM iloc_merged_dataset ';

            _.forEach(places, function(place, index) {
                if(index === 0) {
                    sql += ' WHERE '
                } else {
                    sql += ' OR '
                }
                sql += place.type + '_name = \'' + mysqlRealEscapeString(place.name) + '\' ';
            });

            if(remotenessLevel && remotenessLevel !== 'all') {
                if(places.length === 0) {
                    sql += ' WHERE '
                } else {
                    sql += ' AND '
                }
                sql += ' ra_name = \'' + remotenessLevel + '\'';
            }
            sql += ';';

            return doQuery(sql);
        }

        function mysqlRealEscapeString (str) {
            return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
                switch (char) {
                    case "\0":
                        return "\\0";
                    case "\x08":
                        return "\\b";
                    case "\x09":
                        return "\\t";
                    case "\x1a":
                        return "\\z";
                    case "\n":
                        return "\\n";
                    case "\r":
                        return "\\r";
                    case "\"":
                    case "'":
                    case "\\":
                    case "%":
                        return "\\"+char; // prepends a backslash to backslash, percent,
                                          // and double/single quotes
                }
            });
        }



        function getPlacesStartingWith(name) {
            // get all iloc names from server somehow
            var iLocSql = 'SELECT iloc_code, iloc_name  FROM iloc_merged_dataset ' +
                'WHERE iloc_name ILIKE \'' + mysqlRealEscapeString(name) + '%\';';

            var iRegSql = 'SELECT DISTINCT ireg_code, ireg_name FROM iloc_merged_dataset ' +
                'WHERE ireg_name ILIKE \'' + mysqlRealEscapeString(name) + '%\';';

            var iAreSql = 'SELECT DISTINCT iare_code, iare_name FROM iloc_merged_dataset ' +
                'WHERE iare_name ILIKE \'' + mysqlRealEscapeString(name) + '%\';';

            var stateSql = 'SELECT DISTINCT state_code, state_name FROM iloc_merged_dataset ' +
                'WHERE state_name ILIKE \'' + mysqlRealEscapeString(name) + '%\';';

            var promises = [
                doQuery(iLocSql),
                doQuery(iRegSql),
                doQuery(iAreSql),
                doQuery(stateSql)
            ];
            return $q.all(promises).then(function(queries) {

                var ilocs = _.map(queries[0].rows, function(iloc) {
                    return {
                        type: 'iloc',
                        name: iloc.iloc_name,
                        code: iloc.iloc_code
                    }
                });

                var iregs = _.map(queries[1].rows, function(ireg) {
                    return {
                        type: 'ireg',
                        name: ireg.ireg_name,
                        code: ireg.ireg_code
                    }
                });

                var iares = _.map(queries[2].rows, function(iare) {
                    return {
                        type: 'iare',
                        name: iare.iare_name,
                        code: iare.iare_code
                    }
                });

                var states = _.map(queries[3].rows, function(state) {
                    return {
                        type: 'state',
                        name: state.state_name,
                        code: state.state_code
                    }
                });

                var places = _.sortBy(ilocs.concat(iregs).concat(iares).concat(states), function(place) {
                    return place.name.length;
                });
                return places;
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
