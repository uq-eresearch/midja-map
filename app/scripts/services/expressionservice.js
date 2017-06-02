'use strict';

import * as _ from 'lodash-es'
import { parse as mathjsParse } from 'mathjs'

/**
 * @ngdoc service
 * @name midjaApp.expressionService
 * @description
 */
angular.module('midjaApp')
  .factory('expressionService', function($injector) {
    var service = {};

    service.parse = function expressionService$parse(expr) {
      var obj = {};
      var fNode = mathjsParse(expr);
      var code = fNode.compile();
      var isSymbolNode = _.flow(
        _.property('type'),
        _.partial(_.isEqual, 'SymbolNode'));
      obj.variables =
        _.uniq(_.map(fNode.filter(isSymbolNode), _.property('name'))).sort();
      obj.evaluate = function(scope) {
        return code.eval(scope);
      };
      return obj;
    };

    return service;
  });
