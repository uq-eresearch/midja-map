'use strict';

/**
 * @ngdoc service
 * @name midjaApp.layerService
 * @description
 * # layerService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
    .factory('layerService', function ($injector) {

        return {
            generateLayerDefinition: generateLayerDefinition
        };

        ////


        /**
         * Generate a layer definition for a table, and column
         *
         * Uses Quantile for the CSS and 7 buckets
         *
         * @param table
         * @param column
         * @return {Promise}
         */
        function generateLayerDefinition(table, column, type) {
            var layerDefinitionService = $injector.get(type + 'LayerDefinitionService');
            return layerDefinitionService.build(table, column);
        }
    });
