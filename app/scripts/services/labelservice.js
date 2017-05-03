'use strict';

/**
 * @ngdoc service
 * @name midjaApp.labelService
 * @description
 * # labelService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('labelService', function(metadataService) {
    var pLabels = metadataService.getDatasets().then(function(datasets) {
      var labels = {};
      for (var k in datasets) {
        while (datasets[k].attributes.length > 0) {
          var attr = datasets[k].attributes.pop();
          labels[attr["name"]] = attr["short_desc"];
        }
      }
      return labels;
    });

    function labelService$getResolver() {
      return pLabels.then(function(labels) {
        return function(name) {
          return labels[name];
        }
      });
    }

    return {
      getResolver: labelService$getResolver
    };
  });
