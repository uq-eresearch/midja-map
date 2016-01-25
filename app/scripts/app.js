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
    .constant('cartoDbApiKey', 'da4921d7f2b99244897b313a75f0bd977c775a5e')
    .constant('cartodb', cartodb)
    .constant('L', L)
    .config(function ($routeProvider, uiSelectConfig) {
        uiSelectConfig.resetSearchInput = true;
        $routeProvider
            .when('/', {
                templateUrl: 'views/main.html',
                controller: 'MainCtrl',
                controllerAs: 'vm'
            })
            .when('/about', {
                templateUrl: 'views/about.html',
                controller: 'AboutCtrl'
            })
            .otherwise({
                redirectTo: '/'
            });
    });
