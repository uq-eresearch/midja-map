'use strict';

/**
 * @ngdoc service
 * @name midjaApp.tableService
 * @description
 * # tableService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('tableService', function() {
    return {
      getTablePrefix: getTablePrefix,
      getIdColumnForTable: getIdColumnForTable
    };


    function getTablePrefix(table) {
      var parts = table.name.split('_');

      var tablePrefix = parts[0];
      return tablePrefix;
    }

    function getIdColumnForTable(table) {
      var idColumn = '';
      var tablePrefix = getTablePrefix(table);

      if (tablePrefix === 'ste') {
        idColumn = 'state_code';
      } else {
        idColumn = tablePrefix + '_code';
      }
      return idColumn;
    }
  });
