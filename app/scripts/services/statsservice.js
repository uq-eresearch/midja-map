'use strict';

/**
 * @ngdoc service
 * @name midjaApp.statsService
 * @description
 * # tableService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('statsService', function($http, dataService) {
    var service = {};

    service.localLinearRegression = function(data) {
      return dataService.getTopicData(
        data.dataset, [data.depVar].concat(data.indepVars),
        data.unit_codes
      ).then(function(topicData) {
        var regression = new SMR.Regression({
          numX: data.indepVars.length,
          numY: 1
        });
        for (var k in topicData) {
          var dataPoint = {
            x: _.map(data.indepVars, _.propertyOf(topicData[k])),
            y: [topicData[k][data.depVar]]
          };
          regression.push(dataPoint);
        }
        var coeffs = regression.calculateCoefficients();
        console.log(
          coeffs);
      });
    };

    service.linearRegression = function statsService$linearRegression(
      data) {
      console.log(data);
      service.localLinearRegression(data);
      return $http.post('/stats/', data).then(function(response) {
        console.log(response);
        return response.data;
      });
    };

    return service;
  });
