'use strict';

/**
 * @ngdoc service
 * @name midjaApp.mapService
 * @description
 * # mapService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('mapService', function() {

    function mapService$getFeatureTransformer(resolver) {
      return function mapService$transformFeatureData(data) {
        var newData = {};
        // okay lets get the data into something useful
        for (var key in data) {
          if (key === '$$hashKey') {
            continue;
          }
          if (key.indexOf('_name') >= 0) {
            newData.level_name = data[key];
          } else {
            newData.attribute = key;
            newData.label = resolver(newData.attribute);
            newData.value = data[key];
          }
        }
        return newData;
      };
    }


    return {
      getFeatureTransformer: mapService$getFeatureTransformer
    };

  });
