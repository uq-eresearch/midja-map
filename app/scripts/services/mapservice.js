'use strict';

/**
 * @ngdoc service
 * @name midjaApp.mapService
 * @description
 * # mapService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
    .factory('mapService', function (labelService) {

        return {
            transformFeatureData: transformFeatureData
        };


        function transformFeatureData(data) {
            // now transform it

            var newData = {};
            // okay lets get the data into something useful
            for(var key in data) {
                if(key === '$$hashKey') {
                    continue;
                }
                if(key.indexOf('_name') >= 0) {
                    newData.level_name = data[key];
                } else {
                    newData.column = key;
                    newData.label = labelService.getLabelFromCartoDbName(newData.column);
                    newData.value = data[key];
                }
            }

            return newData;
        }


    });
