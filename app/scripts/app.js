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
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'vm',
        requiresLogin: false
      })
      .when('/login', {
        controller: 'LoginCtrl',
        templateUrl: 'views/login.html',
        pageTitle: 'Login'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl',
        controllerAs: 'about'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(function($rootScope, $location) {
    $rootScope.$on('$locationChangeStart', function() {
      $location.path('/');
    });
  });
