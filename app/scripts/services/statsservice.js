'use strict';

/**
 * @ngdoc service
 * @name midjaApp.statsService
 * @description
 * # tableService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('statsService', function($http) {
    var service = {};

    service.linearRegression = function statsService$linearRegression(data) {
      return $http.post('/stats/', data).then(function(response) {
        return response.data;
      });
    };

    return service;
  });
