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
		'auth0',
		'angular-storage',
		'angular-jwt',
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
    .config(function ($routeProvider, uiSelectConfig, authProvider,
		$httpProvider, $locationProvider, jwtInterceptorProvider) {
        uiSelectConfig.resetSearchInput = true;
        $routeProvider
            .when('/', {
                templateUrl: 'views/main.html',
                controller: 'MainCtrl',
                controllerAs: 'vm',
				requiresLogin: true
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
            .otherwise({
                redirectTo: '/'
            });
			
		authProvider.init({
			domain: 'midja.au.auth0.com',
			clientID: 'G1uK0s3MIrQEqeNkfKkGs4IxWpnWxjef',
			loginUrl: '/login'
		});
		
		//Called when login is successful
		authProvider.on('loginSuccess', function($location, profilePromise, idToken, store) {
		  console.log("Login Success");
		  profilePromise.then(function(profile) {
			store.set('profile', profile);
			store.set('token', idToken);
		  });
		  $location.path('/');
		});

		//Called when login fails
		authProvider.on('loginFailure', function() {
		  console.log("Error");
		  $location.path('/login');
		});		
		
		//Angular HTTP Interceptor function
		jwtInterceptorProvider.tokenGetter = function(store) {
			return store.get('token');
		}
		//Push interceptor function to $httpProvider's interceptors
		//$httpProvider.interceptors.push('jwtInterceptor');		
		
    })
	.run(function($rootScope, auth, store, jwtHelper, $location) {
	  $rootScope.$on('$locationChangeStart', function() {

		var token = store.get('token');
		if (token) {
		  if (!jwtHelper.isTokenExpired(token)) {
			if (!auth.isAuthenticated) {
			  //Re-authenticate user if token is valid
			  auth.authenticate(store.get('profile'), token);
			}
		  } else {
			// Either show the login page or use the refresh token to get a new idToken
			$location.path('/');
		  }
		}
	  });
	});	
