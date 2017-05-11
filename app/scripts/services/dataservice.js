'use strict';

/**
 * @ngdoc service
 * @name midjaApp.dataService
 * @description
 * # dataService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('dataService', function($http, $q, metadataService, labelService) {

    return {
      getBuckets: getBuckets,
      getQuantileBuckets: getQuantileBuckets,
      getIlocLocationsStartingWith: getIlocPlacesStartingWith,
      getLgaLocationsStartingWith: getLgaPlacesStartingWith,
      getLocsInPlaces: getLocsInPlaces,
      getGeoData: getGeoData,
      getTopicData: getTopicData,
      doQuery: doQuery,
      mysqlRealEscapeString: mysqlRealEscapeString
    };

    /**
     * Get All Locations for  Place
     * @param places            Array of places (if empty, all of australia is used)
     * @param remotenessLevel   Very Remote etc
     * @returns {*}
     */
    function getLocsInPlaces(places, dataset, placetype, remotenessLevel) {

      var sql = 'SELECT DISTINCT ' + placetype + '_name, ' + placetype +
        '_code FROM ' + dataset + ' ';
      _.forEach(places, function(place, index) {
        if (index === 0) {
          sql += ' WHERE '
        } else {
          sql += ' OR '
        }
        sql += place.type + '_name = \'' + mysqlRealEscapeString(place.name) +
          '\' ';
      });

      if (remotenessLevel && remotenessLevel !== 'all') {
        if (places.length === 0) {
          sql += ' WHERE '
        } else {
          sql += ' AND '
        }
        sql += ' ra_name = \'' + remotenessLevel + '\'';
      }
      sql += ';';
      return doQuery(sql);
    }

    function mysqlRealEscapeString(str) {
      return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
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
            return "\\" + char; // prepends a backslash to backslash, percent,
            // and double/single quotes
        }
      });
    }

    function getIlocPlacesStartingWith(name) {
      // get all iloc names from server somehow
      var iLocSql = 'SELECT iloc_code, iloc_name  FROM iloc_merged_dataset ' +
        'WHERE iloc_name ILIKE \'' + mysqlRealEscapeString(name) + '%\';';

      var iRegSql =
        'SELECT DISTINCT ireg_code, ireg_name FROM iloc_merged_dataset ' +
        'WHERE ireg_name ILIKE \'' + mysqlRealEscapeString(name) + '%\';';

      var iAreSql =
        'SELECT DISTINCT iare_code, iare_name FROM iloc_merged_dataset ' +
        'WHERE iare_name ILIKE \'' + mysqlRealEscapeString(name) + '%\';';

      var stateSql =
        'SELECT DISTINCT state_code, state_name FROM iloc_merged_dataset ' +
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

        var places = _.sortBy(ilocs.concat(iregs).concat(iares).concat(
          states), function(place) {
          return place.name.length;
        });
        return places;
      });
    }

    function getLgaPlacesStartingWith(name, block) {
      // get all lga names from server somehow

      var LGASql = 'SELECT lga_code, lga_name FROM lga_565_iba_final ' +
        'WHERE lga_name ILIKE \'' + mysqlRealEscapeString(name) + '%\';';

      var stateSql =
        'SELECT DISTINCT state_code, state_name FROM lga_565_iba_final ' +
        'WHERE state_name ILIKE \'' + mysqlRealEscapeString(name) + '%\';';
      var promises = [
        doQuery(LGASql),
        doQuery(stateSql)
      ];
      return $q.all(promises).then(function(queries) {

        var lgas = _.map(queries[0].rows, function(lga) {
          return {
            type: 'lga',
            name: lga.lga_name,
            code: lga.lga_code
          }
        });

        var states = _.map(queries[1].rows, function(state) {
          return {
            type: 'state',
            name: state.state_name,
            code: state.state_code
          }
        });

        var places = _.sortBy(lgas.concat(states), function(place) {
          return place.name.length;
        });
        return places;
      });
    }

    function getBuckets(column, sql, numberOfBuckets) {
      numberOfBuckets = numberOfBuckets || 7;

      var sql = 'select unnest(cartodb.CDB_QuantileBins(array_agg(distinct((' +
        column.name + '::numeric))), ' +
        numberOfBuckets + ')) as buckets from (' + sql +
        ') _table_sql where ' + column.name + ' is not null';

      return doQuery(sql).then(function(results) {
        var values = _.pluck(results.rows, 'buckets').reverse();
        return values;
      });
    }

    function getGeoData(dataset, attributes, locations) {
      return metadataService.getDataset(dataset).then(function(metadata) {
        var table = metadata.geolevel + "_2011_aust";
        var regionColumn = metadata.region_column;
        var columns = [regionColumn].concat(attributes);

        var sql = [
          'SELECT ' + columns.join(', '),
          'FROM ' + table,
          'WHERE ' + sqlCondition(regionColumn, locations)
        ].join(" ");
        return doQuery(sql).then(function(result) {
          return _.zipObject(
            _.map(result.rows, _.property(regionColumn)),
            result.rows
          );
        });
      });
    }

    function getTopicData(dataset, attributes, locations) {
      return metadataService.getDataset(dataset).then(function(metadata) {
        if (!metadata) {
          console.log('Dataset "' + dataset + '" not found!');
          return {};
        }
        var table = metadata.name;
        var regionColumn = metadata.region_column;
        var availableAttributes =
          _.map(metadata.attributes, _.property('name')).concat([
            'ra_name'
          ]);
        var columns = [regionColumn].concat(
          _.intersection(availableAttributes, attributes));

        var sql = [
          'SELECT ' + columns.join(', '),
          'FROM ' + table,
          'WHERE ' + sqlCondition(regionColumn, locations)
        ].join(" ");
        return doQuery(sql).then(function(result) {
          return _.zipObject(
            _.map(result.rows, _.property(regionColumn)),
            result.rows
          );
        });
      });
    }

    function sqlCondition(regionColumn, locations) {
      if (!locations) {
        return regionColumn + "IS NOT NULL";
      }
      var regions = _.uniq(_.map(
        locations,
        _.isObject(_.first(locations)) ?
          _.property(regionColumn) :
          _.identity));
      return regionColumn +
        ' IN (' +
        regions.map(function(region) {
          return "'" + region + "'";
        }).join(",") +
        ')';
    }

    function getQuantileBuckets(values, numberOfBuckets) {
      var breakPoints = _.map(_.range(0, numberOfBuckets + 1), function(i) {
        var quantile = 1.0 / numberOfBuckets * i;
        return ss.quantile(values, quantile);
      });
      return _.map(_.range(0, numberOfBuckets), function(i) {
        return {
          min: breakPoints[i],
          max: breakPoints[i + 1]
        };
      })
    }

    function doQuery(sql) {
      return $http
        .get("/sql/?q=" + encodeURI(sql))
        .then(function(result) {
          return result.data;
        });
    }
  });
