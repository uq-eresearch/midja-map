'use strict';

/**
 * @ngdoc service
 * @name midjaApp.formattingService
 * @description
 */
angular.module('midjaApp')
  .factory('formattingService', function($injector) {
    var service = {};

    service.formatNumber = function formattingService$formatNumber(n, fmt) {
      if (_.isFinite(n)) {
        return numeral(n).format(fmt || '0,0[.]00');
      } else if (_.isUndefined(n) || _.isNull(n)) {
        return '\u2014';
      } else {
        switch (n) {
          case Number.POSITIVE_INFINITY:  return '\u221E';
          case Number.NEGATIVE_INFINITY:  return '-\u221E';
          default:
            return n+'';
        }
      }
    };

    return service;
  });
