'use strict';

/**
 * @ngdoc service
 * @name midjaApp.metadataService
 * @description
 * # metadataService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
  .factory('metadataService', function($q, $http) {
    var datasets = [
      'iloc_merged_dataset',
      'lga_565_iba_final'
    ];
    var obj = {};
    obj._datasetMetadata = null;

    function fetchMetadata(dataset) {
      return $http
        .get('/metadata/' + dataset + '.json')
        .then(function(response) {
          return response.data;
        });
    }

    obj.getDatasets = function metadataService$getDatasets() {
      if (obj._datasetMetadata) {
        return $q(function(resolve) {
          resolve(obj._datasetMetadata);
        });
      }
      var datasetPromises = datasets.reduce(function(m, v) {
        m[v] = fetchMetadata(v);
        return m;
      }, {});
      return $q.all(datasetPromises).then(function(result) {
        obj._datasetMetadata = result;
        return obj._datasetMetadata;
      });
    }

    obj.getDataset = function(name) {
      return obj.getDatasets().then(function(datasets) {
        return datasets[name];
      });
    }

    return obj;
  });
