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

    function labelService$getResolver(regionType) {
      return metadataService.getDataset(regionType)
        .then(_.property('attributes'))
        .then(function(attributes) {
          return _.zipObject(
            _.map(attributes, _.property('name')),
            _.map(attributes, _.property('short_desc')));
        })
        .then(function(v) { console.log(v); return v; })
        .then(_.propertyOf);
    }

    return {
      getResolver: _.memoize(labelService$getResolver)
    };
  });
