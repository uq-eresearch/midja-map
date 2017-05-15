'use strict';

/**
 * @ngdoc service
 * @name midjaApp.labelService
 * @description
 * # labelService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('labelService', function(dataService) {

    function labelService$getResolver(regionType) {
      return dataService.getAvailableAttributes(regionType)
        .then(function(attributes) {
          return _.zipObject(
            _.map(attributes, _.property('name')),
            _.map(attributes, _.property('description')));
        })
        .then(_.propertyOf);
    }

    return {
      getResolver: _.memoize(labelService$getResolver)
    };
  });
