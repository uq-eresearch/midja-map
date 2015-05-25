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
            build: build
        };

        ////

        function build(type) {
            return $injector.get(type + 'LayerDefinitionService');
        }
    });
