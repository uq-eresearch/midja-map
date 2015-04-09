'use strict';

/**
 * @ngdoc service
 * @name midjaApp.labelService
 * @description
 * # labelService
 * Factory in the midjaApp.
 */
angular.module('midjaApp')
    .factory('labelService', function () {

        return {
            getLabelFromCartoDbName: getLabelFromCartoDbName
        };

        function getLabelFromCartoDbName(name) {
            var parts = name.split('_');
            parts = _.map(parts, function(part) {
                if(part === 'm') {
                    return 'male';
                }
                if(part === 'f') {
                    return 'female';
                }
                if(part === 'percent') {
                    return '%';
                }
                if(part === 't') {
                    return 'total';
                }
                return part;
            })
            return parts.join(' ');
        }
    });
