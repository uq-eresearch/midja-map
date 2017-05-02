'use strict';

/**
 * @ngdoc overview
 * @name midjaApp
 * @description
 * # midjaApp
 *
 * Main module of the application.
 */
angular
  .module('midjaApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ui.bootstrap',
    'ui.select',
    'angular-loading-bar',
    'nvd3'
  ])
  .constant('L', L)
  .config(function($routeProvider, uiSelectConfig,
    $httpProvider, $locationProvider) {
    uiSelectConfig.resetSearchInput = true;
    $routeProvider
      .otherwise({
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'vm'
      });
  })
  .run(function($rootScope, $location) {
    $rootScope.$on('$locationChangeStart', function() {
      $location.path('/');
    });
  });
