'use strict';

import '../styles/main.scss'
import '../views/main.html'

import './midjaApp'
import './controllers/about'
import './controllers/main'
import './directives/downloadlink'
import './directives/googlechart'
import './directives/regionmap'
import './filters/propsfilter'
import './services/dataservice'
import './services/expressionservice'
import './services/formattingservice'
import './services/statsservice'

/**
 * @ngdoc overview
 * @name midjaApp
 * @description
 * # midjaApp
 *
 * Main module of the application.
 */
export default angular
  .module('midjaApp')
  .config(function($routeProvider, uiSelectConfig,
    $httpProvider, $locationProvider) {
    uiSelectConfig.resetSearchInput = true;
    $routeProvider
      .otherwise({
        template: require('../views/main.html'),
        controller: 'MainCtrl',
        controllerAs: 'vm'
      });
  })
  .run(function($rootScope, $location) {
    $rootScope.$on('$locationChangeStart', function() {
      $location.path('/');
    });
  });
